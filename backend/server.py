from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import Optional

from models import (
    User, UserCreate, UserLogin, Token,
    ContactForm, ContactFormCreate,
    DemoRequest, DemoRequestCreate,
    Subscription, SubscriptionCreate,
    Organization
)
from auth_utils import (
    verify_password, get_password_hash,
    create_access_token, verify_token
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'assessly')]

# Create the main app without a prefix
app = FastAPI(title="Assessly Platform API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Dependency to get current user from token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    token = credentials.credentials
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    user_data = await db.users.find_one({"id": user_id})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**user_data)

# Health check
@api_router.get("/")
async def root():
    return {"message": "Assessly Platform API", "status": "running", "version": "1.0.0"}

# Authentication Routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_create: UserCreate):
    """Register a new user"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_create.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = user_create.dict()
    hashed_password = get_password_hash(user_dict.pop("password"))
    
    user = User(**user_dict)
    user_data = user.dict()
    user_data["hashed_password"] = hashed_password
    
    # Insert user into database
    await db.users.insert_one(user_data)
    
    # Create organization for user
    org = Organization(
        name=user.organization,
        owner_id=user.id
    )
    await db.organizations.insert_one(org.dict())
    
    # Create Stripe customer
    stripe_customer_id = await create_stripe_customer(user.email, user.name, user.organization)
    if stripe_customer_id:
        await db.users.update_one(
            {"id": user.id},
            {"$set": {"stripe_customer_id": stripe_customer_id}}
        )
    
    # Send welcome email
    await send_welcome_email(user.name, user.email, user.organization)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    logger.info(f"New user registered: {user.email}")
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user
    )

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login user"""
    user_data = await db.users.find_one({"email": credentials.email})
    
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user_data.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user = User(**user_data)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    logger.info(f"User logged in: {user.email}")
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user
    )

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

# Contact Form Routes
@api_router.post("/contact", response_model=ContactForm)
async def submit_contact_form(contact: ContactFormCreate):
    """Submit contact form"""
    contact_form = ContactForm(**contact.dict())
    
    # Save to database
    await db.contact_forms.insert_one(contact_form.dict())
    
    # Send notification email
    await send_contact_notification(
        contact.name,
        contact.email,
        contact.company,
        contact.message
    )
    
    logger.info(f"Contact form submitted: {contact.email}")
    
    return contact_form

@api_router.get("/contact")
async def get_contact_forms(current_user: User = Depends(get_current_user)):
    """Get all contact forms (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    forms = await db.contact_forms.find().to_list(100)
    return [ContactForm(**form) for form in forms]

# Demo Request Routes
@api_router.post("/demo", response_model=DemoRequest)
async def submit_demo_request(demo: DemoRequestCreate):
    """Submit demo request"""
    demo_request = DemoRequest(**demo.dict())
    
    # Save to database
    await db.demo_requests.insert_one(demo_request.dict())
    
    # Send notification email
    await send_demo_request_notification(
        demo.name,
        demo.email,
        demo.company,
        demo.size,
        demo.notes
    )
    
    logger.info(f"Demo request submitted: {demo.email} from {demo.company}")
    
    return demo_request

@api_router.get("/demo")
async def get_demo_requests(current_user: User = Depends(get_current_user)):
    """Get all demo requests (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    requests = await db.demo_requests.find().to_list(100)
    return [DemoRequest(**req) for req in requests]

# Subscription Routes
@api_router.post("/subscriptions", response_model=Subscription)
async def create_subscription(
    subscription_create: SubscriptionCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new subscription"""
    # Get user's Stripe customer ID
    user_data = await db.users.find_one({"id": current_user.id})
    stripe_customer_id = user_data.get("stripe_customer_id")
    
    if not stripe_customer_id:
        # Create Stripe customer if doesn't exist
        stripe_customer_id = await create_stripe_customer(
            current_user.email,
            current_user.name,
            current_user.organization
        )
        if stripe_customer_id:
            await db.users.update_one(
                {"id": current_user.id},
                {"$set": {"stripe_customer_id": stripe_customer_id}}
            )
    
    # Create Stripe subscription
    stripe_subscription = await create_stripe_subscription(
        stripe_customer_id,
        subscription_create.plan_id,
        subscription_create.payment_method_id
    )
    
    if not stripe_subscription:
        raise HTTPException(status_code=400, detail="Failed to create subscription")
    
    # Create subscription record
    subscription = Subscription(
        user_id=current_user.id,
        plan_id=subscription_create.plan_id,
        stripe_subscription_id=stripe_subscription["subscription_id"],
        stripe_customer_id=stripe_customer_id,
        status=stripe_subscription["status"]
    )
    
    await db.subscriptions.insert_one(subscription.dict())
    
    # Update user's plan
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"plan": subscription_create.plan_id}}
    )
    
    logger.info(f"Subscription created: {current_user.email} - {subscription_create.plan_id}")
    
    return subscription

@api_router.get("/subscriptions/current")
async def get_current_subscription(current_user: User = Depends(get_current_user)):
    """Get current user's subscription"""
    subscription = await db.subscriptions.find_one(
        {"user_id": current_user.id, "status": "active"}
    )
    
    if not subscription:
        return {"plan": current_user.plan, "status": "none"}
    
    return Subscription(**subscription)

@api_router.delete("/subscriptions/{subscription_id}")
async def cancel_user_subscription(
    subscription_id: str,
    current_user: User = Depends(get_current_user)
):
    """Cancel a subscription"""
    subscription = await db.subscriptions.find_one({"id": subscription_id})
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    if subscription["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Cancel in Stripe
    if subscription.get("stripe_subscription_id"):
        success = await cancel_subscription(subscription["stripe_subscription_id"])
        if not success:
            raise HTTPException(status_code=400, detail="Failed to cancel subscription")
    
    # Update subscription status
    await db.subscriptions.update_one(
        {"id": subscription_id},
        {"$set": {"status": "canceled"}}
    )
    
    # Update user's plan to free
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"plan": "free"}}
    )
    
    logger.info(f"Subscription canceled: {current_user.email}")
    
    return {"message": "Subscription canceled successfully"}

# Payment Routes
@api_router.post("/payments/intent")
async def create_payment(
    amount: int,
    current_user: User = Depends(get_current_user)
):
    """Create a payment intent"""
    payment_intent = await create_payment_intent(amount)
    
    if not payment_intent:
        raise HTTPException(status_code=400, detail="Failed to create payment intent")
    
    return payment_intent

# Organization Routes
@api_router.get("/organizations/current")
async def get_current_organization(current_user: User = Depends(get_current_user)):
    """Get current user's organization"""
    org = await db.organizations.find_one({"owner_id": current_user.id})
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return Organization(**org)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=10000)
