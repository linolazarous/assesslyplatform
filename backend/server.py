import os
import sys
import logging
from typing import Optional, Dict, Any
from datetime import datetime

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

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
    verify_token,
    create_refresh_token,
    verify_refresh_token
)
from email_service import (
    send_contact_notification,
    send_demo_request_notification,
    send_welcome_email,
    send_email_verification
)
from stripe_service import (
    create_stripe_customer,
    get_or_create_stripe_customer,
    create_checkout_session,
    cancel_subscription,
    get_subscription,
    update_subscription,
    create_payment_intent,
    handle_webhook_event,
    validate_stripe_config
)

# ------------------------------
# Environment Variables & Validation
# ------------------------------

class Config:
    """Application configuration with validation."""
    
    REQUIRED_ENV_VARS = {
        "MONGO_URL": "MongoDB connection string",
        "JWT_SECRET_KEY": "JWT secret key for token generation",
        "JWT_REFRESH_SECRET_KEY": "JWT refresh token secret key",
        "STRIPE_SECRET_KEY": "Stripe API secret key",
        "FRONTEND_URL": "Frontend application URL"
    }
    
    OPTIONAL_ENV_VARS = {
        "DB_NAME": ("assessly_platform", "Database name"),
        "ENVIRONMENT": ("development", "Application environment"),
        "EMAIL_HOST": (None, "SMTP host for emails"),
        "EMAIL_PORT": (587, "SMTP port"),
        "EMAIL_USER": (None, "SMTP username"),
        "EMAIL_PASSWORD": (None, "SMTP password"),
        "CORS_ORIGINS": ("*", "CORS allowed origins"),
        "LOG_LEVEL": ("INFO", "Logging level")
    }
    
    def __init__(self):
        self.validate_environment()
        self.load_config()
    
    def validate_environment(self):
        """Validate required environment variables."""
        missing = []
        for var, description in self.REQUIRED_ENV_VARS.items():
            if not os.getenv(var):
                missing.append(f"{var} ({description})")
        
        if missing:
            raise RuntimeError(f"Missing required environment variables:\n" + "\n".join(missing))
    
    def load_config(self):
        """Load configuration from environment variables."""
        # Required variables
        self.MONGO_URL = os.getenv("MONGO_URL")
        self.JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
        self.JWT_REFRESH_SECRET_KEY = os.getenv("JWT_REFRESH_SECRET_KEY")
        self.STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
        self.FRONTEND_URL = os.getenv("FRONTEND_URL")
        
        # Optional variables with defaults
        self.DB_NAME = os.getenv("DB_NAME", "assessly_platform")
        self.ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
        self.EMAIL_HOST = os.getenv("EMAIL_HOST")
        self.EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
        self.EMAIL_USER = os.getenv("EMAIL_USER")
        self.EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
        self.CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
        
        # Validate database name (no spaces allowed)
        if " " in self.DB_NAME:
            raise ValueError("Database name cannot contain spaces")
        
        # Set production flags
        self.is_production = self.ENVIRONMENT == "production"
        self.is_development = self.ENVIRONMENT == "development"

config = Config()

# ------------------------------
# Logging Configuration
# ------------------------------

logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format="%(asctime)s | %(levelname)s | %(name)s | %(module)s:%(lineno)d | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("app.log") if config.is_production else None
    ]
)
logger = logging.getLogger("assessly-api")

# ------------------------------
# Logging Configuration (PRODUCTION SAFE)
# ------------------------------

log_level = getattr(logging, config.LOG_LEVEL.upper(), logging.INFO)

root_logger = logging.getLogger()

# Remove any pre-configured or broken handlers (uvicorn, libs, etc.)
if root_logger.handlers:
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

handlers = [logging.StreamHandler(sys.stdout)]

if config.is_production:
    handlers.append(logging.FileHandler("app.log", encoding="utf-8"))

logging.basicConfig(
    level=log_level,
    format="%(asctime)s | %(levelname)s | %(name)s | %(module)s:%(lineno)d | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=handlers,
)

logger = logging.getLogger("assessly-api")

# ------------------------------
# FastAPI App Configuration
# ------------------------------

app = FastAPI(
    title="Assessly Platform API",
    version="1.0.0",
    description="Enterprise-grade assessment platform API",
    docs_url="/api/docs" if config.is_development else None,
    redoc_url="/api/redoc" if config.is_development else None,
    openapi_url="/api/openapi.json" if config.is_development else None
)

# ------------------------------
# Middleware
# ------------------------------

# Security middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"] if config.is_development else ["assesslyplatform.com", "api.assesslyplatform.com"]
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Error-Code"],
    max_age=3600
)

# Compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ------------------------------
# Authentication
# ------------------------------

security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> User:
    """Get current authenticated user."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = verify_token(credentials.credentials)
        if not payload or "sub" not in payload:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        user_data = await db_manager.db.users.find_one({"id": payload["sub"]})
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        return User(**user_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

# ------------------------------
# Custom Exception Handlers
# ------------------------------

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    logger.warning(f"HTTP {exc.status_code}: {exc.detail} - {request.url}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code,
            "path": request.url.path
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors."""
    logger.warning(f"Validation error: {exc.errors()} - {request.url}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
            "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR
        }
    )

# ------------------------------
# Health Check Endpoint
# ------------------------------

@app.get("/health")
async def health_check():
    """Health check endpoint with system status."""
    try:
        # Check database connection
        await db_manager.client.admin.command('ping')
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    return {
        "service": "Assessly Platform API",
        "status": "operational",
        "version": "1.0.0",
        "environment": config.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
        "database": db_status,
        "uptime": "N/A"  # Add uptime tracking in production
    }

# ------------------------------
# API Router
# ------------------------------

api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def api_root():
    """API root endpoint."""
    return {
        "message": "Assessly Platform API",
        "version": "1.0.0",
        "docs": "/api/docs" if config.is_development else None
    }

# ------------------------------
# Authentication Routes
# ------------------------------

@api_router.post("/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_create: UserCreate):
    """Register a new user."""
    try:
        # Check if user already exists
        existing_user = await db_manager.db.users.find_one({"email": user_create.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create user
        user_data = user_create.dict(exclude={"password"})
        user_data["hashed_password"] = get_password_hash(user_create.password)
        user_data["is_verified"] = False
        user_data["created_at"] = datetime.utcnow()
        user_data["updated_at"] = datetime.utcnow()
        
        user = User(**user_data)
        await db_manager.db.users.insert_one(user.dict())
        
        # Create organization
        org = Organization(
            name=user.organization,
            owner_id=user.id,
            slug=user.organization.lower().replace(" ", "-"),
            created_at=datetime.utcnow()
        )
        await db_manager.db.organizations.insert_one(org.dict())
        
        # Create Stripe customer
        try:
            stripe_customer_id = await create_stripe_customer(
                user.email, 
                user.name, 
                user.organization
            )
            if stripe_customer_id:
                await db_manager.db.users.update_one(
                    {"id": user.id},
                    {"$set": {"stripe_customer_id": stripe_customer_id}}
                )
        except Exception as e:
            logger.error(f"Failed to create Stripe customer: {e}")
            # Don't fail registration if Stripe fails
        
        # Set default free plan
        await db_manager.db.users.update_one(
            {"id": user.id},
            {"$set": {"plan": "free"}}
        )
        
        # Create a free subscription record
        free_subscription = {
            "user_id": user.id,
            "plan_id": "free",
            "stripe_subscription_id": "free_plan",
            "status": "active",
            "amount": 0,
            "currency": "usd",
            "created_at": datetime.utcnow()
        }
        
        await db_manager.db.subscriptions.insert_one(free_subscription)
        
        # Send welcome email
        try:
            await send_welcome_email(user.name, user.email, user.organization)
            await send_email_verification(user.name, user.email, user.id)
        except Exception as e:
            logger.error(f"Failed to send welcome email: {e}")
        
        # Generate tokens
        access_token = create_access_token({"sub": user.id, "email": user.email})
        refresh_token = create_refresh_token({"sub": user.id})
        
        logger.info(f"User registered: {user.email}")
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=user
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    """Authenticate user and return tokens."""
    try:
        user_data = await db_manager.db.users.find_one({"email": credentials.email})
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        if not verify_password(credentials.password, user_data.get("hashed_password", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        user = User(**user_data)
        
        # Generate tokens
        access_token = create_access_token({"sub": user.id, "email": user.email})
        refresh_token = create_refresh_token({"sub": user.id})
        
        # Update last login
        await db_manager.db.users.update_one(
            {"id": user.id},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
        logger.info(f"User logged in: {user.email}")
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=user
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )


@api_router.post("/auth/refresh", response_model=Token)
async def refresh_token_endpoint(refresh_token: str):
    """Refresh access token using refresh token."""
    try:
        payload = verify_refresh_token(refresh_token)
        if not payload or "sub" not in payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        user_data = await db_manager.db.users.find_one({"id": payload["sub"]})
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user = User(**user_data)
        new_access_token = create_access_token({"sub": user.id, "email": user.email})
        new_refresh_token = create_refresh_token({"sub": user.id})
        
        return Token(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            user=user
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return current_user


@api_router.post("/auth/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user (client-side token invalidation)."""
    # In production, you might want to implement a token blacklist
    return {"message": "Successfully logged out"}

# ------------------------------
# Contact & Demo Routes
# ------------------------------

@api_router.post("/contact", response_model=ContactForm, status_code=status.HTTP_201_CREATED)
async def submit_contact(contact: ContactFormCreate):
    """Submit contact form."""
    try:
        record = ContactForm(
            **contact.dict(),
            created_at=datetime.utcnow()
        )
        
        await db_manager.db.contact_forms.insert_one(record.dict())
        
        # Send notification email
        await send_contact_notification(
            contact.name,
            contact.email,
            contact.company,
            contact.message
        )
        
        logger.info(f"Contact form submitted: {contact.email}")
        
        return record
        
    except Exception as e:
        logger.error(f"Contact form error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit contact form"
        )


@api_router.post("/demo", response_model=DemoRequest, status_code=status.HTTP_201_CREATED)
async def submit_demo(demo: DemoRequestCreate):
    """Submit demo request."""
    try:
        record = DemoRequest(
            **demo.dict(),
            created_at=datetime.utcnow()
        )
        
        await db_manager.db.demo_requests.insert_one(record.dict())
        
        # Send notification email
        await send_demo_request_notification(
            demo.name,
            demo.email,
            demo.company,
            demo.size,
            demo.notes
        )
        
        logger.info(f"Demo request submitted: {demo.email}")
        
        return record
        
    except Exception as e:
        logger.error(f"Demo request error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit demo request"
        )

# ------------------------------
# Subscription & Payment Routes
# ------------------------------

@api_router.post("/subscriptions/checkout", status_code=status.HTTP_200_OK)
async def create_checkout_session_endpoint(
    payload: dict,
    current_user: User = Depends(get_current_user)
):
    """Create a Stripe Checkout Session."""
    try:
        plan_id = payload.get("plan_id")
        if not plan_id:
            raise HTTPException(status_code=400, detail="Plan ID is required")
        
        # Validate plan
        valid_plans = ["free", "basic", "professional", "enterprise"]
        if plan_id not in valid_plans:
            raise HTTPException(status_code=400, detail="Invalid plan")
        
        # For free plan, just update user and return
        if plan_id == "free":
            await db_manager.db.users.update_one(
                {"id": current_user.id},
                {"$set": {"plan": "free", "updated_at": datetime.utcnow()}}
            )
            
            # Update or create free subscription record
            await db_manager.db.subscriptions.update_one(
                {"user_id": current_user.id, "plan_id": "free"},
                {"$set": {
                    "status": "active",
                    "updated_at": datetime.utcnow()
                }},
                upsert=True
            )
            
            return {
                "type": "free",
                "redirect_url": f"{config.FRONTEND_URL}/dashboard?plan=free"
            }
        
        # Get or create Stripe customer
        customer_id = await get_or_create_stripe_customer(
            user_id=current_user.id,
            email=current_user.email,
            name=current_user.name,
            organization=current_user.organization
        )
        
        if not customer_id:
            raise HTTPException(status_code=500, detail="Failed to create customer")
        
        # Create checkout session
        success_url = f"{config.FRONTEND_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{config.FRONTEND_URL}/pricing"
        
        session = await create_checkout_session(
            customer_id=customer_id,
            plan_id=plan_id,
            success_url=success_url,
            cancel_url=cancel_url,
            user_email=current_user.email,
            user_id=current_user.id,
            trial_days=14 if plan_id != "enterprise" else 0
        )
        
        if not session:
            raise HTTPException(status_code=500, detail="Failed to create checkout session")
        
        # Handle enterprise plan
        if session.get("type") == "enterprise":
            return {
                "type": "enterprise",
                "redirect_url": session["url"],
                "message": "Please contact our sales team for enterprise pricing"
            }
        
        return {
            "type": "checkout",
            "session_id": session["session_id"],
            "url": session["url"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Checkout error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Checkout failed: {str(e)}"
        )


@api_router.get("/subscriptions/me")
async def get_my_subscription(
    current_user: User = Depends(get_current_user)
):
    """Get current user's subscription."""
    try:
        # Get user with subscription info
        user_data = await db_manager.db.users.find_one({"id": current_user.id})
        
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        subscription_data = await db_manager.db.subscriptions.find_one(
            {"user_id": current_user.id},
            sort=[("created_at", -1)]
        )
        
        # If no subscription found, check for free plan
        if not subscription_data:
            plan = user_data.get("plan", "free")
            
            if plan == "free":
                return {
                    "has_subscription": True,
                    "plan": "free",
                    "status": "active",
                    "is_free": True,
                    "amount": 0,
                    "currency": "usd",
                    "current_period_end": None,
                    "cancel_at_period_end": False
                }
            
            return {"has_subscription": False}
        
        # Get latest subscription details from Stripe
        stripe_subscription = await get_subscription(subscription_data["stripe_subscription_id"])
        
        if stripe_subscription:
            # Update subscription status in database
            await db_manager.db.subscriptions.update_one(
                {"_id": subscription_data["_id"]},
                {"$set": {"status": stripe_subscription.get("status", subscription_data["status"])}}
            )
            subscription_data["status"] = stripe_subscription.get("status", subscription_data["status"])
        
        return {
            "has_subscription": True,
            "plan": subscription_data.get("plan_id", "unknown"),
            "status": subscription_data.get("status", "active"),
            "subscription_id": subscription_data.get("stripe_subscription_id"),
            "amount": subscription_data.get("amount"),
            "currency": subscription_data.get("currency", "usd"),
            "current_period_start": subscription_data.get("current_period_start"),
            "current_period_end": subscription_data.get("current_period_end"),
            "cancel_at_period_end": subscription_data.get("cancel_at_period_end", False),
            "created_at": subscription_data.get("created_at")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Subscription retrieval error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve subscription"
        )


@api_router.post("/subscriptions/cancel")
async def cancel_my_subscription(
    payload: dict = None,
    current_user: User = Depends(get_current_user)
):
    """Cancel current user's subscription."""
    try:
        at_period_end = True
        if payload and "immediate" in payload:
            at_period_end = not payload["immediate"]
        
        # Get user's subscription
        subscription_data = await db_manager.db.subscriptions.find_one(
            {"user_id": current_user.id, "status": {"$nin": ["canceled", "incomplete_expired"]}},
            sort=[("created_at", -1)]
        )
        
        if not subscription_data:
            # If no paid subscription, check if user is on free plan
            user_data = await db_manager.db.users.find_one({"id": current_user.id})
            if user_data.get("plan") == "free":
                return {"success": True, "message": "Already on free plan"}
            
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        subscription_id = subscription_data["stripe_subscription_id"]
        
        # Handle free plan subscription ID
        if subscription_id == "free_plan":
            await db_manager.db.users.update_one(
                {"id": current_user.id},
                {"$set": {"plan": "free", "updated_at": datetime.utcnow()}}
            )
            return {"success": True, "message": "Downgraded to free plan"}
        
        # Cancel Stripe subscription
        success = await cancel_subscription(
            subscription_id,
            at_period_end=at_period_end
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to cancel subscription")
        
        # Update subscription status in database
        await db_manager.db.subscriptions.update_one(
            {"_id": subscription_data["_id"]},
            {"$set": {
                "status": "canceled" if not at_period_end else "active",
                "cancel_at_period_end": at_period_end,
                "canceled_at": datetime.utcnow() if not at_period_end else None,
                "updated_at": datetime.utcnow()
            }}
        )
        
        # If canceling immediately, downgrade to free
        if not at_period_end:
            await db_manager.db.users.update_one(
                {"id": current_user.id},
                {"$set": {"plan": "free", "updated_at": datetime.utcnow()}}
            )
        
        return {
            "success": True, 
            "cancelled_at_period_end": at_period_end,
            "message": "Subscription cancelled successfully" if not at_period_end 
                      else "Subscription will cancel at period end"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cancellation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription"
        )


@api_router.post("/subscriptions/upgrade")
async def upgrade_subscription(
    payload: dict,
    current_user: User = Depends(get_current_user)
):
    """Upgrade or change subscription plan."""
    try:
        new_plan_id = payload.get("new_plan_id")
        if not new_plan_id:
            raise HTTPException(status_code=400, detail="New plan ID is required")
        
        valid_plans = ["free", "basic", "professional", "enterprise"]
        if new_plan_id not in valid_plans:
            raise HTTPException(status_code=400, detail="Invalid plan")
        
        # Get current subscription
        subscription_data = await db_manager.db.subscriptions.find_one(
            {"user_id": current_user.id, "status": {"$nin": ["canceled", "incomplete_expired"]}},
            sort=[("created_at", -1)]
        )
        
        current_plan = "free"
        subscription_id = None
        
        if subscription_data:
            subscription_id = subscription_data["stripe_subscription_id"]
            current_plan = subscription_data.get("plan_id", "free")
        
        # Check if it's actually a change
        if current_plan == new_plan_id:
            return {"success": True, "message": "Already on this plan"}
        
        # Handle downgrade to free
        if new_plan_id == "free":
            if subscription_id and subscription_id != "free_plan":
                await cancel_subscription(subscription_id, at_period_end=False)
            
            await db_manager.db.users.update_one(
                {"id": current_user.id},
                {"$set": {"plan": "free", "updated_at": datetime.utcnow()}}
            )
            
            if subscription_data:
                await db_manager.db.subscriptions.update_one(
                    {"_id": subscription_data["_id"]},
                    {"$set": {"status": "canceled", "updated_at": datetime.utcnow()}}
                )
            
            return {"success": True, "message": "Downgraded to free plan"}
        
        # Handle upgrade from free
        if current_plan == "free":
            # This will create a new subscription via checkout
            # Return checkout session info
            customer_id = await get_or_create_stripe_customer(
                user_id=current_user.id,
                email=current_user.email,
                name=current_user.name,
                organization=current_user.organization
            )
            
            success_url = f"{config.FRONTEND_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
            cancel_url = f"{config.FRONTEND_URL}/pricing"
            
            session = await create_checkout_session(
                customer_id=customer_id,
                plan_id=new_plan_id,
                success_url=success_url,
                cancel_url=cancel_url,
                user_email=current_user.email,
                user_id=current_user.id,
                trial_days=14
            )
            
            if not session:
                raise HTTPException(status_code=500, detail="Failed to create checkout session")
            
            return {
                "action": "checkout_required",
                "session_id": session["session_id"],
                "url": session["url"]
            }
        
        # Handle plan change between paid plans
        if subscription_id and subscription_id not in ["free_plan", "enterprise_custom"]:
            updated_subscription = await update_subscription(
                subscription_id=subscription_id,
                new_plan_id=new_plan_id,
                prorate=True
            )
            
            if not updated_subscription:
                raise HTTPException(status_code=500, detail="Failed to update subscription")
            
            # Update database
            await db_manager.db.subscriptions.update_one(
                {"_id": subscription_data["_id"]},
                {"$set": {
                    "plan_id": new_plan_id,
                    "updated_at": datetime.utcnow(),
                    "status": updated_subscription.get("status", "active")
                }}
            )
            
            await db_manager.db.users.update_one(
                {"id": current_user.id},
                {"$set": {"plan": new_plan_id, "updated_at": datetime.utcnow()}}
            )
            
            return {
                "success": True,
                "message": f"Subscription updated to {new_plan_id}",
                "prorated": True
            }
        
        # Handle enterprise plan changes
        if new_plan_id == "enterprise":
            return {
                "action": "contact_sales",
                "message": "Please contact our sales team for enterprise plan changes"
            }
        
        raise HTTPException(status_code=400, detail="Unable to process plan change")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upgrade error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upgrade subscription"
        )


@api_router.post("/payments/create-intent")
async def create_payment_intent_endpoint(
    payload: dict,
    current_user: User = Depends(get_current_user)
):
    """Create a payment intent for one-time payments."""
    try:
        amount = payload.get("amount")
        currency = payload.get("currency", "usd")
        metadata = payload.get("metadata", {})
        
        if not amount or amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid amount")
        
        # Create Stripe customer if needed
        customer_id = await get_or_create_stripe_customer(
            user_id=current_user.id,
            email=current_user.email,
            name=current_user.name,
            organization=current_user.organization
        )
        
        # Add user info to metadata
        metadata.update({
            "user_id": current_user.id,
            "user_email": current_user.email
        })
        
        payment_intent = await create_payment_intent(
            amount=amount,
            currency=currency,
            customer_id=customer_id,
            metadata=metadata
        )
        
        if not payment_intent:
            raise HTTPException(status_code=500, detail="Failed to create payment intent")
        
        return {
            "client_secret": payment_intent["client_secret"],
            "id": payment_intent["id"],
            "amount": payment_intent["amount"],
            "currency": payment_intent["currency"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Payment intent error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payment intent"
        )


@api_router.get("/subscriptions/validate")
async def validate_subscription_access(
    feature: str,
    current_user: User = Depends(get_current_user)
):
    """Validate if user's subscription allows access to a feature."""
    try:
        user_data = await db_manager.db.users.find_one({"id": current_user.id})
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        plan = user_data.get("plan", "free")
        
        # Define feature access by plan
        feature_access = {
            "free": ["basic_assessments", "up_to_50_candidates", "email_support"],
            "basic": ["advanced_assessments", "up_to_500_candidates", "priority_support", "basic_analytics"],
            "professional": ["all_assessments", "unlimited_candidates", "dedicated_support", "advanced_analytics", "ai_insights"],
            "enterprise": ["all_features", "custom_solutions", "sla", "dedicated_account"]
        }
        
        allowed_features = feature_access.get(plan, [])
        
        return {
            "has_access": feature in allowed_features,
            "plan": plan,
            "feature": feature,
            "allowed_features": allowed_features
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate subscription"
        )


@api_router.get("/plans")
async def get_available_plans():
    """Get available subscription plans with features."""
    return {
        "plans": [
            {
                "id": "free",
                "name": "Free Plan",
                "price": 0,
                "currency": "usd",
                "interval": "month",
                "features": [
                    "Up to 50 candidates",
                    "Basic assessment types",
                    "Email support",
                    "Community forum access"
                ],
                "limits": {
                    "candidates": 50,
                    "assessments": 5,
                    "questions": 100
                }
            },
            {
                "id": "basic",
                "name": "Basic Plan",
                "price": 2900,  # $29.00 in cents
                "currency": "usd",
                "interval": "month",
                "features": [
                    "Up to 500 candidates",
                    "Advanced assessment types",
                    "Priority support",
                    "Basic analytics",
                    "API access"
                ],
                "limits": {
                    "candidates": 500,
                    "assessments": 50,
                    "questions": 5000
                }
            },
            {
                "id": "professional",
                "name": "Professional Plan",
                "price": 7900,  # $79.00 in cents
                "currency": "usd",
                "interval": "month",
                "features": [
                    "Unlimited candidates",
                    "All assessment types",
                    "Dedicated support",
                    "Advanced analytics",
                    "AI-powered insights",
                    "Custom branding"
                ],
                "limits": {
                    "candidates": "unlimited",
                    "assessments": "unlimited",
                    "questions": "unlimited"
                }
            },
            {
                "id": "enterprise",
                "name": "Enterprise Plan",
                "price": None,  # Custom pricing
                "currency": "usd",
                "interval": "month",
                "features": [
                    "Everything in Professional",
                    "Custom solutions",
                    "SLA guarantee",
                    "Dedicated account manager",
                    "On-premise deployment",
                    "White-label option"
                ],
                "limits": {
                    "custom": "Tailored to your needs"
                }
            }
        ]
    }


@api_router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks."""
    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")
        webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        
        if not webhook_secret:
            logger.error("Stripe webhook secret not configured")
            raise HTTPException(status_code=500, detail="Webhook not configured")
        
        event = await handle_webhook_event(
            payload, sig_header, webhook_secret
        )
        
        if not event:
            raise HTTPException(status_code=400, detail="Invalid webhook event")
        
        event_type = event.get("event")
        
        # Process webhook events
        if event_type == "checkout.session.completed":
            await handle_checkout_completed(event)
        elif event_type == "customer.subscription.created":
            await handle_subscription_created(event)
        elif event_type == "customer.subscription.updated":
            await handle_subscription_updated(event)
        elif event_type == "customer.subscription.deleted":
            await handle_subscription_deleted(event)
        elif event_type == "invoice.payment_succeeded":
            await handle_invoice_payment_succeeded(event)
        elif event_type == "invoice.payment_failed":
            await handle_invoice_payment_failed(event)
        
        logger.info(f"Processed Stripe webhook: {event_type}")
        
        return {"status": "success", "event": event_type}
        
    except ValueError as e:
        logger.error(f"Invalid webhook payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except Exception as e:
        logger.error(f"Webhook error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed"
        )


async def handle_checkout_completed(event: Dict):
    """Handle checkout.session.completed event."""
    session_id = event.get("session_id")
    subscription_id = event.get("subscription_id")
    customer_id = event.get("customer_id")
    
    logger.info(f"Checkout completed: {session_id}")
    
    # Get session details from Stripe
    import stripe
    try:
        session = stripe.checkout.Session.retrieve(
            session_id,
            expand=['subscription', 'customer']
        )
        
        user_id = session.metadata.get("user_id")
        plan_id = session.metadata.get("plan")
        
        if not user_id or not plan_id:
            logger.warning(f"Missing metadata in session {session_id}")
            return
        
        # Create subscription record
        subscription_data = {
            "user_id": user_id,
            "plan_id": plan_id,
            "stripe_subscription_id": subscription_id,
            "stripe_customer_id": customer_id,
            "status": "active",
            "amount": session.amount_total,  # In cents
            "currency": session.currency,
            "created_at": datetime.utcnow()
        }
        
        await db_manager.db.subscriptions.insert_one(subscription_data)
        
        # Update user plan
        await db_manager.db.users.update_one(
            {"id": user_id},
            {"$set": {
                "plan": plan_id,
                "stripe_customer_id": customer_id,
                "updated_at": datetime.utcnow()
            }}
        )
        
        logger.info(f"Subscription created for user {user_id}: {subscription_id}")
    except Exception as e:
        logger.error(f"Error processing checkout completed: {e}")


async def handle_subscription_created(event: Dict):
    """Handle customer.subscription.created event."""
    subscription_id = event.get("subscription_id")
    status = event.get("status")
    plan_id = event.get("plan_id")
    
    logger.info(f"Subscription created: {subscription_id} - {status}")
    
    # Update subscription status if exists
    await db_manager.db.subscriptions.update_one(
        {"stripe_subscription_id": subscription_id},
        {"$set": {
            "status": status,
            "plan_id": plan_id,
            "updated_at": datetime.utcnow()
        }}
    )


async def handle_subscription_updated(event: Dict):
    """Handle customer.subscription.updated event."""
    subscription_id = event.get("subscription_id")
    status = event.get("status")
    plan_id = event.get("plan_id")
    
    logger.info(f"Subscription updated: {subscription_id} - {status}")
    
    # Update subscription in database
    await db_manager.db.subscriptions.update_one(
        {"stripe_subscription_id": subscription_id},
        {"$set": {
            "status": status,
            "plan_id": plan_id,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # If canceled, update user to free plan
    if status in ["canceled", "incomplete_expired"]:
        subscription_data = await db_manager.db.subscriptions.find_one(
            {"stripe_subscription_id": subscription_id}
        )
        
        if subscription_data:
            await db_manager.db.users.update_one(
                {"id": subscription_data["user_id"]},
                {"$set": {"plan": "free", "updated_at": datetime.utcnow()}}
            )


async def handle_subscription_deleted(event: Dict):
    """Handle customer.subscription.deleted event."""
    subscription_id = event.get("subscription_id")
    
    logger.info(f"Subscription deleted: {subscription_id}")
    
    # Mark as canceled in database
    await db_manager.db.subscriptions.update_one(
        {"stripe_subscription_id": subscription_id},
        {"$set": {
            "status": "canceled",
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Update user to free plan
    subscription_data = await db_manager.db.subscriptions.find_one(
        {"stripe_subscription_id": subscription_id}
    )
    
    if subscription_data:
        await db_manager.db.users.update_one(
            {"id": subscription_data["user_id"]},
            {"$set": {"plan": "free", "updated_at": datetime.utcnow()}}
        )


async def handle_invoice_payment_succeeded(event: Dict):
    """Handle invoice.payment_succeeded event."""
    invoice_id = event.get("invoice_id")
    subscription_id = event.get("subscription_id")
    amount_paid = event.get("amount_paid")
    
    logger.info(f"Payment succeeded: {invoice_id} for subscription {subscription_id}")
    
    # Update subscription last payment
    await db_manager.db.subscriptions.update_one(
        {"stripe_subscription_id": subscription_id},
        {"$set": {
            "last_payment_at": datetime.utcnow(),
            "last_payment_amount": amount_paid,
            "updated_at": datetime.utcnow()
        }}
    )


async def handle_invoice_payment_failed(event: Dict):
    """Handle invoice.payment_failed event."""
    invoice_id = event.get("invoice_id")
    subscription_id = event.get("subscription_id")
    next_payment_attempt = event.get("next_payment_attempt")
    
    logger.warning(f"Payment failed: {invoice_id} for subscription {subscription_id}")
    
    # Update subscription status
    await db_manager.db.subscriptions.update_one(
        {"stripe_subscription_id": subscription_id},
        {"$set": {
            "status": "past_due",
            "next_payment_attempt": next_payment_attempt,
            "updated_at": datetime.utcnow()
        }}
    )


# Legacy subscription endpoint for backward compatibility
@api_router.post("/subscriptions", response_model=Subscription, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    payload: SubscriptionCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new subscription (legacy endpoint, prefer /subscriptions/checkout)."""
    try:
        # This endpoint is kept for backward compatibility
        # Redirect to checkout endpoint
        checkout_response = await create_checkout_session_endpoint(
            {"plan_id": payload.plan_id},
            current_user
        )
        
        if checkout_response.get("type") == "checkout":
            return {
                "checkout_required": True,
                "session_id": checkout_response["session_id"],
                "url": checkout_response["url"]
            }
        elif checkout_response.get("type") == "free":
            return {
                "plan_id": "free",
                "status": "active",
                "is_free": True
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subscription creation failed"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Subscription creation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Subscription creation failed"
        )

# ------------------------------
# Include Router & Startup/Shutdown
# ------------------------------

app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    """Handle application startup."""
    logger.info("Starting Assessly Platform API...")
    try:
        await db_manager.connect()
        logger.info("Application startup complete")
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Handle application shutdown."""
    logger.info("Shutting down Assessly Platform API...")
    await db_manager.disconnect()
    logger.info("Application shutdown complete")

# ------------------------------
# Entry Point
# ------------------------------

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.environ.get("PORT", 10000))
    
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=config.is_development,
        log_level="info",
        access_log=True,
        timeout_keep_alive=30
            )
