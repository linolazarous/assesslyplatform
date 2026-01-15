import os
import logging
from typing import Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from models import (
    User, UserCreate, UserLogin, Token,
    ContactForm, ContactFormCreate,
    DemoRequest, DemoRequestCreate,
    Subscription, SubscriptionCreate,
    Organization
)
from auth_utils import (
    verify_password,
    get_password_hash,
    create_access_token,
    verify_token
)
from email_service import (
    send_contact_notification,
    send_demo_request_notification,
    send_welcome_email
)
from stripe_service import (
    create_stripe_customer,
    create_subscription as create_stripe_subscription,
    cancel_subscription,
    create_payment_intent
)

# ------------------------------
# Environment Variables & Validation
# ------------------------------

REQUIRED_ENV_VARS = ["MONGO_URL", "JWT_SECRET_KEY", "STRIPE_SECRET_KEY"]
missing_vars = [v for v in REQUIRED_ENV_VARS if not os.getenv(v)]
if missing_vars:
    raise RuntimeError(f"Missing environment variables: {', '.join(missing_vars)}")

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "assessly_platform")  # no spaces allowed

# ------------------------------
# Logging
# ------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger("assessly-api")

# ------------------------------
# Database
# ------------------------------

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ------------------------------
# FastAPI App & Router
# ------------------------------

app = FastAPI(
    title="Assessly Platform API",
    version="1.0.0"
)

api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ------------------------------
# Auth Dependency
# ------------------------------

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    payload = verify_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_data = await db.users.find_one({"id": payload["sub"]})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    return User(**user_data)

# ------------------------------
# Health Check
# ------------------------------

@api_router.get("/")
async def health():
    return {"service": "Assessly Platform API", "status": "ok", "version": "1.0.0"}

# ------------------------------
# Authentication Routes
# ------------------------------

@api_router.post("/auth/register", response_model=Token)
async def register(user_create: UserCreate):
    if await db.users.find_one({"email": user_create.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    data = user_create.dict()
    password = data.pop("password")

    user = User(**data)
    user_data = user.dict()
    user_data["hashed_password"] = get_password_hash(password)

    await db.users.insert_one(user_data)

    org = Organization(name=user.organization, owner_id=user.id)
    await db.organizations.insert_one(org.dict())

    stripe_customer_id = await create_stripe_customer(user.email, user.name, user.organization)
    if stripe_customer_id:
        await db.users.update_one(
            {"id": user.id}, {"$set": {"stripe_customer_id": stripe_customer_id}}
        )

    await send_welcome_email(user.name, user.email, user.organization)

    token = create_access_token({"sub": user.id})
    logger.info(f"User registered: {user.email}")

    return Token(access_token=token, token_type="bearer", user=user)


@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user_data = await db.users.find_one({"email": credentials.email})
    if not user_data or not verify_password(credentials.password, user_data.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = User(**user_data)
    token = create_access_token({"sub": user.id})
    logger.info(f"User logged in: {user.email}")

    return Token(access_token=token, token_type="bearer", user=user)


@api_router.get("/auth/me", response_model=User)
async def me(current_user: User = Depends(get_current_user)):
    return current_user

# ------------------------------
# Contact & Demo Routes
# ------------------------------

@api_router.post("/contact", response_model=ContactForm)
async def submit_contact(contact: ContactFormCreate):
    record = ContactForm(**contact.dict())
    await db.contact_forms.insert_one(record.dict())
    await send_contact_notification(contact.name, contact.email, contact.company, contact.message)
    return record

@api_router.post("/demo", response_model=DemoRequest)
async def submit_demo(demo: DemoRequestCreate):
    record = DemoRequest(**demo.dict())
    await db.demo_requests.insert_one(record.dict())
    await send_demo_request_notification(demo.name, demo.email, demo.company, demo.size, demo.notes)
    return record

# ------------------------------
# Subscription Routes
# ------------------------------

@api_router.post("/subscriptions", response_model=Subscription)
async def create_subscription(payload: SubscriptionCreate, current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user.id})
    customer_id = user.get("stripe_customer_id")

    if not customer_id:
        customer_id = await create_stripe_customer(current_user.email, current_user.name, current_user.organization)
        await db.users.update_one({"id": current_user.id}, {"$set": {"stripe_customer_id": customer_id}})

    stripe_sub = await create_stripe_subscription(customer_id, payload.plan_id, payload.payment_method_id)
    if not stripe_sub:
        raise HTTPException(status_code=400, detail="Subscription failed")

    subscription = Subscription(
        user_id=current_user.id,
        plan_id=payload.plan_id,
        stripe_subscription_id=stripe_sub["subscription_id"],
        stripe_customer_id=customer_id,
        status=stripe_sub["status"]
    )
    await db.subscriptions.insert_one(subscription.dict())
    await db.users.update_one({"id": current_user.id}, {"$set": {"plan": payload.plan_id}})
    return subscription

# ------------------------------
# Middleware & Router
# ------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(api_router)

# ------------------------------
# Shutdown
# ------------------------------

@app.on_event("shutdown")
async def shutdown():
    client.close()

# ------------------------------
# Entry Point
# ------------------------------

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))  # Render sets PORT automatically
    uvicorn.run("server:app", host="0.0.0.0", port=port)
