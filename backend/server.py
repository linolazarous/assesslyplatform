import os
import sys
import logging
import uuid
import secrets
import json
from urllib.parse import urlencode
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field, validator
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
    get_or_create_stripe_customer,
    create_subscription,
    create_checkout_session,
    cancel_subscription,
    handle_webhook_event,
    validate_stripe_config
)

# ------------------------------
# Pydantic Models for New Endpoints
# ------------------------------

class AssessmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assessment_type: str = "multiple_choice"  # multiple_choice, coding, text, etc.
    duration_minutes: Optional[int] = 30
    questions: List[Dict] = []
    settings: Dict = {}

class AssessmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assessment_type: Optional[str] = None
    duration_minutes: Optional[int] = None
    questions: Optional[List[Dict]] = None
    settings: Optional[Dict] = None
    status: Optional[str] = None  # draft, published, archived

class CandidateCreate(BaseModel):
    email: str
    name: Optional[str] = None
    assessment_id: str

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    organization: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None
    notifications_enabled: Optional[bool] = True

class OAuthState(BaseModel):
    state: str
    redirect_uri: str
    plan: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OAuthCallback(BaseModel):
    code: str
    state: str

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
        "LOG_LEVEL": ("INFO", "Logging level"),
        "PORT": (10000, "Server port"),
        "GOOGLE_OAUTH_CLIENT_ID": ("", "Google OAuth Client ID"),
        "GOOGLE_OAUTH_CLIENT_SECRET": ("", "Google OAuth Client Secret"),
        "GITHUB_OAUTH_CLIENT_ID": ("", "GitHub OAuth Client ID"),
        "GITHUB_OAUTH_CLIENT_SECRET": ("", "GitHub OAuth Client Secret"),
        "RECAPTCHA_SECRET_KEY": ("", "Google reCAPTCHA secret key"),
        "SESSION_SECRET": ("", "Session secret for cookies"),
        "API_RATE_LIMIT": ("100/minute", "API rate limit")
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
        
        # CORS origins handling
        cors_origins = os.getenv("CORS_ORIGINS", "*")
        self.CORS_ORIGINS = cors_origins.split(",") if cors_origins != "*" else ["*"]
        
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
        self.PORT = int(os.getenv("PORT", 10000))
        
        # OAuth configuration
        self.GOOGLE_OAUTH_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "")
        self.GOOGLE_OAUTH_CLIENT_SECRET = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "")
        self.GITHUB_OAUTH_CLIENT_ID = os.getenv("GITHUB_OAUTH_CLIENT_ID", "")
        self.GITHUB_OAUTH_CLIENT_SECRET = os.getenv("GITHUB_OAUTH_CLIENT_SECRET", "")
        
        # Security
        self.RECAPTCHA_SECRET_KEY = os.getenv("RECAPTCHA_SECRET_KEY", "")
        self.SESSION_SECRET = os.getenv("SESSION_SECRET", secrets.token_urlsafe(32))
        
        # Validate database name (no spaces allowed)
        if " " in self.DB_NAME:
            raise ValueError("Database name cannot contain spaces")
        
        # Set production flags
        self.is_production = self.ENVIRONMENT == "production"
        self.is_development = self.ENVIRONMENT == "development"
        self.is_testing = self.ENVIRONMENT == "testing"
        
        # Set default OAuth redirect URIs
        self.GOOGLE_REDIRECT_URI = f"{self.FRONTEND_URL}/oauth/google/callback"
        self.GITHUB_REDIRECT_URI = f"{self.FRONTEND_URL}/oauth/github/callback"

config = Config()

# ------------------------------
# Database Manager
# ------------------------------

class DatabaseManager:
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db: Optional[AsyncIOMotorDatabase] = None
    
    async def connect(self):
        """Connect to MongoDB."""
        try:
            self.client = AsyncIOMotorClient(config.MONGO_URL, maxPoolSize=100, minPoolSize=10)
            await self.client.admin.command('ping')
            self.db = self.client[config.DB_NAME]
            logger.info(f"Connected to MongoDB database: {config.DB_NAME}")
            
            # Create indexes for better performance
            await self.create_indexes()
            
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    
    async def create_indexes(self):
        """Create database indexes for better performance."""
        try:
            # Users collection indexes
            await self.db.users.create_index([("email", 1)], unique=True)
            await self.db.users.create_index([("google_id", 1)], sparse=True)
            await self.db.users.create_index([("github_id", 1)], sparse=True)
            
            # Assessments collection indexes
            await self.db.assessments.create_index([("user_id", 1)])
            await self.db.assessments.create_index([("organization_id", 1)])
            await self.db.assessments.create_index([("status", 1)])
            await self.db.assessments.create_index([("created_at", -1)])
            
            # Candidates collection indexes
            await self.db.candidates.create_index([("assessment_id", 1)])
            await self.db.candidates.create_index([("email", 1)])
            await self.db.candidates.create_index([("status", 1)])
            await self.db.candidates.create_index([("user_id", 1)])
            
            # Organizations collection indexes
            await self.db.organizations.create_index([("owner_id", 1)])
            await self.db.organizations.create_index([("slug", 1)], unique=True, sparse=True)
            
            # Subscriptions collection indexes
            await self.db.subscriptions.create_index([("user_id", 1)])
            await self.db.subscriptions.create_index([("status", 1)])
            await self.db.subscriptions.create_index([("stripe_subscription_id", 1)])
            
            # OAuth states collection indexes
            await self.db.oauth_states.create_index([("state", 1)], unique=True)
            await self.db.oauth_states.create_index([("created_at", 1)], expireAfterSeconds=300)  # 5 minutes TTL
            
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.warning(f"Could not create indexes: {e}")
    
    async def disconnect(self):
        """Disconnect from MongoDB."""
        if self.client:
            self.client.close()
            logger.info("Disconnected from MongoDB")

db_manager = DatabaseManager()

# ------------------------------
# Logging Configuration (PRODUCTION SAFE)
# ------------------------------

log_level = getattr(logging, config.LOG_LEVEL.upper(), logging.INFO)

# Build handlers list dynamically (no None values)
handlers = [logging.StreamHandler(sys.stdout)]

if config.is_production:
    try:
        os.makedirs("/var/log/assessly", exist_ok=True)
        file_handler = logging.FileHandler("/var/log/assessly/app.log", encoding="utf-8")
        file_handler.setFormatter(logging.Formatter(
            "%(asctime)s | %(levelname)s | %(name)s | %(module)s:%(lineno)d | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        ))
        handlers.append(file_handler)
    except Exception as e:
        # Log to console if file logging fails
        print(f"Warning: Could not set up file logging: {e}")

# Configure root logger
logging.basicConfig(
    level=log_level,
    format="%(asctime)s | %(levelname)s | %(name)s | %(module)s:%(lineno)d | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=handlers
)

# Configure our application logger
logger = logging.getLogger("assessly-api")
logger.setLevel(log_level)
logger.propagate = False  # Prevent duplicate logs

# ------------------------------
# FastAPI App Configuration
# ------------------------------

app = FastAPI(
    title="Assessly Platform API",
    version="1.0.0",
    description="Enterprise-grade assessment platform API",
    docs_url="/api/docs" if config.is_development else None,
    redoc_url="/api/redoc" if config.is_development else None,
    openapi_url="/api/openapi.json" if config.is_development else None,
    openapi_tags=[
        {
            "name": "Authentication",
            "description": "User authentication and OAuth endpoints"
        },
        {
            "name": "Assessments",
            "description": "Assessment creation and management"
        },
        {
            "name": "Subscriptions",
            "description": "Subscription and billing management"
        },
        {
            "name": "User Management",
            "description": "User profile and organization management"
        }
    ]
)

# ------------------------------
# Middleware
# ------------------------------

# Security middleware
if config.is_production:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            "assesslyplatform.com",
            "api.assesslyplatform.com",
            "localhost",
            "127.0.0.1",
            config.FRONTEND_URL.replace("https://", "").replace("http://", "").split(":")[0]
        ]
    )

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
    expose_headers=["X-Total-Count", "X-Error-Code", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
    max_age=600
)

# Compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.utcnow()
    
    # Skip logging for health checks and static files
    if request.url.path in ["/health", "/favicon.ico"]:
        response = await call_next(request)
        return response
    
    request_id = request.headers.get("X-Request-ID", secrets.token_urlsafe(8))
    
    # Log request
    logger.info(f"Request {request_id}: {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
        process_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        # Log response
        logger.info(f"Response {request_id}: {request.method} {request.url.path} - Status: {response.status_code} - {process_time:.2f}ms")
        return response
    except Exception as e:
        logger.error(f"Request {request_id} failed: {request.method} {request.url.path} - Error: {e}")
        raise

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
# Helper Functions
# ------------------------------

def to_object_id(id_str: str) -> ObjectId:
    """Convert string to ObjectId, handling errors."""
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")

def convert_object_ids_to_str(data: dict) -> dict:
    """Convert ObjectId fields to strings in a dict."""
    if not data:
        return data
    
    result = {}
    for key, value in data.items():
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, dict):
            result[key] = convert_object_ids_to_str(value)
        elif isinstance(value, list):
            result[key] = [convert_object_ids_to_str(item) if isinstance(item, dict) else item for item in value]
        else:
            result[key] = value
    return result

async def verify_recaptcha(token: str) -> bool:
    """Verify Google reCAPTCHA token."""
    if not config.RECAPTCHA_SECRET_KEY:
        return True  # Skip verification if not configured
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.google.com/recaptcha/api/siteverify",
                data={
                    "secret": config.RECAPTCHA_SECRET_KEY,
                    "response": token
                }
            )
            result = response.json()
            return result.get("success", False) and result.get("score", 0) > 0.5
    except Exception as e:
        logger.error(f"reCAPTCHA verification error: {e}")
        return False

# ------------------------------
# Custom Exception Handlers
# ------------------------------

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    logger.warning(f"HTTP {exc.status_code}: {exc.detail} - {request.url.path}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code,
            "path": request.url.path,
            "timestamp": datetime.utcnow().isoformat()
        },
        headers=exc.headers if exc.headers else {}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors."""
    logger.warning(f"Validation error: {exc.errors()} - {request.url.path}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
            "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    if config.is_production:
        error_detail = "Internal server error"
    else:
        error_detail = str(exc)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": error_detail,
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "timestamp": datetime.utcnow().isoformat()
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
        logger.error(f"Database health check failed: {e}")
    
    # Check Stripe configuration
    try:
        validate_stripe_config()
        stripe_status = "healthy"
    except Exception as e:
        stripe_status = f"unhealthy: {str(e)}"
        logger.error(f"Stripe health check failed: {e}")
    
    return {
        "service": "Assessly Platform API",
        "status": "operational",
        "version": "1.0.0",
        "environment": config.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
        "database": db_status,
        "stripe": stripe_status,
        "checks": {
            "database": db_status == "healthy",
            "stripe": stripe_status == "healthy"
        }
    }

# ------------------------------
# API Router
# ------------------------------

api_router = APIRouter(prefix="/api")

@api_router.get("/", tags=["API"])
async def api_root():
    """API root endpoint."""
    return {
        "message": "Assessly Platform API",
        "version": "1.0.0",
        "environment": config.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
        "documentation": "/api/docs" if config.is_development else None,
        "endpoints": {
            "authentication": [
                "/api/auth/register",
                "/api/auth/login",
                "/api/auth/me",
                "/api/auth/logout",
                "/api/auth/refresh",
                "/api/auth/google",
                "/api/auth/github"
            ],
            "assessments": [
                "/api/assessments",
                "/api/assessments/{id}"
            ],
            "subscriptions": [
                "/api/subscriptions/checkout",
                "/api/subscriptions/me",
                "/api/subscriptions/cancel",
                "/api/plans"
            ],
            "user_management": [
                "/api/users/me",
                "/api/organizations/me",
                "/api/dashboard/stats"
            ],
            "public": [
                "/api/contact",
                "/api/demo"
            ]
        }
    }

# ------------------------------
# Authentication Routes
# ------------------------------

@api_router.post("/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED, tags=["Authentication"])
async def register(user_create: UserCreate, request: Request):
    """Register a new user."""
    try:
        # Check reCAPTCHA if enabled
        recaptcha_token = user_create.recaptcha_token if hasattr(user_create, 'recaptcha_token') else None
        if recaptcha_token and not await verify_recaptcha(recaptcha_token):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="reCAPTCHA verification failed"
            )
        
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
        user_data["last_login"] = datetime.utcnow()
        
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
            stripe_customer_id = await get_or_create_stripe_customer(
                user_id=user.id,
                email=user.email,
                name=user.name,
                organization=user.organization
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
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
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
            user=user,
            redirect_url=f"{config.FRONTEND_URL}/dashboard"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@api_router.post("/auth/login", response_model=Token, tags=["Authentication"])
async def login(credentials: UserLogin, request: Request):
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
            user=user,
            redirect_url=f"{config.FRONTEND_URL}/dashboard"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )


@api_router.post("/auth/refresh", response_model=Token, tags=["Authentication"])
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
        logger.error(f"Token refresh error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@api_router.get("/auth/me", response_model=User, tags=["Authentication"])
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return current_user


@api_router.post("/auth/logout", tags=["Authentication"])
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user (client-side token invalidation)."""
    logger.info(f"User logged out: {current_user.email}")
    return {"message": "Successfully logged out", "redirect_url": f"{config.FRONTEND_URL}/login"}

# ------------------------------
# OAuth Routes
# ------------------------------

@api_router.get("/auth/google", tags=["Authentication"])
async def google_oauth_initiate(
    redirect_uri: str = Query(default=config.GOOGLE_REDIRECT_URI),
    plan: Optional[str] = Query(None),
    state: Optional[str] = Query(None)
):
    """Initiate Google OAuth flow."""
    try:
        if not config.GOOGLE_OAUTH_CLIENT_ID:
            raise HTTPException(status_code=501, detail="Google OAuth not configured")
        
        # Generate state token for security
        state_token = state or secrets.token_urlsafe(32)
        
        # Store state in database for validation
        oauth_state = {
            "state": state_token,
            "redirect_uri": redirect_uri,
            "plan": plan or "free",
            "created_at": datetime.utcnow()
        }
        await db_manager.db.oauth_states.insert_one(oauth_state)
        
        # Google OAuth URL parameters
        params = {
            "client_id": config.GOOGLE_OAUTH_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state_token,
            "access_type": "offline",
            "prompt": "consent"
        }
        
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
        
        return {"auth_url": auth_url}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google OAuth initiation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth initiation failed"
        )


@api_router.get("/auth/google/callback", tags=["Authentication"])
async def google_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    error: Optional[str] = Query(None)
):
    """Handle Google OAuth callback."""
    try:
        if error:
            logger.error(f"Google OAuth error: {error}")
            return RedirectResponse(url=f"{config.FRONTEND_URL}/login?error=oauth_failed")
        
        if not config.GOOGLE_OAUTH_CLIENT_ID or not config.GOOGLE_OAUTH_CLIENT_SECRET:
            raise HTTPException(status_code=501, detail="Google OAuth not configured")
        
        # Validate state
        state_record = await db_manager.db.oauth_states.find_one({"state": state})
        if not state_record:
            logger.error(f"Invalid state parameter: {state}")
            return RedirectResponse(url=f"{config.FRONTEND_URL}/login?error=invalid_state")
        
        # Clean up state record
        await db_manager.db.oauth_states.delete_one({"state": state})
        
        redirect_uri = state_record.get("redirect_uri", config.GOOGLE_REDIRECT_URI)
        plan = state_record.get("plan", "free")
        
        # Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "code": code,
            "client_id": config.GOOGLE_OAUTH_CLIENT_ID,
            "client_secret": config.GOOGLE_OAUTH_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(token_url, data=token_data)
            if token_response.status_code != 200:
                logger.error(f"Google token exchange failed: {token_response.text}")
                return RedirectResponse(url=f"{config.FRONTEND_URL}/login?error=token_exchange_failed")
            
            tokens = token_response.json()
        
        access_token = tokens.get("access_token")
        
        if not access_token:
            logger.error("No access token returned from Google")
            return RedirectResponse(url=f"{config.FRONTEND_URL}/login?error=no_access_token")
        
        # Get user info from Google
        userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}
        
        async with httpx.AsyncClient() as client:
            userinfo_response = await client.get(userinfo_url, headers=headers)
            if userinfo_response.status_code != 200:
                logger.error(f"Failed to get user info: {userinfo_response.text}")
                return RedirectResponse(url=f"{config.FRONTEND_URL}/login?error=userinfo_failed")
            
            userinfo = userinfo_response.json()
        
        # Extract user info
        google_id = userinfo.get("sub")
        email = userinfo.get("email")
        name = userinfo.get("name", "").strip()
        given_name = userinfo.get("given_name", "")
        family_name = userinfo.get("family_name", "")
        picture = userinfo.get("picture")
        
        if not email:
            logger.error("No email returned from Google")
            return RedirectResponse(url=f"{config.FRONTEND_URL}/login?error=no_email")
        
        if not name:
            name = f"{given_name} {family_name}".strip()
            if not name:
                name = email.split("@")[0]
        
        # Check if user exists
        user_data = await db_manager.db.users.find_one({"email": email})
        
        if user_data:
            # Existing user - login
            user = User(**user_data)
            
            # Update Google ID if not set
            if not user_data.get("google_id"):
                await db_manager.db.users.update_one(
                    {"id": user.id},
                    {"$set": {"google_id": google_id, "updated_at": datetime.utcnow()}}
                )
            
            # Update last login
            await db_manager.db.users.update_one(
                {"id": user.id},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            
        else:
            # New user - create account
            user_id = str(uuid.uuid4())
            
            # Create user
            user_data = {
                "id": user_id,
                "email": email,
                "name": name,
                "google_id": google_id,
                "avatar": picture,
                "organization": "Personal" if not plan or plan == "free" else f"{name}'s Company",
                "plan": plan,
                "is_verified": True,  # Google verifies email
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "last_login": datetime.utcnow()
            }
            
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
                stripe_customer_id = await get_or_create_stripe_customer(
                    user_id=user.id,
                    email=user.email,
                    name=user.name,
                    organization=user.organization
                )
                if stripe_customer_id:
                    await db_manager.db.users.update_one(
                        {"id": user.id},
                        {"$set": {"stripe_customer_id": stripe_customer_id}}
                    )
            except Exception as e:
                logger.error(f"Failed to create Stripe customer: {e}")
            
            # Create subscription record
            subscription = {
                "user_id": user.id,
                "plan_id": plan,
                "stripe_subscription_id": f"{plan}_oauth",
                "status": "active",
                "amount": 0,
                "currency": "usd",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await db_manager.db.subscriptions.insert_one(subscription)
            
            # Send welcome email
            try:
                await send_welcome_email(user.name, user.email, user.organization)
            except Exception as e:
                logger.error(f"Failed to send welcome email: {e}")
        
        # Generate JWT tokens
        access_token_jwt = create_access_token({"sub": user.id, "email": user.email})
        refresh_token_jwt = create_refresh_token({"sub": user.id})
        
        # Redirect to frontend with tokens
        token_params = urlencode({
            "access_token": access_token_jwt,
            "refresh_token": refresh_token_jwt,
            "user_id": user.id
        })
        
        redirect_url = f"{config.FRONTEND_URL}/oauth/callback?{token_params}"
        return RedirectResponse(url=redirect_url)
        
    except httpx.HTTPStatusError as e:
        logger.error(f"Google OAuth HTTP error: {e}")
        return RedirectResponse(url=f"{config.FRONTEND_URL}/login?error=oauth_http_error")
    except Exception as e:
        logger.error(f"Google OAuth callback error: {e}", exc_info=True)
        return RedirectResponse(url=f"{config.FRONTEND_URL}/login?error=oauth_failed")


@api_router.get("/auth/github", tags=["Authentication"])
async def github_oauth_initiate(
    redirect_uri: str = Query(default=config.GITHUB_REDIRECT_URI),
    plan: Optional[str] = Query(None),
    state: Optional[str] = Query(None)
):
    """Initiate GitHub OAuth flow."""
    try:
        if not config.GITHUB_OAUTH_CLIENT_ID:
            raise HTTPException(status_code=501, detail="GitHub OAuth not configured")
        
        # Generate state token for security
        state_token = state or secrets.token_urlsafe(32)
        
        # Store state in database for validation
        oauth_state = {
            "state": state_token,
            "redirect_uri": redirect_uri,
            "plan": plan or "free",
            "created_at": datetime.utcnow()
        }
        await db_manager.db.oauth_states.insert_one(oauth_state)
        
        # GitHub OAuth URL parameters
        params = {
            "client_id": config.GITHUB_OAUTH_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": "user:email",
            "state": state_token
        }
        
        auth_url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
        
        return {"auth_url": auth_url}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GitHub OAuth initiation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth initiation failed"
        )


@api_router.get("/auth/github/callback", tags=["Authentication"])
async def github_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    error: Optional[str] = Query(None)
):
    """Handle GitHub OAuth callback."""
    try:
        if error:
            logger.error(f"GitHub OAuth error: {error}")
            return RedirectResponse(url=f"{config.FRONTEND_URL}/login?error=oauth_failed")
        
        if not config.GITHUB_OAUTH_CLIENT_ID or not config.GITHUB_OAUTH_CLIENT_SECRET:
            raise HTTPException(status_code=501, detail="GitHub OAuth not configured")
        
        # Validate state
        state_record = await db_manager.db.oauth_states.find_one({"state": state})
        if not state_record:
            logger.error(f"Invalid state parameter: {state}")
            return RedirectResponse(url=f"{config.FRONTEND_URL}/login?error=invalid_state")
        
        # Clean up state record
        await db_manager.db.oauth_states.delete_one({"state": state})
        
        redirect_uri = state_record.get("redirect_uri", config.GITHUB_REDIRECT_URI)
        plan = state_record.get("plan", "free")
        
        # Exchange code for access token
        token_url = "https://github.com/login/oauth/access_token"
        token_data = {
            "client_id": config.GITHUB_OAUTH_CLIENT_ID,
            "client_secret": config.GITHUB_OAUTH_CLIENT_SECRET,
            "code": code,
            "redirect_uri": redirect_uri
        }
        
        headers = {"Accept": "application/json"}
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(token_url, data=token_data, headers=headers)
            if token_response.status_code != 200:
                logger.error(f"GitHub token exchange failed: {token_response.text}")
                return RedirectResponse(url=f"{config.FRONTEND_URL}/login?error=token_exchange_failed")
            
            tokens = token_response.json()
        
        access_token = tokens.get("access_token")
        
        if not access_token:
            logger.error("No access token returned from GitHub")
            return RedirectResponse(url=f"{config.FRONTEND_URL}/login?error=no_access_token")
        
        # Get user info from GitHub
        userinfo_url = "https://api.github.com/user"
        emails_url = "https://api.github.com/user/emails"
        headers = {
            "Authorization": f"token {access_token}",
            "Accept": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            # Get user profile
            userinfo_response = await client.get(userinfo_url, headers=headers)
            if userinfo_response.status_code != 200:
                logger.error(f"Failed to get user info: {userinfo_response.text}")
                return RedirectResponse(url=f"{config.FRONTEND_URL}/login?error=userinfo_failed")
            
            userinfo = userinfo_response.json()
            
            # Get user emails
            emails_response = await client.get(emails_url, headers=headers)
            emails = emails_response.json() if emails_response.status_code == 200 else []
        
        # Extract primary email
        primary_email = None
        for email in emails:
            if isinstance(email, dict) and email.get("primary") and email.get("verified"):
                primary_email = email.get("email")
                break
        
        if not primary_email:
            # Fallback to the first verified email
            for email in emails:
                if isinstance(email, dict) and email.get("verified"):
                    primary_email = email.get("email")
                    break
        
        if not primary_email:
            # If no verified emails, use the public email
            primary_email = userinfo.get("email")
        
        if not primary_email:
            logger.error("No verified email found")
            return RedirectResponse(url=f"{config.FRONTEND_URL}/login?error=no_email")
        
        # Extract user info
        github_id = str(userinfo.get("id"))
        name = userinfo.get("name", "").strip()
        login = userinfo.get("login", "")
        avatar = userinfo.get("avatar_url")
        
        if not name:
            name = login
        
        # Check if user exists
        user_data = await db_manager.db.users.find_one({"email": primary_email})
        
        if user_data:
            # Existing user - login
            user = User(**user_data)
            
            # Update GitHub ID if not set
            if not user_data.get("github_id"):
                await db_manager.db.users.update_one(
                    {"id": user.id},
                    {"$set": {"github_id": github_id, "updated_at": datetime.utcnow()}}
                )
            
            # Update last login
            await db_manager.db.users.update_one(
                {"id": user.id},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            
        else:
            # New user - create account
            user_id = str(uuid.uuid4())
            
            # Create user
            user_data = {
                "id": user_id,
                "email": primary_email,
                "name": name,
                "github_id": github_id,
                "avatar": avatar,
                "organization": "Personal" if not plan or plan == "free" else f"{name}'s Company",
                "plan": plan,
                "is_verified": True,  # GitHub emails are verified
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "last_login": datetime.utcnow()
            }
            
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
                stripe_customer_id = await get_or_create_stripe_customer(
                    user_id=user.id,
                    email=user.email,
                    name=user.name,
                    organization=user.organization
                )
                if stripe_customer_id:
                    await db_manager.db.users.update_one(
                        {"id": user.id},
                        {"$set": {"stripe_customer_id": stripe_customer_id}}
                    )
            except Exception as e:
                logger.error(f"Failed to create Stripe customer: {e}")
            
            # Create subscription record
            subscription = {
                "user_id": user.id,
                "plan_id": plan,
                "stripe_subscription_id": f"{plan}_oauth",
                "status": "active",
                "amount": 0,
                "currency": "usd",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await db_manager.db.subscriptions.insert_one(subscription)
            
            # Send welcome email
            try:
                await send_welcome_email(user.name, user.email, user.organization)
            except Exception as e:
                logger.error(f"Failed to send welcome email: {e}")
        
        # Generate JWT tokens
        access_token_jwt = create_access_token({"sub": user.id, "email": user.email})
        refresh_token_jwt = create_refresh_token({"sub": user.id})
        
        # Redirect to frontend with tokens
        token_params = urlencode({
            "access_token": access_token_jwt,
            "refresh_token": refresh_token_jwt,
            "user_id": user.id
        })
        
        redirect_url = f"{config.FRONTEND_URL}/oauth/callback?{token_params}"
        return RedirectResponse(url=redirect_url)
        
    except httpx.HTTPStatusError as e:
        logger.error(f"GitHub OAuth HTTP error: {e}")
        return RedirectResponse(url=f"{config.FRONTEND_URL}/login?error=oauth_http_error")
    except Exception as e:
        logger.error(f"GitHub OAuth callback error: {e}", exc_info=True)
        return RedirectResponse(url=f"{config.FRONTEND_URL}/login?error=oauth_failed")


@api_router.post("/oauth/exchange", tags=["Authentication"])
async def oauth_token_exchange(payload: dict):
    """Exchange OAuth tokens for JWT tokens."""
    try:
        access_token = payload.get("access_token")
        refresh_token = payload.get("refresh_token")
        
        if not access_token or not refresh_token:
            raise HTTPException(status_code=400, detail="Missing tokens")
        
        # Verify the tokens
        try:
            access_payload = verify_token(access_token)
            refresh_payload = verify_refresh_token(refresh_token)
            
            if not access_payload or not refresh_payload:
                raise HTTPException(status_code=401, detail="Invalid tokens")
            
            # Get user
            user_id = access_payload.get("sub")
            user_data = await db_manager.db.users.find_one({"id": user_id})
            
            if not user_data:
                raise HTTPException(status_code=404, detail="User not found")
            
            user = User(**user_data)
            
            return Token(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                user=user,
                redirect_url=f"{config.FRONTEND_URL}/dashboard"
            )
            
        except Exception as e:
            logger.error(f"Token exchange error: {e}")
            raise HTTPException(status_code=401, detail="Invalid or expired tokens")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth exchange error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token exchange failed"
        )

# ------------------------------
# Contact & Demo Routes
# ------------------------------

@api_router.post("/contact", status_code=status.HTTP_201_CREATED, tags=["Public"])
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
        
        return {"success": True, "message": "Contact form submitted successfully"}
        
    except Exception as e:
        logger.error(f"Contact form error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit contact form"
        )


@api_router.post("/demo", status_code=status.HTTP_201_CREATED, tags=["Public"])
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
        
        return {"success": True, "message": "Demo request submitted successfully"}
        
    except Exception as e:
        logger.error(f"Demo request error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit demo request"
        )

# ------------------------------
# Subscription & Payment Routes
# ------------------------------

@api_router.post("/subscriptions/checkout", tags=["Subscriptions"])
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
                "redirect_url": f"{config.FRONTEND_URL}/dashboard?plan=free",
                "message": "Successfully switched to free plan"
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
            plan_id=plan_id,
            success_url=success_url,
            cancel_url=cancel_url,
            customer_id=customer_id,
            user_id=current_user.id
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
            "session_id": session.get("session_id"),
            "url": session.get("url"),
            "message": "Checkout session created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Checkout error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Checkout failed"
        )


@api_router.get("/subscriptions/me", tags=["Subscriptions"])
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


@api_router.post("/subscriptions/cancel", tags=["Subscriptions"])
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
        
        # Cancel subscription
        success = await cancel_subscription(subscription_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to cancel subscription")
        
        # Update subscription status in database
        await db_manager.db.subscriptions.update_one(
            {"_id": subscription_data["_id"]},
            {"$set": {
                "status": "canceled",
                "canceled_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        # Downgrade to free
        await db_manager.db.users.update_one(
            {"id": current_user.id},
            {"$set": {"plan": "free", "updated_at": datetime.utcnow()}}
        )
        
        return {
            "success": True, 
            "message": "Subscription cancelled successfully",
            "redirect_url": f"{config.FRONTEND_URL}/dashboard"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cancellation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription"
        )


@api_router.get("/plans", tags=["Subscriptions"])
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

# ------------------------------
# Assessment Endpoints
# ------------------------------

@api_router.post("/assessments", status_code=status.HTTP_201_CREATED, tags=["Assessments"])
async def create_assessment(
    assessment: AssessmentCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new assessment."""
    try:
        # Get user's organization
        organization = await db_manager.db.organizations.find_one({"owner_id": current_user.id})
        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Check assessment limit based on user's plan
        user_data = await db_manager.db.users.find_one({"id": current_user.id})
        plan = user_data.get("plan", "free")
        
        if plan == "free":
            assessment_count = await db_manager.db.assessments.count_documents({"user_id": current_user.id})
            if assessment_count >= 5:
                raise HTTPException(status_code=400, detail="Free plan limit reached (5 assessments)")
        
        # Create assessment data
        assessment_data = assessment.dict()
        assessment_data["user_id"] = current_user.id
        assessment_data["organization_id"] = organization["id"]
        assessment_data["status"] = "draft"
        assessment_data["created_at"] = datetime.utcnow()
        assessment_data["updated_at"] = datetime.utcnow()
        
        # Insert assessment
        result = await db_manager.db.assessments.insert_one(assessment_data)
        
        # Convert ObjectId to string
        assessment_id = str(result.inserted_id)
        
        logger.info(f"Assessment created: {assessment_id} by user {current_user.id}")
        
        return {
            "success": True,
            "assessment_id": assessment_id,
            "message": "Assessment created successfully",
            "redirect_url": f"{config.FRONTEND_URL}/assessments/{assessment_id}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create assessment error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create assessment"
        )


@api_router.get("/assessments", tags=["Assessments"])
async def get_assessments(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    """Get all assessments for current user."""
    try:
        # Build query
        query = {"user_id": current_user.id}
        if status:
            query["status"] = status
        
        # Get assessments with pagination
        cursor = db_manager.db.assessments.find(query).sort("created_at", -1).skip(skip).limit(limit)
        assessments = await cursor.to_list(length=limit)
        
        # Convert ObjectIds to strings
        for assessment in assessments:
            assessment["id"] = str(assessment["_id"])
            del assessment["_id"]
        
        # Get total count for pagination
        total = await db_manager.db.assessments.count_documents(query)
        
        return {
            "assessments": assessments,
            "total": total,
            "limit": limit,
            "skip": skip,
            "has_more": (skip + len(assessments)) < total
        }
        
    except Exception as e:
        logger.error(f"Get assessments error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve assessments"
        )


@api_router.get("/assessments/{assessment_id}", tags=["Assessments"])
async def get_assessment(
    assessment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific assessment by ID."""
    try:
        # Convert string ID to ObjectId
        obj_id = to_object_id(assessment_id)
        
        # Find assessment
        assessment = await db_manager.db.assessments.find_one({"_id": obj_id, "user_id": current_user.id})
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Convert ObjectId to string
        assessment["id"] = str(assessment["_id"])
        del assessment["_id"]
        
        return assessment
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get assessment error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve assessment"
        )


@api_router.put("/assessments/{assessment_id}", tags=["Assessments"])
async def update_assessment(
    assessment_id: str,
    assessment_update: AssessmentUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update an assessment."""
    try:
        # Convert string ID to ObjectId
        obj_id = to_object_id(assessment_id)
        
        # Check if assessment exists and belongs to user
        existing = await db_manager.db.assessments.find_one({"_id": obj_id, "user_id": current_user.id})
        if not existing:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Prepare update data
        update_data = assessment_update.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        # Update assessment
        await db_manager.db.assessments.update_one(
            {"_id": obj_id},
            {"$set": update_data}
        )
        
        logger.info(f"Assessment updated: {assessment_id} by user {current_user.id}")
        
        return {
            "success": True,
            "message": "Assessment updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update assessment error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update assessment"
        )


@api_router.delete("/assessments/{assessment_id}", tags=["Assessments"])
async def delete_assessment(
    assessment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete an assessment."""
    try:
        # Convert string ID to ObjectId
        obj_id = to_object_id(assessment_id)
        
        # Check if assessment exists and belongs to user
        existing = await db_manager.db.assessments.find_one({"_id": obj_id, "user_id": current_user.id})
        if not existing:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Delete assessment
        await db_manager.db.assessments.delete_one({"_id": obj_id})
        
        # Also delete related candidates
        await db_manager.db.candidates.delete_many({"assessment_id": assessment_id})
        
        logger.info(f"Assessment deleted: {assessment_id} by user {current_user.id}")
        
        return {
            "success": True,
            "message": "Assessment deleted successfully",
            "redirect_url": f"{config.FRONTEND_URL}/assessments"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete assessment error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete assessment"
        )

# ------------------------------
# Candidate Endpoints
# ------------------------------

@api_router.post("/candidates", status_code=status.HTTP_201_CREATED, tags=["Assessments"])
async def create_candidate(
    candidate: CandidateCreate,
    current_user: User = Depends(get_current_user)
):
    """Invite a candidate to take an assessment."""
    try:
        # Check if assessment exists and belongs to user
        assessment = await db_manager.db.assessments.find_one({"id": candidate.assessment_id, "user_id": current_user.id})
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Check candidate limit based on user's plan
        user_data = await db_manager.db.users.find_one({"id": current_user.id})
        plan = user_data.get("plan", "free")
        
        if plan == "free":
            candidate_count = await db_manager.db.candidates.count_documents({"user_id": current_user.id})
            if candidate_count >= 50:
                raise HTTPException(status_code=400, detail="Free plan limit reached (50 candidates)")
        
        elif plan == "basic":
            candidate_count = await db_manager.db.candidates.count_documents({"user_id": current_user.id})
            if candidate_count >= 500:
                raise HTTPException(status_code=400, detail="Basic plan limit reached (500 candidates)")
        
        # Check if candidate already invited
        existing_candidate = await db_manager.db.candidates.find_one({
            "assessment_id": candidate.assessment_id,
            "email": candidate.email
        })
        if existing_candidate:
            raise HTTPException(status_code=400, detail="Candidate already invited to this assessment")
        
        # Create candidate data
        candidate_data = candidate.dict()
        candidate_data["user_id"] = current_user.id
        candidate_data["invitation_token"] = str(uuid.uuid4())
        candidate_data["status"] = "invited"
        candidate_data["invited_at"] = datetime.utcnow()
        candidate_data["created_at"] = datetime.utcnow()
        
        # Insert candidate
        result = await db_manager.db.candidates.insert_one(candidate_data)
        
        # Convert ObjectId to string
        candidate_id = str(result.inserted_id)
        
        logger.info(f"Candidate invited: {candidate.email} to assessment {candidate.assessment_id}")
        
        # TODO: Send invitation email
        
        return {
            "success": True,
            "candidate_id": candidate_id,
            "message": "Candidate invited successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create candidate error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to invite candidate"
        )


@api_router.get("/candidates", tags=["Assessments"])
async def get_candidates(
    assessment_id: Optional[str] = Query(None, description="Filter by assessment ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    """Get all candidates for current user."""
    try:
        # Build query
        query = {"user_id": current_user.id}
        if assessment_id:
            query["assessment_id"] = assessment_id
        if status:
            query["status"] = status
        
        # Get candidates with pagination
        cursor = db_manager.db.candidates.find(query).sort("created_at", -1).skip(skip).limit(limit)
        candidates = await cursor.to_list(length=limit)
        
        # Convert ObjectIds to strings
        for candidate in candidates:
            candidate["id"] = str(candidate["_id"])
            del candidate["_id"]
        
        # Get total count for pagination
        total = await db_manager.db.candidates.count_documents(query)
        
        return {
            "candidates": candidates,
            "total": total,
            "limit": limit,
            "skip": skip,
            "has_more": (skip + len(candidates)) < total
        }
        
    except Exception as e:
        logger.error(f"Get candidates error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve candidates"
        )

# ------------------------------
# Organization Endpoints
# ------------------------------

@api_router.get("/organizations/me", tags=["User Management"])
async def get_my_organization(
    current_user: User = Depends(get_current_user)
):
    """Get current user's organization."""
    try:
        organization = await db_manager.db.organizations.find_one({"owner_id": current_user.id})
        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Convert ObjectId to string
        organization["id"] = str(organization["_id"])
        del organization["_id"]
        
        return organization
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get organization error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve organization"
        )


@api_router.put("/organizations/me", tags=["User Management"])
async def update_my_organization(
    org_update: OrganizationUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update current user's organization."""
    try:
        organization = await db_manager.db.organizations.find_one({"owner_id": current_user.id})
        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Prepare update data
        update_data = org_update.dict(exclude_unset=True)
        if "name" in update_data:
            # Update slug if name changed
            update_data["slug"] = update_data["name"].lower().replace(" ", "-")
        
        update_data["updated_at"] = datetime.utcnow()
        
        # Update organization
        await db_manager.db.organizations.update_one(
            {"owner_id": current_user.id},
            {"$set": update_data}
        )
        
        # Also update user's organization if name changed
        if "name" in update_data:
            await db_manager.db.users.update_one(
                {"id": current_user.id},
                {"$set": {"organization": update_data["name"], "updated_at": datetime.utcnow()}}
            )
        
        logger.info(f"Organization updated for user {current_user.id}")
        
        return {
            "success": True,
            "message": "Organization updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update organization error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update organization"
        )

# ------------------------------
# User Settings Endpoints
# ------------------------------

@api_router.put("/users/me", tags=["User Management"])
async def update_my_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile."""
    try:
        # Prepare update data
        update_data = user_update.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        # Update user
        await db_manager.db.users.update_one(
            {"id": current_user.id},
            {"$set": update_data}
        )
        
        # Update organization name if organization field changed
        if "organization" in update_data:
            await db_manager.db.organizations.update_one(
                {"owner_id": current_user.id},
                {"$set": {
                    "name": update_data["organization"],
                    "slug": update_data["organization"].lower().replace(" ", "-"),
                    "updated_at": datetime.utcnow()
                }}
            )
        
        logger.info(f"User profile updated: {current_user.id}")
        
        # Get updated user data
        updated_user = await db_manager.db.users.find_one({"id": current_user.id})
        updated_user = User(**updated_user)
        
        return {
            "success": True,
            "message": "Profile updated successfully",
            "user": updated_user
        }
        
    except Exception as e:
        logger.error(f"Update user error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )


@api_router.put("/users/me/password", tags=["User Management"])
async def update_my_password(
    payload: dict,
    current_user: User = Depends(get_current_user)
):
    """Update current user's password."""
    try:
        current_password = payload.get("current_password")
        new_password = payload.get("new_password")
        
        if not current_password or not new_password:
            raise HTTPException(status_code=400, detail="Current and new passwords are required")
        
        if len(new_password) < 8:
            raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
        
        # Verify current password
        user_data = await db_manager.db.users.find_one({"id": current_user.id})
        if not verify_password(current_password, user_data.get("hashed_password", "")):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Update password
        new_hashed_password = get_password_hash(new_password)
        await db_manager.db.users.update_one(
            {"id": current_user.id},
            {"$set": {
                "hashed_password": new_hashed_password,
                "updated_at": datetime.utcnow()
            }}
        )
        
        logger.info(f"User password updated: {current_user.id}")
        
        return {
            "success": True,
            "message": "Password updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update password error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password"
        )

# ------------------------------
# Dashboard Statistics Endpoint
# ------------------------------

@api_router.get("/dashboard/stats", tags=["User Management"])
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user)
):
    """Get dashboard statistics."""
    try:
        # Get assessment counts
        total_assessments = await db_manager.db.assessments.count_documents({"user_id": current_user.id})
        published_assessments = await db_manager.db.assessments.count_documents({
            "user_id": current_user.id,
            "status": "published"
        })
        draft_assessments = await db_manager.db.assessments.count_documents({
            "user_id": current_user.id,
            "status": "draft"
        })
        
        # Get candidate counts
        total_candidates = await db_manager.db.candidates.count_documents({"user_id": current_user.id})
        invited_candidates = await db_manager.db.candidates.count_documents({
            "user_id": current_user.id,
            "status": "invited"
        })
        completed_candidates = await db_manager.db.candidates.count_documents({
            "user_id": current_user.id,
            "status": "completed"
        })
        
        # Get recent assessments
        recent_assessments_cursor = db_manager.db.assessments.find(
            {"user_id": current_user.id}
        ).sort("created_at", -1).limit(5)
        recent_assessments = await recent_assessments_cursor.to_list(length=5)
        
        for assessment in recent_assessments:
            assessment["id"] = str(assessment["_id"])
            del assessment["_id"]
        
        # Get recent candidates
        recent_candidates_cursor = db_manager.db.candidates.find(
            {"user_id": current_user.id}
        ).sort("created_at", -1).limit(5)
        recent_candidates = await recent_candidates_cursor.to_list(length=5)
        
        for candidate in recent_candidates:
            candidate["id"] = str(candidate["_id"])
            del candidate["_id"]
        
        return {
            "stats": {
                "assessments": {
                    "total": total_assessments,
                    "published": published_assessments,
                    "draft": draft_assessments
                },
                "candidates": {
                    "total": total_candidates,
                    "invited": invited_candidates,
                    "completed": completed_candidates
                }
            },
            "recent": {
                "assessments": recent_assessments,
                "candidates": recent_candidates
            }
        }
        
    except Exception as e:
        logger.error(f"Get dashboard stats error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard statistics"
        )

# ------------------------------
# Webhook Endpoint
# ------------------------------

@api_router.post("/webhooks/stripe", tags=["Subscriptions"])
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks."""
    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")
        
        event = await handle_webhook_event(payload, sig_header)
        
        if not event:
            raise HTTPException(status_code=400, detail="Invalid webhook event")
        
        event_type = event.get("type")
        
        logger.info(f"Processing Stripe webhook: {event_type}")
        
        # Process webhook events
        if event_type == "checkout.session.completed":
            await handle_checkout_completed(event)
        elif event_type == "customer.subscription.updated":
            await handle_subscription_updated(event)
        elif event_type == "customer.subscription.deleted":
            await handle_subscription_deleted(event)
        elif event_type == "invoice.payment_succeeded":
            await handle_invoice_payment_succeeded(event)
        elif event_type == "invoice.payment_failed":
            await handle_invoice_payment_failed(event)
        
        return {"status": "success", "event": event_type}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed"
        )


async def handle_checkout_completed(event: Dict):
    """Handle checkout.session.completed event."""
    try:
        session_id = event.get("id")
        subscription_id = event.get("data", {}).get("object", {}).get("subscription")
        customer_id = event.get("data", {}).get("object", {}).get("customer")
        
        logger.info(f"Checkout completed: {session_id}")
        
        # Update user plan based on subscription
        subscription = await db_manager.db.subscriptions.find_one({"stripe_subscription_id": subscription_id})
        if subscription:
            plan_id = subscription.get("plan_id", "basic")
            await db_manager.db.users.update_one(
                {"stripe_customer_id": customer_id},
                {"$set": {"plan": plan_id, "updated_at": datetime.utcnow()}}
            )
            
    except Exception as e:
        logger.error(f"Error processing checkout completed: {e}")


async def handle_subscription_updated(event: Dict):
    """Handle customer.subscription.updated event."""
    try:
        subscription = event.get("data", {}).get("object", {})
        subscription_id = subscription.get("id")
        status = subscription.get("status")
        
        logger.info(f"Subscription updated: {subscription_id} - {status}")
        
        # Update subscription in database
        await db_manager.db.subscriptions.update_one(
            {"stripe_subscription_id": subscription_id},
            {"$set": {
                "status": status,
                "updated_at": datetime.utcnow()
            }}
        )
        
    except Exception as e:
        logger.error(f"Error processing subscription updated: {e}")


async def handle_subscription_deleted(event: Dict):
    """Handle customer.subscription.deleted event."""
    try:
        subscription = event.get("data", {}).get("object", {})
        subscription_id = subscription.get("id")
        customer_id = subscription.get("customer")
        
        logger.info(f"Subscription deleted: {subscription_id}")
        
        # Mark as canceled in database
        await db_manager.db.subscriptions.update_one(
            {"stripe_subscription_id": subscription_id},
            {"$set": {
                "status": "canceled",
                "updated_at": datetime.utcnow()
            }}
        )
        
        # Downgrade user to free
        await db_manager.db.users.update_one(
            {"stripe_customer_id": customer_id},
            {"$set": {"plan": "free", "updated_at": datetime.utcnow()}}
        )
        
    except Exception as e:
        logger.error(f"Error processing subscription deleted: {e}")


async def handle_invoice_payment_succeeded(event: Dict):
    """Handle invoice.payment_succeeded event."""
    try:
        invoice = event.get("data", {}).get("object", {})
        invoice_id = invoice.get("id")
        amount_paid = invoice.get("amount_paid") / 100  # Convert from cents
        
        logger.info(f"Payment succeeded: {invoice_id} - ${amount_paid}")
        
    except Exception as e:
        logger.error(f"Error processing payment succeeded: {e}")


async def handle_invoice_payment_failed(event: Dict):
    """Handle invoice.payment_failed event."""
    try:
        invoice = event.get("data", {}).get("object", {})
        invoice_id = invoice.get("id")
        
        logger.warning(f"Payment failed: {invoice_id}")
        
    except Exception as e:
        logger.error(f"Error processing payment failed: {e}")

# ------------------------------
# Include Router & Startup/Shutdown
# ------------------------------

app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    """Handle application startup."""
    logger.info(f"Starting Assessly Platform API in {config.ENVIRONMENT} mode...")
    try:
        await db_manager.connect()
        logger.info("Database connection established")
        
        # Validate Stripe configuration
        validate_stripe_config()
        logger.info("Stripe configuration validated")
        
        logger.info(f"Frontend URL: {config.FRONTEND_URL}")
        logger.info(f"CORS Origins: {config.CORS_ORIGINS}")
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

# ===========================================
# Export for Deployment Platforms
# ===========================================

# For platforms expecting "backend" attribute (e.g., Render default)
backend = app

# ------------------------------
# Entry Point
# ------------------------------

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=config.PORT,
        reload=config.is_development,
        log_level="info",
        access_log=False if config.is_production else True,
        timeout_keep_alive=30,
        workers=4 if config.is_production else 1
    )
