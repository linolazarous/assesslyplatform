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
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.asgi import SentryAsgiMiddleware

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
    create_subscription as create_stripe_subscription,
    cancel_subscription,
    create_payment_intent,
    get_subscription_status
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
        "SENTRY_DSN": (None, "Sentry DSN for error tracking"),
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
        self.SENTRY_DSN = os.getenv("SENTRY_DSN")
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
# Sentry Integration
# ------------------------------

if config.SENTRY_DSN and config.is_production:
    sentry_sdk.init(
        dsn=config.SENTRY_DSN,
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.1,
        environment=config.ENVIRONMENT,
        release=os.getenv("RENDER_GIT_COMMIT", "1.0.0")
    )

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
# Database Connection
# ------------------------------

class Database:
    """Database connection manager."""
    
    def __init__(self):
        self.client = None
        self.db = None
    
    async def connect(self):
        """Establish database connection."""
        try:
            self.client = AsyncIOMotorClient(
                config.MONGO_URL,
                maxPoolSize=10,
                minPoolSize=1,
                retryWrites=True,
                w="majority"
            )
            await self.client.admin.command('ping')
            self.db = self.client[config.DB_NAME]
            
            # Create indexes
            await self.create_indexes()
            
            logger.info(f"Connected to MongoDB database: {config.DB_NAME}")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    
    async def create_indexes(self):
        """Create database indexes for performance."""
        indexes = {
            "users": [
                {"key": [("email", 1)], "unique": True},
                {"key": [("id", 1)], "unique": True},
                {"key": [("stripe_customer_id", 1)]}
            ],
            "organizations": [
                {"key": [("owner_id", 1)]},
                {"key": [("slug", 1)], "unique": True}
            ],
            "contact_forms": [
                {"key": [("created_at", -1)]}
            ],
            "demo_requests": [
                {"key": [("created_at", -1)]}
            ],
            "subscriptions": [
                {"key": [("user_id", 1)]},
                {"key": [("stripe_subscription_id", 1)], "unique": True}
            ]
        }
        
        for collection, collection_indexes in indexes.items():
            for index in collection_indexes:
                try:
                    await self.db[collection].create_index(index["key"], unique=index.get("unique", False))
                except Exception as e:
                    logger.warning(f"Failed to create index on {collection}: {e}")
    
    async def disconnect(self):
        """Close database connection."""
        if self.client:
            self.client.close()
            logger.info("Disconnected from MongoDB")

db_manager = Database()

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

# Sentry middleware
if config.SENTRY_DSN and config.is_production:
    app.add_middleware(SentryAsgiMiddleware)

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
# Subscription Routes
# ------------------------------

@api_router.post("/subscriptions", response_model=Subscription, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    payload: SubscriptionCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new subscription."""
    try:
        # Get or create Stripe customer
        user_data = await db_manager.db.users.find_one({"id": current_user.id})
        customer_id = user_data.get("stripe_customer_id")
        
        if not customer_id:
            customer_id = await create_stripe_customer(
                current_user.email,
                current_user.name,
                current_user.organization
            )
            await db_manager.db.users.update_one(
                {"id": current_user.id},
                {"$set": {"stripe_customer_id": customer_id}}
            )
        
        # Create Stripe subscription
        stripe_sub = await create_stripe_subscription(
            customer_id,
            payload.plan_id,
            payload.payment_method_id
        )
        
        if not stripe_sub:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subscription creation failed"
            )
        
        # Create subscription record
        subscription = Subscription(
            user_id=current_user.id,
            plan_id=payload.plan_id,
            stripe_subscription_id=stripe_sub["subscription_id"],
            stripe_customer_id=customer_id,
            status=stripe_sub["status"],
            current_period_start=stripe_sub.get("current_period_start"),
            current_period_end=stripe_sub.get("current_period_end"),
            created_at=datetime.utcnow()
        )
        
        await db_manager.db.subscriptions.insert_one(subscription.dict())
        
        # Update user plan
        await db_manager.db.users.update_one(
            {"id": current_user.id},
            {"$set": {"plan": payload.plan_id}}
        )
        
        logger.info(f"Subscription created for user: {current_user.email}")
        
        return subscription
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Subscription creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Subscription creation failed"
        )


@api_router.get("/subscriptions/me", response_model=Subscription)
async def get_my_subscription(current_user: User = Depends(get_current_user)):
    """Get current user's subscription."""
    try:
        subscription_data = await db_manager.db.subscriptions.find_one(
            {"user_id": current_user.id, "status": {"$ne": "canceled"}}
        )
        
        if not subscription_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active subscription found"
            )
        
        # Sync with Stripe
        stripe_status = await get_subscription_status(subscription_data["stripe_subscription_id"])
        if stripe_status and stripe_status != subscription_data["status"]:
            await db_manager.db.subscriptions.update_one(
                {"_id": subscription_data["_id"]},
                {"$set": {"status": stripe_status}}
            )
            subscription_data["status"] = stripe_status
        
        return Subscription(**subscription_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Subscription retrieval error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve subscription"
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
    
    port = int(os.environ.get("PORT", 8000))
    
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=config.is_development,
        log_level="info",
        access_log=True,
        timeout_keep_alive=30
    )
