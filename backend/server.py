# backend/server.py
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
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request, Query, Body, Header, Path
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, FileResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, validator
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from models import (
    UserModel as User,  # Alias for compatibility
    AssessmentModel as Assessment,
    CandidateModel as Candidate,
    SubscriptionModel as Subscription,
    OrganizationModel as Organization,
    ContactFormModel as ContactForm,
    DemoRequestModel as DemoRequest,
    OAuthStateModel as OAuthState,
    EmailVerificationTokenModel as EmailVerificationToken,
    PasswordResetTokenModel as PasswordResetToken,
    PlatformStatsModel as PlatformStats,
    UserSessionModel,
    TwoFactorSecretModel,
    APILogModel,
    CandidateResultsModel
)

from schemas import (
    UserCreate, UserLogin, UserUpdate, Token,
    ContactFormCreate, DemoRequestCreate,
    SubscriptionCreate, SubscriptionUpdate,
    OrganizationUpdate, AssessmentCreate, AssessmentUpdate,
    CandidateCreate, CandidateUpdate, QuestionUpdate,
    AssessmentSettings, AssessmentSettingsUpdate,
    DashboardStats, SuccessResponse, ErrorResponse, PaginatedResponse,
    PaymentIntent, PaymentIntentCreate, BillingHistory,
    Plan, TwoFactorSetup, SessionInfo, ResetPasswordRequest,
    AssessmentPublishRequest, AssessmentDuplicateRequest,
    CandidateResendInvite, CandidateResults,
    TwoFactorVerify, APIStatus
)
from auth_utils import (
    verify_password,
    get_password_hash,
    create_access_token,
    verify_token,
    create_refresh_token,
    verify_refresh_token,
    create_2fa_secret,
    verify_2fa_token
)
from email_service import (
    send_contact_notification,
    send_demo_request_notification,
    send_welcome_email,
    send_email_verification,
    send_password_reset_email,
    send_password_reset_confirmation,
    send_assessment_published_notification,
    send_candidate_invitation,
    send_candidate_results_notification,
    send_2fa_setup_email
)
from stripe_service import (
    get_or_create_stripe_customer,
    create_subscription,
    create_checkout_session,
    cancel_subscription,
    handle_webhook_event,
    validate_stripe_config,
    create_payment_intent,
    get_invoice_history,
    update_subscription,
    get_subscription_details
)

# ===========================================
# Configuration
# ===========================================

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
        "API_RATE_LIMIT": ("100/minute", "API rate limit"),
        "TWO_FACTOR_ENABLED": ("false", "Enable 2FA"),
        "MAX_SESSIONS_PER_USER": ("5", "Maximum concurrent sessions"),
        "SESSION_TIMEOUT_MINUTES": ("43200", "Session timeout in minutes (30 days)"),
        "API_RATE_LIMIT_PER_USER": ("1000/hour", "API rate limit per user"),
        "UPLOAD_MAX_SIZE_MB": ("10", "Maximum upload size in MB")
    }
    
    def __init__(self):
        self.validate_environment()
        self.load_config()
        self.start_time = datetime.utcnow()
    
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
        
        # 2FA and Sessions
        self.TWO_FACTOR_ENABLED = os.getenv("TWO_FACTOR_ENABLED", "false").lower() == "true"
        self.MAX_SESSIONS_PER_USER = int(os.getenv("MAX_SESSIONS_PER_USER", "5"))
        self.SESSION_TIMEOUT_MINUTES = int(os.getenv("SESSION_TIMEOUT_MINUTES", "43200"))
        self.API_RATE_LIMIT_PER_USER = os.getenv("API_RATE_LIMIT_PER_USER", "1000/hour")
        self.UPLOAD_MAX_SIZE_MB = int(os.getenv("UPLOAD_MAX_SIZE_MB", "10"))
        
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

# ===========================================
# Database Manager
# ===========================================

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
            await self.db.users.create_index([("two_factor_enabled", 1)])
            
            # Assessments collection indexes
            await self.db.assessments.create_index([("user_id", 1)])
            await self.db.assessments.create_index([("organization_id", 1)])
            await self.db.assessments.create_index([("status", 1)])
            await self.db.assessments.create_index([("created_at", -1)])
            await self.db.assessments.create_index([("is_published", 1)])
            
            # Candidates collection indexes
            await self.db.candidates.create_index([("assessment_id", 1)])
            await self.db.candidates.create_index([("email", 1)])
            await self.db.candidates.create_index([("status", 1)])
            await self.db.candidates.create_index([("user_id", 1)])
            await self.db.candidates.create_index([("invitation_token", 1)], unique=True, sparse=True)
            
            # Organizations collection indexes
            await self.db.organizations.create_index([("owner_id", 1)])
            await self.db.organizations.create_index([("slug", 1)], unique=True, sparse=True)
            
            # Subscriptions collection indexes
            await self.db.subscriptions.create_index([("user_id", 1)])
            await self.db.subscriptions.create_index([("status", 1)])
            await self.db.subscriptions.create_index([("stripe_subscription_id", 1)])
            
            # Contact forms collection indexes
            await self.db.contact_forms.create_index([("created_at", -1)])
            
            # Demo requests collection indexes
            await self.db.demo_requests.create_index([("created_at", -1)])
            
            # Password reset tokens collection indexes
            await self.db.password_reset_tokens.create_index([("token", 1)], unique=True)
            await self.db.password_reset_tokens.create_index([("expires_at", 1)], expireAfterSeconds=3600)  # 1 hour TTL
            
            # Email verification tokens collection indexes
            await self.db.email_verification_tokens.create_index([("token", 1)], unique=True)
            await self.db.email_verification_tokens.create_index([("expires_at", 1)], expireAfterSeconds=86400)  # 24 hours TTL
            
            # OAuth states collection indexes
            await self.db.oauth_states.create_index([("state", 1)], unique=True)
            await self.db.oauth_states.create_index([("created_at", 1)], expireAfterSeconds=300)  # 5 minutes TTL
            
            # NEW: User sessions collection indexes
            await self.db.user_sessions.create_index([("user_id", 1)])
            await self.db.user_sessions.create_index([("session_id", 1)], unique=True)
            await self.db.user_sessions.create_index([("expires_at", 1)], expireAfterSeconds=0)  # TTL based on expires_at
            
            # NEW: 2FA secrets collection indexes
            await self.db.two_factor_secrets.create_index([("user_id", 1)], unique=True)
            await self.db.two_factor_secrets.create_index([("created_at", 1)], expireAfterSeconds=300)  # 5 minutes TTL for unverified
            
            # NEW: Candidate results collection indexes
            await self.db.candidate_results.create_index([("candidate_id", 1)], unique=True)
            await self.db.candidate_results.create_index([("assessment_id", 1)])
            await self.db.candidate_results.create_index([("score", -1)])
            
            # NEW: API logs collection indexes
            await self.db.api_logs.create_index([("user_id", 1)])
            await self.db.api_logs.create_index([("endpoint", 1)])
            await self.db.api_logs.create_index([("created_at", -1)])
            await self.db.api_logs.create_index([("created_at", 1)], expireAfterSeconds=2592000)  # 30 days TTL
            
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.warning(f"Could not create indexes: {e}")
    
    async def disconnect(self):
        """Disconnect from MongoDB."""
        if self.client:
            self.client.close()
            logger.info("Disconnected from MongoDB")

db_manager = DatabaseManager()

# ===========================================
# Logging Configuration
# ===========================================

log_level = getattr(logging, config.LOG_LEVEL.upper(), logging.INFO)

# Build handlers list dynamically
handlers = [logging.StreamHandler(sys.stdout)]

if config.is_production:
    try:
        os.makedirs("/var/log/assessly", exist_ok=True)
        file_handler = logging.FileHandler("/var/log/assessly/app.log", encoding="utf-8")
        file_handler.setFormatter(logging.Formatter(
            "%(asctime)s | %(levelname)s | %(name)s | %(module)s:%(lineno)d | %(message)s",
            datefmt="%Y-%m-d %H:%M:%S"
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
logger.propagate = False

# ===========================================
# FastAPI App Configuration
# ===========================================

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
            "name": "Candidates",
            "description": "Candidate invitation and management"
        },
        {
            "name": "Subscriptions",
            "description": "Subscription and billing management"
        },
        {
            "name": "User Management",
            "description": "User profile and organization management"
        },
        {
            "name": "Public",
            "description": "Public endpoints"
        },
        {
            "name": "Security",
            "description": "Security and 2FA endpoints"
        },
        {
            "name": "System",
            "description": "System status and monitoring"
        }
    ]
)

# ===========================================
# Middleware
# ===========================================

# Security middleware
if config.is_production:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            "assesslyplatform.com",
            "api.assesslyplatform.com",
            "localhost",
            "127.0.0.1",
            config.FRONTEND_URL.replace("https://", "").replace("http://", "").split(":")[0],
            "assesslyplatformfrontend.onrender.com"  # Add your frontend domain
        ]
    )

# CORS middleware - FIXED: Add frontend URL directly
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local development
        "http://localhost:3000",  # Alternative local port
        "https://assesslyplatformfrontend.onrender.com",  # Your frontend
        config.FRONTEND_URL,  # From config if set
        *config.CORS_ORIGINS  # Any existing origins
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With", "X-API-Key", "X-CSRF-Token"],
    expose_headers=["X-Total-Count", "X-Error-Code", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-Request-ID"],
    max_age=600
)

# Compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# NEW: Request logging to database middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.utcnow()
    request_id = secrets.token_urlsafe(8)
    
    # Add request ID to headers
    request.headers.__dict__["_list"].append((b"x-request-id", request_id.encode()))
    
    # Skip logging for health checks, static files, and webhooks
    if request.url.path in ["/health", "/favicon.ico", "/api/health", "/api/status"] or \
       request.url.path.startswith("/api/webhooks/"):
        response = await call_next(request)
        return response
    
    # Get user ID if authenticated
    user_id = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.replace("Bearer ", "")
            payload = verify_token(token)
            if payload and "sub" in payload:
                user_id = payload["sub"]
        except:
            pass
    
    # Log request to database
    log_data = {
        "request_id": request_id,
        "user_id": user_id,
        "method": request.method,
        "endpoint": request.url.path,
        "query_params": str(request.query_params),
        "user_agent": request.headers.get("user-agent"),
        "ip_address": request.client.host if request.client else None,
        "created_at": datetime.utcnow()
    }
    
    try:
        if db_manager.db:
            await db_manager.db.api_logs.insert_one(log_data)
    except Exception as e:
        logger.error(f"Failed to log request to database: {e}")
    
    # Log to console
    logger.info(f"Request {request_id}: {request.method} {request.url.path} - User: {user_id or 'Anonymous'}")
    
    try:
        response = await call_next(request)
        process_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
        
        # Update log with response
        try:
            if db_manager.db:
                await db_manager.db.api_logs.update_one(
                    {"request_id": request_id},
                    {"$set": {
                        "status_code": response.status_code,
                        "response_time_ms": process_time,
                        "completed_at": datetime.utcnow()
                    }}
                )
        except Exception as e:
            logger.error(f"Failed to update request log: {e}")
        
        # Log response
        log_level = logging.WARNING if response.status_code >= 400 else logging.INFO
        logger.log(log_level, f"Response {request_id}: {request.method} {request.url.path} - Status: {response.status_code} - {process_time:.2f}ms")
        
        return response
    except Exception as e:
        logger.error(f"Request {request_id} failed: {request.method} {request.url.path} - Error: {e}", exc_info=True)
        raise

# ===========================================
# Authentication & Session Management
# ===========================================

security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session_id: Optional[str] = Header(None, alias="X-Session-ID")
) -> User:
    """Get current authenticated user with session validation."""
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
        
        user_id = payload["sub"]
        
        # Verify session if session_id is provided
        if session_id and db_manager.db:
            session = await db_manager.db.user_sessions.find_one({
                "user_id": user_id,
                "session_id": session_id,
                "expires_at": {"$gt": datetime.utcnow()}
            })
            if not session:
                raise HTTPException(status_code=401, detail="Invalid or expired session")
        
        user_data = await db_manager.db.users.find_one({"id": user_id})
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if 2FA is required
        if config.TWO_FACTOR_ENABLED and user_data.get("two_factor_enabled"):
            if not payload.get("2fa_verified"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Two-factor authentication required"
                )
        
        return User(**user_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

async def create_user_session(user_id: str, user_agent: str = None, ip_address: str = None) -> str:
    """Create a new user session."""
    if not db_manager.db:
        return None
    
    # Clean up expired sessions
    await db_manager.db.user_sessions.delete_many({
        "user_id": user_id,
        "expires_at": {"$lt": datetime.utcnow()}
    })
    
    # Check max sessions limit
    active_sessions = await db_manager.db.user_sessions.count_documents({
        "user_id": user_id,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if active_sessions >= config.MAX_SESSIONS_PER_USER:
        # Remove oldest session
        oldest_session = await db_manager.db.user_sessions.find_one(
            {"user_id": user_id},
            sort=[("created_at", 1)]
        )
        if oldest_session:
            await db_manager.db.user_sessions.delete_one({"_id": oldest_session["_id"]})
    
    # Create new session
    session_id = secrets.token_urlsafe(32)
    session_data = {
        "session_id": session_id,
        "user_id": user_id,
        "user_agent": user_agent,
        "ip_address": ip_address,
        "created_at": datetime.utcnow(),
        "last_activity": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(minutes=config.SESSION_TIMEOUT_MINUTES)
    }
    
    await db_manager.db.user_sessions.insert_one(session_data)
    return session_id

async def update_session_activity(session_id: str):
    """Update session last activity time."""
    if db_manager.db and session_id:
        await db_manager.db.user_sessions.update_one(
            {"session_id": session_id},
            {"$set": {
                "last_activity": datetime.utcnow(),
                "expires_at": datetime.utcnow() + timedelta(minutes=config.SESSION_TIMEOUT_MINUTES)
            }}
        )

async def terminate_session(session_id: str, user_id: str):
    """Terminate a specific session."""
    if db_manager.db:
        result = await db_manager.db.user_sessions.delete_one({
            "session_id": session_id,
            "user_id": user_id
        })
        return result.deleted_count > 0
    return False

async def terminate_all_sessions(user_id: str, exclude_session_id: str = None):
    """Terminate all sessions for a user (except optionally one)."""
    if db_manager.db:
        query = {"user_id": user_id}
        if exclude_session_id:
            query["session_id"] = {"$ne": exclude_session_id}
        result = await db_manager.db.user_sessions.delete_many(query)
        return result.deleted_count
    return 0

# ===========================================
# Helper Functions
# ===========================================

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

async def check_assessment_ownership(assessment_id: str, user_id: str) -> bool:
    """Check if assessment belongs to user."""
    try:
        assessment = await db_manager.db.assessments.find_one({
            "id": assessment_id,
            "user_id": user_id
        })
        return assessment is not None
    except:
        return False

async def check_candidate_ownership(candidate_id: str, user_id: str) -> bool:
    """Check if candidate belongs to user."""
    try:
        candidate = await db_manager.db.candidates.find_one({
            "id": candidate_id,
            "user_id": user_id
        })
        return candidate is not None
    except:
        return False

# ===========================================
# Custom Exception Handlers
# ===========================================

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

# ===========================================
# Health Check Endpoint
# ===========================================

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
    
    # Calculate uptime
    uptime = (datetime.utcnow() - config.start_time).total_seconds()
    
    return {
        "service": "Assessly Platform API",
        "status": "operational",
        "version": "1.0.0",
        "environment": config.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": uptime,
        "database": db_status,
        "stripe": stripe_status,
        "checks": {
            "database": db_status == "healthy",
            "stripe": stripe_status == "healthy"
        }
    }

# ===========================================
# API Router
# ===========================================

api_router = APIRouter(prefix="/api")

@api_router.get("/", tags=["API"])
async def api_root():
    """API root endpoint."""
    uptime = (datetime.utcnow() - config.start_time).total_seconds()
    
    return {
        "message": "Assessly Platform API",
        "version": "1.0.0",
        "environment": config.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": uptime,
        "documentation": "/api/docs" if config.is_development else None,
        "endpoints": {
            "authentication": [
                "/api/auth/register",
                "/api/auth/login",
                "/api/auth/me",
                "/api/auth/logout",
                "/api/auth/refresh",
                "/api/auth/google",
                "/api/auth/github",
                "/api/auth/verify-email",
                "/api/auth/forgot-password",
                "/api/auth/reset-password",
                "/api/auth/resend-verification"
            ],
            "security": [
                "/api/auth/2fa/setup",
                "/api/auth/2fa/verify",
                "/api/auth/2fa/disable",
                "/api/auth/sessions",
                "/api/auth/sessions/{session_id}"
            ],
            "assessments": [
                "/api/assessments",
                "/api/assessments/{id}",
                "/api/assessments/{id}/questions",
                "/api/assessments/{id}/questions/{question_id}",
                "/api/assessments/{id}/settings",
                "/api/assessments/{id}/publish",
                "/api/assessments/{id}/duplicate"
            ],
            "candidates": [
                "/api/candidates",
                "/api/candidates/{id}",
                "/api/candidates/{id}/resend",
                "/api/candidates/{id}/results"
            ],
            "subscriptions": [
                "/api/subscriptions/checkout",
                "/api/subscriptions/me",
                "/api/subscriptions/cancel",
                "/api/subscriptions/upgrade",
                "/api/plans"
            ],
            "billing": [
                "/api/payments/intent",
                "/api/billing/history"
            ],
            "user_management": [
                "/api/users/me",
                "/api/users/me/password",
                "/api/organizations/me",
                "/api/dashboard/stats"
            ],
            "public": [
                "/api/contact",
                "/api/demo",
                "/api/status",
                "/api/health"
            ],
            "webhooks": [
                "/api/webhooks/stripe"
            ]
        }
    }

# ===========================================
# NEW: System Status Endpoint
# ===========================================

@api_router.get("/status", response_model=APIStatus, tags=["System"])
async def api_status():
    """Get detailed API status."""
    try:
        # Check database connection
        await db_manager.client.admin.command('ping')
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    # Check Stripe configuration
    try:
        validate_stripe_config()
        stripe_status = "healthy"
    except Exception as e:
        stripe_status = f"unhealthy: {str(e)}"
    
    # Check email configuration
    email_status = "configured" if config.EMAIL_HOST else "not_configured"
    
    # Calculate uptime
    uptime = (datetime.utcnow() - config.start_time).total_seconds()
    
    # Get system stats
    try:
        user_count = await db_manager.db.users.count_documents({})
        assessment_count = await db_manager.db.assessments.count_documents({})
        candidate_count = await db_manager.db.candidates.count_documents({})
    except:
        user_count = assessment_count = candidate_count = 0
    
    return APIStatus(
        status="operational",
        version="1.0.0",
        uptime=uptime,
        dependencies={
            "database": db_status,
            "stripe": stripe_status,
            "email": email_status
        },
        stats={
            "users": user_count,
            "assessments": assessment_count,
            "candidates": candidate_count
        }
    )

# ===========================================
# Authentication Routes
# ===========================================

@api_router.post("/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED, tags=["Authentication"])
async def register(
    request: Request,  # FIXED: Non-default parameter comes first
    user_create: UserCreate = Body(...)
):
    """Register a new user."""
    try:
        # Check if user already exists
        existing_user = await db_manager.db.users.find_one({"email": user_create.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Verify reCAPTCHA if configured
        if user_create.recaptcha_token and not await verify_recaptcha(user_create.recaptcha_token):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="reCAPTCHA verification failed"
            )
        
        # Create user
        user_id = str(uuid.uuid4())
        hashed_password = get_password_hash(user_create.password)
        
        user_data = {
            "id": user_id,
            "email": user_create.email,
            "name": user_create.name,
            "hashed_password": hashed_password,
            "organization": user_create.organization,
            "is_verified": False,
            "two_factor_enabled": False,
            "plan": "free",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_login": None
        }
        
        await db_manager.db.users.insert_one(user_data)
        
        # Create organization if provided
        if user_create.organization:
            org_id = str(uuid.uuid4())
            org_data = {
                "id": org_id,
                "name": user_create.organization,
                "owner_id": user_id,
                "slug": user_create.organization.lower().replace(" ", "-"),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await db_manager.db.organizations.insert_one(org_data)
            
            # Update user with organization ID
            await db_manager.db.users.update_one(
                {"id": user_id},
                {"$set": {"organization_id": org_id}}
            )
        
        # Create free subscription
        subscription_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "plan_id": "free",
            "status": "active",
            "stripe_subscription_id": "free_plan",
            "current_period_start": datetime.utcnow(),
            "current_period_end": datetime.utcnow() + timedelta(days=30),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db_manager.db.subscriptions.insert_one(subscription_data)
        
        # Generate tokens
        access_token = create_access_token({"sub": user_id, "email": user_create.email})
        refresh_token = create_refresh_token({"sub": user_id})
        
        # Create session
        user_agent = request.headers.get("user-agent")
        ip_address = request.client.host if request.client else None
        session_id = await create_user_session(user_id, user_agent, ip_address)
        
        # Send welcome email
        try:
            await send_welcome_email(user_create.name, user_create.email)
        except Exception as e:
            logger.error(f"Failed to send welcome email: {e}")
        
        logger.info(f"New user registered: {user_create.email}")
        
        user = User(**user_data)
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=user,
            session_id=session_id,
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
async def login(
    request: Request,  # FIXED: Non-default parameter comes first
    credentials: UserLogin = Body(...)
):
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
        
        # Check if 2FA is enabled
        if config.TWO_FACTOR_ENABLED and user_data.get("two_factor_enabled"):
            # Generate 2FA verification token
            temp_token = create_access_token(
                {"sub": user.id, "email": user.email, "2fa_required": True},
                expires_delta=timedelta(minutes=15)
            )
            
            return Token(
                access_token=temp_token,
                token_type="bearer",
                user=user,
                requires_2fa=True,
                message="Two-factor authentication required"
            )
        
        # Generate regular tokens
        access_token = create_access_token({"sub": user.id, "email": user.email})
        refresh_token = create_refresh_token({"sub": user.id})
        
        # Create session
        user_agent = request.headers.get("user-agent")
        ip_address = request.client.host if request.client else None
        session_id = await create_user_session(user.id, user_agent, ip_address)
        
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
            session_id=session_id,
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
async def refresh_token_endpoint(refresh_token: str = Body(..., embed=True)):
    """Refresh access token using refresh token."""
    try:
        payload = verify_refresh_token(refresh_token)
        if not payload or "sub" not in payload:
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
        
        user_id = payload["sub"]
        
        # Check if user exists
        user_data = await db_manager.db.users.find_one({"id": user_id})
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Generate new tokens
        new_access_token = create_access_token({"sub": user_id, "email": user_data["email"]})
        new_refresh_token = create_refresh_token({"sub": user_id})
        
        user = User(**user_data)
        
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
            detail="Failed to refresh token"
        )

@api_router.get("/auth/me", response_model=User, tags=["Authentication"])
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return current_user

@api_router.post("/auth/logout", tags=["Authentication"])
async def logout(
    current_user: User = Depends(get_current_user),
    session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Logout user and terminate session."""
    try:
        if session_id:
            await terminate_session(session_id, current_user.id)
        else:
            # If no session ID, terminate all sessions
            await terminate_all_sessions(current_user.id)
        
        logger.info(f"User logged out: {current_user.email}")
        
        return {
            "message": "Successfully logged out",
            "redirect_url": f"{config.FRONTEND_URL}/login",
            "session_terminated": True
        }
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to logout"
        )
        

# ===========================================
# Two-Factor Authentication Endpoints
# ===========================================

@api_router.post("/auth/2fa/setup", response_model=TwoFactorSetup, tags=["Security"])
async def setup_2fa(current_user: User = Depends(get_current_user)):
    """Setup two-factor authentication."""
    try:
        if not config.TWO_FACTOR_ENABLED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Two-factor authentication is not enabled"
            )
        
        # Check if 2FA is already enabled
        user_data = await db_manager.db.users.find_one({"id": current_user.id})
        if user_data.get("two_factor_enabled"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Two-factor authentication is already enabled"
            )
        
        # Generate 2FA secret
        secret = create_2fa_secret()
        
        # Store secret temporarily (will be verified before enabling)
        await db_manager.db.two_factor_secrets.update_one(
            {"user_id": current_user.id},
            {"$set": {
                "secret": secret.base32,
                "backup_codes": secret.backup_codes,
                "created_at": datetime.utcnow()
            }},
            upsert=True
        )
        
        # Generate QR code URL
        qr_code_url = secret.qr_code_url(f"Assessly:{current_user.email}")
        
        # Send setup email
        try:
            await send_2fa_setup_email(current_user.name, current_user.email, secret.base32)
        except Exception as e:
            logger.error(f"Failed to send 2FA setup email: {e}")
        
        return TwoFactorSetup(
            secret=secret.base32,
            qr_code_url=qr_code_url,
            backup_codes=secret.backup_codes,
            message="Scan QR code with authenticator app"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"2FA setup error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to setup two-factor authentication"
        )

@api_router.post("/auth/2fa/verify", response_model=SuccessResponse, tags=["Security"])
async def verify_2fa_setup(
    verification: TwoFactorVerify = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Verify and enable two-factor authentication."""
    try:
        # Get stored secret
        secret_data = await db_manager.db.two_factor_secrets.find_one({"user_id": current_user.id})
        if not secret_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No pending 2FA setup found"
            )
        
        # Verify token
        if not verify_2fa_token(secret_data["secret"], verification.token):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token"
            )
        
        # Enable 2FA for user
        await db_manager.db.users.update_one(
            {"id": current_user.id},
            {"$set": {
                "two_factor_enabled": True,
                "two_factor_method": verification.method,
                "two_factor_secret": secret_data["secret"],
                "two_factor_backup_codes": secret_data["backup_codes"],
                "updated_at": datetime.utcnow()
            }}
        )
        
        # Remove temporary secret
        await db_manager.db.two_factor_secrets.delete_one({"user_id": current_user.id})
        
        # Terminate all existing sessions (security measure)
        await terminate_all_sessions(current_user.id)
        
        logger.info(f"2FA enabled for user: {current_user.email}")
        
        return SuccessResponse(
            message="Two-factor authentication enabled successfully",
            data={"backup_codes": secret_data["backup_codes"]}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"2FA verification error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify two-factor authentication"
        )

@api_router.post("/auth/2fa/disable", response_model=SuccessResponse, tags=["Security"])
async def disable_2fa(
    verification: TwoFactorVerify = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Disable two-factor authentication."""
    try:
        # Get user's 2FA secret
        user_data = await db_manager.db.users.find_one({"id": current_user.id})
        if not user_data.get("two_factor_enabled"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Two-factor authentication is not enabled"
            )
        
        # Verify token or backup code
        secret = user_data.get("two_factor_secret")
        backup_codes = user_data.get("two_factor_backup_codes", [])
        
        is_valid = False
        if verification.token in backup_codes:
            # Remove used backup code
            backup_codes.remove(verification.token)
            is_valid = True
        else:
            # Verify as TOTP token
            is_valid = verify_2fa_token(secret, verification.token)
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token or backup code"
            )
        
        # Disable 2FA
        await db_manager.db.users.update_one(
            {"id": current_user.id},
            {"$set": {
                "two_factor_enabled": False,
                "two_factor_method": None,
                "two_factor_secret": None,
                "two_factor_backup_codes": [],
                "updated_at": datetime.utcnow()
            }}
        )
        
        logger.info(f"2FA disabled for user: {current_user.email}")
        
        return SuccessResponse(message="Two-factor authentication disabled successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"2FA disable error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disable two-factor authentication"
        )

@api_router.post("/auth/2fa/login", response_model=Token, tags=["Security"])
async def verify_2fa_login(
    request: Request,  # FIXED: Non-default parameter comes first
    verification: TwoFactorVerify = Body(...)
):
    """Verify 2FA token after initial login."""
    try:
        # Get token from Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        temp_token = auth_header.replace("Bearer ", "")
        payload = verify_token(temp_token)
        
        if not payload or "sub" not in payload or not payload.get("2fa_required"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired 2FA verification token"
            )
        
        user_id = payload["sub"]
        
        # Get user and verify 2FA
        user_data = await db_manager.db.users.find_one({"id": user_id})
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not user_data.get("two_factor_enabled"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Two-factor authentication is not enabled"
            )
        
        # Verify token
        secret = user_data.get("two_factor_secret")
        if not verify_2fa_token(secret, verification.token):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token"
            )
        
        user = User(**user_data)
        
        # Generate final tokens with 2FA verification flag
        access_token = create_access_token({
            "sub": user.id,
            "email": user.email,
            "2fa_verified": True
        })
        refresh_token = create_refresh_token({"sub": user.id})
        
        # Create session
        user_agent = request.headers.get("user-agent")
        ip_address = request.client.host if request.client else None
        session_id = await create_user_session(user.id, user_agent, ip_address)
        
        # Update last login
        await db_manager.db.users.update_one(
            {"id": user.id},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
        logger.info(f"2FA login successful for user: {user.email}")
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=user,
            session_id=session_id,
            redirect_url=f"{config.FRONTEND_URL}/dashboard"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"2FA login error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Two-factor authentication failed"
        )
        

# ===========================================
# Session Management Endpoints
# ===========================================

@api_router.get("/auth/sessions", response_model=List[SessionInfo], tags=["Security"])
async def get_user_sessions(current_user: User = Depends(get_current_user)):
    """Get all active sessions for current user."""
    try:
        sessions = await db_manager.db.user_sessions.find({
            "user_id": current_user.id,
            "expires_at": {"$gt": datetime.utcnow()}
        }).sort("last_activity", -1).to_list(length=20)
        
        session_list = []
        for session in sessions:
            session_list.append(SessionInfo(
                session_id=session["session_id"],
                user_agent=session.get("user_agent"),
                ip_address=session.get("ip_address"),
                created_at=session["created_at"],
                last_activity=session["last_activity"],
                expires_at=session["expires_at"],
                is_current=False  # Would need current session ID to determine
            ))
        
        return session_list
        
    except Exception as e:
        logger.error(f"Get sessions error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve sessions"
        )

@api_router.delete("/auth/sessions/{session_id}", tags=["Security"])
async def terminate_user_session(
    session_id: str = Path(..., description="Session ID to terminate"),
    current_user: User = Depends(get_current_user)
):
    """Terminate a specific session."""
    try:
        success = await terminate_session(session_id, current_user.id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return SuccessResponse(message="Session terminated successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Terminate session error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to terminate session"
        )

@api_router.post("/auth/sessions/terminate-all", tags=["Security"])
async def terminate_all_user_sessions(
    current_user: User = Depends(get_current_user),
    session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Terminate all sessions except current one."""
    try:
        terminated_count = await terminate_all_sessions(current_user.id, session_id)
        
        return SuccessResponse(
            message=f"Terminated {terminated_count} session(s)",
            data={"terminated_count": terminated_count}
        )
        
    except Exception as e:
        logger.error(f"Terminate all sessions error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to terminate sessions"
        )

# ===========================================
# Email Verification Endpoints
# ===========================================

@api_router.post("/auth/verify-email", tags=["Authentication"])
async def verify_email(token: str = Body(..., embed=True)):
    """Verify user's email address using verification token"""
    try:
        # Verify token
        payload = verify_token(token)
        if not payload or "sub" not in payload:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired verification token"
            )
        
        user_id = payload["sub"]
        
        # Update user verification status
        result = await db_manager.db.users.update_one(
            {"id": user_id},
            {"$set": {"is_verified": True, "updated_at": datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=404,
                detail="User not found or already verified"
            )
        
        # Get user email for response
        user_data = await db_manager.db.users.find_one({"id": user_id})
        
        return {
            "message": "Email verified successfully",
            "user_email": user_data["email"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email verification error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to verify email"
        )

@api_router.post("/auth/resend-verification", tags=["Authentication"])
async def resend_verification(email: str = Body(..., embed=True)):
    """Resend verification email to user"""
    try:
        # Validate email
        if not email or "@" not in email:
            raise HTTPException(
                status_code=400,
                detail="Valid email address is required"
            )
        
        # Check if user exists
        user_data = await db_manager.db.users.find_one({"email": email})
        if not user_data:
            # Return success even if user doesn't exist (security best practice)
            return {
                "message": "If an account exists with this email, a verification email has been sent",
                "email": email
            }
        
        # Check if user is already verified
        if user_data.get("is_verified"):
            raise HTTPException(
                status_code=400,
                detail="User is already verified"
            )
        
        # Generate verification token
        verification_token = create_access_token(
            {"sub": user_data["id"], "email": email},
            expires_delta=timedelta(hours=24)
        )
        
        # Send verification email
        try:
            await send_email_verification(user_data["name"], email, verification_token)
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
        
        return {
            "message": "Verification email sent successfully",
            "email": email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resend verification error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to resend verification email"
        )

# ===========================================
# Password Reset Endpoints
# ===========================================

@api_router.post("/auth/forgot-password", tags=["Authentication"])
async def forgot_password(email: str = Body(..., embed=True)):
    """Initiate password reset process"""
    try:
        # Validate email
        if not email or "@" not in email:
            raise HTTPException(
                status_code=400,
                detail="Valid email address is required"
            )
        
        # Check if user exists
        user_data = await db_manager.db.users.find_one({"email": email})
        if not user_data:
            # Return success even if user doesn't exist (security best practice)
            return {
                "message": "If an account exists with this email, a password reset link has been sent",
                "email": email
            }
        
        # Generate password reset token
        reset_token = create_access_token(
            {"sub": user_data["id"], "email": email, "type": "password_reset"},
            expires_delta=timedelta(hours=1)
        )
        
        # Store reset token
        reset_token_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_data["id"],
            "token": reset_token,
            "expires_at": datetime.utcnow() + timedelta(hours=1),
            "created_at": datetime.utcnow()
        }
        await db_manager.db.password_reset_tokens.insert_one(reset_token_data)
        
        # Send password reset email
        try:
            await send_password_reset_email(user_data["name"], email, reset_token)
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
        
        return {
            "message": "If an account exists with this email, a password reset link has been sent",
            "email": email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to process password reset request"
        )

@api_router.post("/auth/reset-password", tags=["Authentication"])
async def reset_password(
    token: str = Body(..., embed=True),
    new_password: str = Body(..., embed=True)
):
    """Reset password using reset token"""
    try:
        # Validate inputs
        if not token:
            raise HTTPException(
                status_code=400,
                detail="Reset token is required"
            )
        
        if not new_password or len(new_password) < 8:
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 8 characters"
            )
        
        # Verify reset token
        payload = verify_token(token)
        if not payload or "sub" not in payload or payload.get("type") != "password_reset":
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired reset token"
            )
        
        user_id = payload["sub"]
        user_email = payload.get("email", "")
        
        # Check if token exists in database
        token_data = await db_manager.db.password_reset_tokens.find_one({
            "token": token,
            "user_id": user_id,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not token_data:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired reset token"
            )
        
        # Update user password
        new_hashed_password = get_password_hash(new_password)
        await db_manager.db.users.update_one(
            {"id": user_id},
            {"$set": {
                "hashed_password": new_hashed_password,
                "updated_at": datetime.utcnow(),
                "password_changed_at": datetime.utcnow()
            }}
        )
        
        # Delete used token
        await db_manager.db.password_reset_tokens.delete_one({"token": token})
        
        # Terminate all sessions (security measure)
        await terminate_all_sessions(user_id)
        
        # Send confirmation email
        try:
            await send_password_reset_confirmation(user_email)
        except Exception as e:
            logger.error(f"Failed to send password reset confirmation: {e}")
        
        return {
            "message": "Password reset successfully",
            "user_email": user_email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to reset password"
        )

# ===========================================
# Assessment Endpoints
# ===========================================

@api_router.get("/assessments", response_model=List[Assessment], tags=["Assessments"])
async def get_assessments(
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None)
):
    """Get all assessments for current user."""
    try:
        query = {"user_id": current_user.id}
        if status:
            query["status"] = status
        
        assessments = await db_manager.db.assessments.find(query).skip(skip).limit(limit).to_list(length=limit)
        
        return [Assessment(**assessment) for assessment in assessments]
        
    except Exception as e:
        logger.error(f"Get assessments error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve assessments"
        )

@api_router.post("/assessments", response_model=Assessment, status_code=status.HTTP_201_CREATED, tags=["Assessments"])
async def create_assessment(
    assessment_create: AssessmentCreate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Create a new assessment."""
    try:
        # Check assessment limit based on user's plan
        user_data = await db_manager.db.users.find_one({"id": current_user.id})
        plan = user_data.get("plan", "free")
        
        if plan == "free":
            assessment_count = await db_manager.db.assessments.count_documents({"user_id": current_user.id})
            if assessment_count >= 5:
                raise HTTPException(status_code=400, detail="Free plan limit reached (5 assessments)")
        
        # Create assessment
        assessment_id = str(uuid.uuid4())
        assessment_data = {
            "id": assessment_id,
            "user_id": current_user.id,
            "organization_id": current_user.organization_id,
            "title": assessment_create.title,
            "description": assessment_create.description,
            "status": "draft",
            "is_published": False,
            "settings": assessment_create.settings.dict() if assessment_create.settings else {},
            "questions": [],
            "candidate_count": 0,
            "completion_rate": 0.0,
            "average_time": 0.0,
            "average_score": 0.0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db_manager.db.assessments.insert_one(assessment_data)
        
        logger.info(f"Assessment created: {assessment_id} by user {current_user.id}")
        
        return Assessment(**assessment_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create assessment error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create assessment"
        )

@api_router.get("/assessments/{assessment_id}", response_model=Assessment, tags=["Assessments"])
async def get_assessment(
    assessment_id: str = Path(..., description="Assessment ID"),
    current_user: User = Depends(get_current_user)
):
    """Get a specific assessment."""
    try:
        assessment_data = await db_manager.db.assessments.find_one({
            "id": assessment_id,
            "user_id": current_user.id
        })
        
        if not assessment_data:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        return Assessment(**assessment_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get assessment error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve assessment"
        )

@api_router.put("/assessments/{assessment_id}", response_model=Assessment, tags=["Assessments"])
async def update_assessment(
    assessment_id: str = Path(..., description="Assessment ID"),
    assessment_update: AssessmentUpdate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Update an assessment."""
    try:
        # Check if assessment exists and belongs to user
        assessment_data = await db_manager.db.assessments.find_one({
            "id": assessment_id,
            "user_id": current_user.id
        })
        
        if not assessment_data:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Update assessment
        update_data = assessment_update.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        await db_manager.db.assessments.update_one(
            {"id": assessment_id},
            {"$set": update_data}
        )
        
        # Get updated assessment
        updated_assessment = await db_manager.db.assessments.find_one({"id": assessment_id})
        
        logger.info(f"Assessment updated: {assessment_id}")
        
        return Assessment(**updated_assessment)
        
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
    assessment_id: str = Path(..., description="Assessment ID"),
    current_user: User = Depends(get_current_user)
):
    """Delete an assessment."""
    try:
        # Check if assessment exists and belongs to user
        assessment_data = await db_manager.db.assessments.find_one({
            "id": assessment_id,
            "user_id": current_user.id
        })
        
        if not assessment_data:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Delete assessment
        await db_manager.db.assessments.delete_one({"id": assessment_id})
        
        # Delete associated candidates
        await db_manager.db.candidates.delete_many({"assessment_id": assessment_id})
        
        # Delete associated results
        await db_manager.db.candidate_results.delete_many({"assessment_id": assessment_id})
        
        logger.info(f"Assessment deleted: {assessment_id}")
        
        return SuccessResponse(message="Assessment deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete assessment error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete assessment"
        )

# ===========================================
# Assessment Question Delete Endpoint
# ===========================================

@api_router.delete("/assessments/{assessment_id}/questions/{question_id}", tags=["Assessments"])
async def delete_assessment_question(
    assessment_id: str = Path(..., description="Assessment ID"),
    question_id: str = Path(..., description="Question ID"),
    current_user: User = Depends(get_current_user)
):
    """Delete a question from an assessment."""
    try:
        # Get assessment
        assessment_data = await db_manager.db.assessments.find_one({
            "id": assessment_id,
            "user_id": current_user.id
        })
        if not assessment_data:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Find and remove the question
        questions = assessment_data.get("questions", [])
        original_count = len(questions)
        
        # Filter out the question to delete
        questions = [q for q in questions if q.get("id") != question_id]
        
        if len(questions) == original_count:
            raise HTTPException(status_code=404, detail="Question not found")
        
        # Update assessment
        await db_manager.db.assessments.update_one(
            {"id": assessment_id},
            {
                "$set": {
                    "questions": questions,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Question {question_id} deleted from assessment {assessment_id}")
        
        return SuccessResponse(message="Question deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete assessment question error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete question from assessment"
        )

# ===========================================
# Assessment Publish Endpoint
# ===========================================

@api_router.post("/assessments/{assessment_id}/publish", response_model=Assessment, tags=["Assessments"])
async def publish_assessment(
    assessment_id: str = Path(..., description="Assessment ID"),
    publish_request: AssessmentPublishRequest = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Publish or unpublish an assessment."""
    try:
        # Get assessment
        assessment_data = await db_manager.db.assessments.find_one({
            "id": assessment_id,
            "user_id": current_user.id
        })
        if not assessment_data:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Validate assessment has questions before publishing
        if publish_request.publish:
            questions = assessment_data.get("questions", [])
            if len(questions) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot publish assessment without questions"
                )
            
            # Validate all required fields
            required_fields = ["title", "description", "settings"]
            for field in required_fields:
                if not assessment_data.get(field):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Cannot publish assessment without {field}"
                    )
        
        # Update publish status
        update_data = {
            "is_published": publish_request.publish,
            "published_at": datetime.utcnow() if publish_request.publish else None,
            "updated_at": datetime.utcnow()
        }
        
        if publish_request.publish:
            update_data["status"] = "published"
            # Generate public URL for published assessments
            public_slug = f"{assessment_data.get('title', '').lower().replace(' ', '-')}-{assessment_id[:8]}"
            update_data["public_slug"] = public_slug
            update_data["public_url"] = f"{config.FRONTEND_URL}/assessment/{public_slug}"
        
        await db_manager.db.assessments.update_one(
            {"id": assessment_id},
            {"$set": update_data}
        )
        
        # Send notification if publishing
        if publish_request.publish:
            try:
                await send_assessment_published_notification(
                    current_user.name,
                    current_user.email,
                    assessment_data.get("title"),
                    update_data["public_url"]
                )
            except Exception as e:
                logger.error(f"Failed to send publish notification: {e}")
        
        logger.info(f"Assessment {assessment_id} {'published' if publish_request.publish else 'unpublished'}")
        
        # Get updated assessment
        updated_assessment = await db_manager.db.assessments.find_one({"id": assessment_id})
        updated_assessment["id"] = str(updated_assessment["_id"]) if "_id" in updated_assessment else updated_assessment.get("id", assessment_id)
        if "_id" in updated_assessment:
            del updated_assessment["_id"]
        
        return Assessment(**updated_assessment)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Publish assessment error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to publish assessment"
        )

# ===========================================
# Assessment Duplicate Endpoint
# ===========================================

@api_router.post("/assessments/{assessment_id}/duplicate", response_model=Assessment, tags=["Assessments"])
async def duplicate_assessment(
    assessment_id: str = Path(..., description="Assessment ID"),
    duplicate_request: AssessmentDuplicateRequest = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Duplicate an assessment."""
    try:
        # Get original assessment
        original_assessment = await db_manager.db.assessments.find_one({
            "id": assessment_id,
            "user_id": current_user.id
        })
        if not original_assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Check assessment limit based on user's plan
        user_data = await db_manager.db.users.find_one({"id": current_user.id})
        plan = user_data.get("plan", "free")
        
        if plan == "free":
            assessment_count = await db_manager.db.assessments.count_documents({"user_id": current_user.id})
            if assessment_count >= 5:
                raise HTTPException(status_code=400, detail="Free plan limit reached (5 assessments)")
        
        # Create duplicate assessment
        new_assessment_id = str(uuid.uuid4())
        new_assessment = original_assessment.copy()
        
        # Update fields for new assessment
        new_assessment["id"] = new_assessment_id
        new_assessment["title"] = duplicate_request.name
        new_assessment["status"] = "draft"
        new_assessment["is_published"] = False
        new_assessment["published_at"] = None
        new_assessment["public_slug"] = None
        new_assessment["public_url"] = None
        new_assessment["candidate_count"] = 0
        new_assessment["completion_rate"] = 0.0
        new_assessment["average_time"] = 0.0
        new_assessment["average_score"] = 0.0
        new_assessment["created_at"] = datetime.utcnow()
        new_assessment["updated_at"] = datetime.utcnow()
        
        # Remove _id field if present
        if "_id" in new_assessment:
            del new_assessment["_id"]
        
        # Update question IDs in the duplicate
        for question in new_assessment.get("questions", []):
            question["id"] = str(uuid.uuid4())
            question["created_at"] = datetime.utcnow()
            question["updated_at"] = datetime.utcnow()
        
        # Insert duplicate assessment
        await db_manager.db.assessments.insert_one(new_assessment)
        
        # Duplicate candidates if requested
        if duplicate_request.copy_candidates:
            original_candidates = await db_manager.db.candidates.find({
                "assessment_id": assessment_id,
                "user_id": current_user.id
            }).to_list(length=1000)
            
            for candidate in original_candidates:
                new_candidate = candidate.copy()
                new_candidate["id"] = str(uuid.uuid4())
                new_candidate["assessment_id"] = new_assessment_id
                new_candidate["status"] = "invited"  # Reset status
                new_candidate["invitation_token"] = str(uuid.uuid4())
                new_candidate["invited_at"] = datetime.utcnow()
                new_candidate["started_at"] = None
                new_candidate["completed_at"] = None
                new_candidate["score"] = None
                new_candidate["created_at"] = datetime.utcnow()
                new_candidate["updated_at"] = datetime.utcnow()
                
                if "_id" in new_candidate:
                    del new_candidate["_id"]
                
                await db_manager.db.candidates.insert_one(new_candidate)
        
        logger.info(f"Assessment duplicated: {assessment_id} -> {new_assessment_id}")
        
        return Assessment(**new_assessment)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Duplicate assessment error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to duplicate assessment"
        )

# ===========================================
# Candidate Endpoints
# ===========================================

@api_router.get("/candidates", response_model=List[Candidate], tags=["Candidates"])
async def get_candidates(
    current_user: User = Depends(get_current_user),
    assessment_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None)
):
    """Get all candidates for current user."""
    try:
        query = {"user_id": current_user.id}
        if assessment_id:
            query["assessment_id"] = assessment_id
        if status:
            query["status"] = status
        
        candidates = await db_manager.db.candidates.find(query).skip(skip).limit(limit).to_list(length=limit)
        
        return [Candidate(**candidate) for candidate in candidates]
        
    except Exception as e:
        logger.error(f"Get candidates error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve candidates"
        )

@api_router.post("/candidates", response_model=Candidate, status_code=status.HTTP_201_CREATED, tags=["Candidates"])
async def create_candidate(
    candidate_create: CandidateCreate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Create a new candidate."""
    try:
        # Check if assessment belongs to user
        assessment = await db_manager.db.assessments.find_one({
            "id": candidate_create.assessment_id,
            "user_id": current_user.id
        })
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Check candidate limit based on user's plan
        user_data = await db_manager.db.users.find_one({"id": current_user.id})
        plan = user_data.get("plan", "free")
        
        if plan == "free":
            # Count candidates for this month
            start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            candidate_count = await db_manager.db.candidates.count_documents({
                "user_id": current_user.id,
                "created_at": {"$gte": start_of_month}
            })
            if candidate_count >= 50:
                raise HTTPException(status_code=400, detail="Free plan limit reached (50 candidates per month)")
        
        # Create candidate
        candidate_id = str(uuid.uuid4())
        candidate_data = {
            "id": candidate_id,
            "user_id": current_user.id,
            "assessment_id": candidate_create.assessment_id,
            "name": candidate_create.name,
            "email": candidate_create.email,
            "status": "invited",
            "invitation_token": str(uuid.uuid4()),
            "invited_at": datetime.utcnow(),
            "started_at": None,
            "completed_at": None,
            "score": None,
            "time_spent": 0,
            "answers": [],
            "feedback": candidate_create.feedback,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db_manager.db.candidates.insert_one(candidate_data)
        
        # Update assessment candidate count
        await db_manager.db.assessments.update_one(
            {"id": candidate_create.assessment_id},
            {"$inc": {"candidate_count": 1}}
        )
        
        # Send invitation email
        try:
            assessment_url = f"{config.FRONTEND_URL}/assessment/{candidate_data['invitation_token']}"
            await send_candidate_invitation(
                candidate_name=candidate_create.name,
                candidate_email=candidate_create.email,
                assessment_name=assessment.get("title", "Assessment"),
                inviter_name=current_user.name,
                assessment_url=assessment_url,
                custom_message=candidate_create.message
            )
        except Exception as e:
            logger.error(f"Failed to send candidate invitation: {e}")
        
        logger.info(f"Candidate created: {candidate_id} for assessment {candidate_create.assessment_id}")
        
        return Candidate(**candidate_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create candidate error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create candidate"
        )

@api_router.get("/candidates/{candidate_id}", response_model=Candidate, tags=["Candidates"])
async def get_candidate(
    candidate_id: str = Path(..., description="Candidate ID"),
    current_user: User = Depends(get_current_user)
):
    """Get a specific candidate."""
    try:
        candidate_data = await db_manager.db.candidates.find_one({
            "id": candidate_id,
            "user_id": current_user.id
        })
        
        if not candidate_data:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        return Candidate(**candidate_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get candidate error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve candidate"
        )

@api_router.put("/candidates/{candidate_id}", response_model=Candidate, tags=["Candidates"])
async def update_candidate(
    candidate_id: str = Path(..., description="Candidate ID"),
    candidate_update: CandidateUpdate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Update a candidate."""
    try:
        # Check if candidate exists and belongs to user
        candidate_data = await db_manager.db.candidates.find_one({
            "id": candidate_id,
            "user_id": current_user.id
        })
        
        if not candidate_data:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Update candidate
        update_data = candidate_update.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        await db_manager.db.candidates.update_one(
            {"id": candidate_id},
            {"$set": update_data}
        )
        
        # Get updated candidate
        updated_candidate = await db_manager.db.candidates.find_one({"id": candidate_id})
        
        logger.info(f"Candidate updated: {candidate_id}")
        
        return Candidate(**updated_candidate)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update candidate error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update candidate"
        )

@api_router.delete("/candidates/{candidate_id}", tags=["Candidates"])
async def delete_candidate(
    candidate_id: str = Path(..., description="Candidate ID"),
    current_user: User = Depends(get_current_user)
):
    """Delete a candidate."""
    try:
        # Check if candidate exists and belongs to user
        candidate_data = await db_manager.db.candidates.find_one({
            "id": candidate_id,
            "user_id": current_user.id
        })
        
        if not candidate_data:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Delete candidate
        await db_manager.db.candidates.delete_one({"id": candidate_id})
        
        # Update assessment candidate count
        await db_manager.db.assessments.update_one(
            {"id": candidate_data["assessment_id"]},
            {"$inc": {"candidate_count": -1}}
        )
        
        # Delete associated results
        await db_manager.db.candidate_results.delete_one({"candidate_id": candidate_id})
        
        logger.info(f"Candidate deleted: {candidate_id}")
        
        return SuccessResponse(message="Candidate deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete candidate error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete candidate"
        )

# ===========================================
# Candidate Resend Invitation Endpoint
# ===========================================

@api_router.post("/candidates/{candidate_id}/resend", tags=["Candidates"])
async def resend_candidate_invitation(
    candidate_id: str = Path(..., description="Candidate ID"),
    resend_request: CandidateResendInvite = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Resend invitation to a candidate."""
    try:
        # Get candidate
        candidate_data = await db_manager.db.candidates.find_one({
            "id": candidate_id,
            "user_id": current_user.id
        })
        if not candidate_data:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Check if candidate has already completed
        if candidate_data.get("status") == "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot resend invitation to completed candidate"
            )
        
        # Get assessment details
        assessment_data = await db_manager.db.assessments.find_one({
            "id": candidate_data.get("assessment_id")
        })
        
        if not assessment_data:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Generate new invitation token
        new_token = str(uuid.uuid4())
        
        # Update candidate with new token
        await db_manager.db.candidates.update_one(
            {"id": candidate_id},
            {"$set": {
                "invitation_token": new_token,
                "invited_at": datetime.utcnow(),
                "status": "invited",
                "updated_at": datetime.utcnow()
            }}
        )
        
        # Send invitation email
        try:
            assessment_url = f"{config.FRONTEND_URL}/assessment/{new_token}"
            await send_candidate_invitation(
                candidate_name=candidate_data.get("name", "Candidate"),
                candidate_email=candidate_data["email"],
                assessment_name=assessment_data.get("title", "Assessment"),
                inviter_name=current_user.name,
                assessment_url=assessment_url,
                custom_message=resend_request.message
            )
        except Exception as e:
            logger.error(f"Failed to send candidate invitation: {e}")
        
        logger.info(f"Invitation resent to candidate: {candidate_data['email']}")
        
        return SuccessResponse(
            message="Invitation resent successfully",
            data={
                "candidate_id": candidate_id,
                "email": candidate_data["email"],
                "invited_at": datetime.utcnow().isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resend invitation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend invitation"
        )

# ===========================================
# Candidate Results Endpoint
# ===========================================

@api_router.get("/candidates/{candidate_id}/results", response_model=CandidateResults, tags=["Candidates"])
async def get_candidate_results(
    candidate_id: str = Path(..., description="Candidate ID"),
    current_user: User = Depends(get_current_user)
):
    """Get candidate assessment results."""
    try:
        # Get candidate
        candidate_data = await db_manager.db.candidates.find_one({
            "id": candidate_id,
            "user_id": current_user.id
        })
        if not candidate_data:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Check if candidate has completed
        if candidate_data.get("status") != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Candidate has not completed the assessment"
            )
        
        # Get assessment
        assessment_data = await db_manager.db.assessments.find_one({
            "id": candidate_data.get("assessment_id")
        })
        
        # Get detailed results from results collection
        result_data = await db_manager.db.candidate_results.find_one({
            "candidate_id": candidate_id
        })
        
        if not result_data:
            # Create basic results from candidate data
            result_data = {
                "candidate_id": candidate_id,
                "assessment_id": candidate_data.get("assessment_id"),
                "score": candidate_data.get("score", 0),
                "total_questions": len(assessment_data.get("questions", [])) if assessment_data else 0,
                "correct_answers": 0,
                "time_spent": candidate_data.get("time_spent", 0),
                "started_at": candidate_data.get("started_at"),
                "completed_at": candidate_data.get("completed_at"),
                "answers": [],
                "created_at": datetime.utcnow()
            }
        
        # Calculate additional metrics
        total_questions = result_data.get("total_questions", 0)
        correct_answers = result_data.get("correct_answers", 0)
        score_percentage = (correct_answers / total_questions * 100) if total_questions > 0 else 0
        
        # Format response
        return CandidateResults(
            candidate_id=candidate_id,
            assessment_id=candidate_data.get("assessment_id"),
            candidate_name=candidate_data.get("name"),
            candidate_email=candidate_data["email"],
            assessment_title=assessment_data.get("title") if assessment_data else "Unknown",
            score=result_data.get("score", 0),
            score_percentage=score_percentage,
            total_questions=total_questions,
            correct_answers=correct_answers,
            time_spent=result_data.get("time_spent", 0),
            started_at=result_data.get("started_at"),
            completed_at=result_data.get("completed_at"),
            answers=result_data.get("answers", []),
            feedback=candidate_data.get("feedback"),
            created_at=result_data.get("created_at")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get candidate results error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve candidate results"
        )

@api_router.post("/candidates/{candidate_id}/results/notify", tags=["Candidates"])
async def notify_candidate_results(
    candidate_id: str = Path(..., description="Candidate ID"),
    current_user: User = Depends(get_current_user)
):
    """Send results notification to candidate."""
    try:
        # Get candidate
        candidate_data = await db_manager.db.candidates.find_one({
            "id": candidate_id,
            "user_id": current_user.id
        })
        if not candidate_data:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Check if candidate has completed
        if candidate_data.get("status") != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Candidate has not completed the assessment"
            )
        
        # Get assessment
        assessment_data = await db_manager.db.assessments.find_one({
            "id": candidate_data.get("assessment_id")
        })
        
        # Get results
        result_data = await get_candidate_results(candidate_id, current_user)
        
        # Send results notification
        try:
            await send_candidate_results_notification(
                candidate_name=candidate_data.get("name", "Candidate"),
                candidate_email=candidate_data["email"],
                assessment_name=assessment_data.get("title", "Assessment"),
                score=result_data.score,
                score_percentage=result_data.score_percentage,
                total_questions=result_data.total_questions,
                correct_answers=result_data.correct_answers,
                feedback=candidate_data.get("feedback")
            )
        except Exception as e:
            logger.error(f"Failed to send results notification: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send results notification"
            )
        
        logger.info(f"Results notification sent to candidate: {candidate_data['email']}")
        
        return SuccessResponse(message="Results notification sent successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Notify candidate results error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send results notification"
        )

# ===========================================
# Subscription Endpoints
# ===========================================

@api_router.get("/plans", response_model=List[Plan], tags=["Subscriptions"])
async def get_plans():
    """Get all available subscription plans."""
    try:
        from stripe_service import get_available_plans
        plans_data = get_available_plans()
        
        plans = []
        for plan_id, plan_config in plans_data.items():
            plans.append(Plan(
                id=plan_id,
                name=plan_config["name"],
                price=plan_config["price"],
                currency=plan_config["currency"],
                interval=plan_config["interval"],
                features=plan_config["features"],
                limits=plan_config["limits"]
            ))
        
        return plans
        
    except Exception as e:
        logger.error(f"Get plans error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve plans"
        )

@api_router.post("/subscriptions/checkout", tags=["Subscriptions"])
async def create_checkout_session_endpoint(
    payload: dict = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Create a checkout session for subscription."""
    try:
        plan_id = payload.get("plan_id")
        if not plan_id:
            raise HTTPException(status_code=400, detail="Plan ID is required")
        
        success_url = f"{config.FRONTEND_URL}/dashboard?checkout=success&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{config.FRONTEND_URL}/pricing?checkout=cancelled"
        
        # Get or create Stripe customer
        customer_id = await get_or_create_stripe_customer(
            user_id=current_user.id,
            email=current_user.email,
            name=current_user.name,
            organization=current_user.organization
        )
        
        # Create checkout session
        session_data = await create_checkout_session(
            plan_id=plan_id,
            success_url=success_url,
            cancel_url=cancel_url,
            customer_id=customer_id,
            email=current_user.email,
            user_id=current_user.id,
            trial_days=7
        )
        
        if not session_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create checkout session"
            )
        
        if session_data.get("type") == "error":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=session_data.get("message", "Checkout session creation failed")
            )
        
        logger.info(f"Checkout session created for user {current_user.id} for plan {plan_id}")
        
        return session_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create checkout session error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checkout session"
        )

@api_router.get("/subscriptions/me", tags=["Subscriptions"])
async def get_user_subscription(
    current_user: User = Depends(get_current_user)
):
    """Get current user's subscription."""
    try:
        subscription_data = await db_manager.db.subscriptions.find_one(
            {"user_id": current_user.id, "status": "active"},
            sort=[("created_at", -1)]
        )
        
        if not subscription_data:
            # Return free plan as default
            return {
                "plan_id": "free",
                "status": "active",
                "current_period_start": datetime.utcnow(),
                "current_period_end": datetime.utcnow() + timedelta(days=30),
                "is_free": True
            }
        
        # Get subscription details from Stripe if available
        stripe_subscription_id = subscription_data.get("stripe_subscription_id")
        if stripe_subscription_id and stripe_subscription_id != "free_plan":
            stripe_details = await get_subscription_details(stripe_subscription_id)
            if stripe_details:
                subscription_data.update(stripe_details)
        
        return subscription_data
        
    except Exception as e:
        logger.error(f"Get subscription error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve subscription"
        )

@api_router.post("/subscriptions/cancel", tags=["Subscriptions"])
async def cancel_subscription_endpoint(
    current_user: User = Depends(get_current_user)
):
    """Cancel current subscription."""
    try:
        subscription_data = await db_manager.db.subscriptions.find_one(
            {"user_id": current_user.id, "status": "active"},
            sort=[("created_at", -1)]
        )
        
        if not subscription_data:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        stripe_subscription_id = subscription_data.get("stripe_subscription_id")
        
        # Cancel subscription
        success = await cancel_subscription(stripe_subscription_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to cancel subscription"
            )
        
        # Update local database
        await db_manager.db.subscriptions.update_one(
            {"user_id": current_user.id, "status": "active"},
            {"$set": {
                "status": "cancelled",
                "cancelled_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        # Update user plan
        await db_manager.db.users.update_one(
            {"id": current_user.id},
            {"$set": {"plan": "free", "updated_at": datetime.utcnow()}}
        )
        
        logger.info(f"Subscription cancelled for user: {current_user.id}")
        
        return SuccessResponse(message="Subscription cancelled successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cancel subscription error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription"
        )

# ===========================================
# Subscription Upgrade Endpoint
# ===========================================

@api_router.post("/subscriptions/upgrade", tags=["Subscriptions"])
async def upgrade_subscription(
    payload: dict = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Upgrade subscription to a higher plan."""
    try:
        plan_id = payload.get("plan_id")
        if not plan_id:
            raise HTTPException(status_code=400, detail="Plan ID is required")
        
        # Validate plan
        valid_plans = ["basic", "professional", "enterprise"]
        if plan_id not in valid_plans:
            raise HTTPException(status_code=400, detail="Invalid plan")
        
        # Get current subscription
        subscription_data = await db_manager.db.subscriptions.find_one(
            {"user_id": current_user.id, "status": "active"},
            sort=[("created_at", -1)]
        )
        
        if not subscription_data:
            # No active subscription, use checkout
            return await create_checkout_session_endpoint(payload, current_user)
        
        current_plan = subscription_data.get("plan_id", "free")
        
        # Define plan hierarchy
        plan_hierarchy = {"free": 0, "basic": 1, "professional": 2, "enterprise": 3}
        
        # Check if it's actually an upgrade
        if plan_hierarchy.get(plan_id, 0) <= plan_hierarchy.get(current_plan, 0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot upgrade to {plan_id} from {current_plan}"
            )
        
        # For Stripe subscriptions, we need to update via Stripe
        stripe_subscription_id = subscription_data.get("stripe_subscription_id")
        
        if stripe_subscription_id and stripe_subscription_id != "free_plan":
            # Update subscription via Stripe
            success = await update_subscription(stripe_subscription_id, plan_id)
            
            if success:
                # Update local database
                await db_manager.db.subscriptions.update_one(
                    {"stripe_subscription_id": stripe_subscription_id},
                    {"$set": {
                        "plan_id": plan_id,
                        "updated_at": datetime.utcnow()
                    }}
                )
                
                # Update user plan
                await db_manager.db.users.update_one(
                    {"id": current_user.id},
                    {"$set": {"plan": plan_id, "updated_at": datetime.utcnow()}}
                )
                
                logger.info(f"Subscription upgraded: {current_user.id} -> {plan_id}")
                
                return {
                    "success": True,
                    "message": f"Successfully upgraded to {plan_id} plan",
                    "plan": plan_id,
                    "redirect_url": f"{config.FRONTEND_URL}/dashboard?plan={plan_id}"
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to upgrade subscription with payment provider"
                )
        else:
            # Free plan or non-Stripe subscription, use checkout
            return await create_checkout_session_endpoint(payload, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upgrade subscription error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upgrade subscription"
        )

# ===========================================
# Payment Intent Endpoint
# ===========================================

@api_router.post("/payments/intent", response_model=PaymentIntent, tags=["Subscriptions"])
async def create_payment_intent_endpoint(
    payload: PaymentIntentCreate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Create a payment intent for one-time payments."""
    try:
        # Validate amount
        if payload.amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than 0")
        
        if payload.amount > 1000000:  # $10,000 limit
            raise HTTPException(status_code=400, detail="Amount exceeds maximum limit")
        
        # Get or create Stripe customer
        customer_id = await get_or_create_stripe_customer(
            user_id=current_user.id,
            email=current_user.email,
            name=current_user.name,
            organization=current_user.organization
        )
        
        if not customer_id:
            # Try to get existing customer
            user_data = await db_manager.db.users.find_one({"id": current_user.id})
            customer_id = user_data.get("stripe_customer_id")
            
            if not customer_id:
                raise HTTPException(
                    status_code=500, 
                    detail="Failed to create customer account"
                )
        
        # Create payment intent
        intent_data = await create_payment_intent(
            amount=payload.amount,
            currency=payload.currency,
            customer_id=customer_id,
            description=payload.description
        )
        
        if not intent_data:
            raise HTTPException(
                status_code=500, 
                detail="Failed to create payment intent"
            )
        
        logger.info(f"Payment intent created: {intent_data.get('id')} for user {current_user.id}")
        
        return PaymentIntent(
            client_secret=intent_data.get("client_secret"),
            id=intent_data.get("id"),
            amount=intent_data.get("amount"),
            currency=intent_data.get("currency"),
            status=intent_data.get("status"),
            customer_id=customer_id,
            description=payload.description
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create payment intent error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payment intent"
        )

# ===========================================
# Billing History Endpoint
# ===========================================

@api_router.get("/billing/history", response_model=BillingHistory, tags=["Subscriptions"])
async def get_billing_history_endpoint(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    """Get user's billing history with pagination."""
    try:
        # Get user's Stripe customer ID
        user_data = await db_manager.db.users.find_one({"id": current_user.id})
        stripe_customer_id = user_data.get("stripe_customer_id")
        
        invoices = []
        total = 0
        
        if stripe_customer_id:
            # Get invoices from Stripe
            stripe_invoices = await get_invoice_history(stripe_customer_id, limit, offset)
            invoices = stripe_invoices.get("invoices", [])
            total = stripe_invoices.get("total", 0)
        else:
            # Fallback to local subscription records
            subscriptions = await db_manager.db.subscriptions.find(
                {"user_id": current_user.id}
            ).sort("created_at", -1).skip(offset).limit(limit).to_list(length=limit)
            
            for sub in subscriptions:
                if sub.get("stripe_subscription_id") and sub.get("stripe_subscription_id") != "free_plan":
                    invoices.append({
                        "id": sub.get("stripe_subscription_id", f"inv_{secrets.token_urlsafe(8)}"),
                        "number": f"INV-{str(sub.get('_id'))[-8:].upper()}",
                        "amount": sub.get("amount", 0),
                        "currency": sub.get("currency", "usd"),
                        "status": "paid" if sub.get("status") == "active" else sub.get("status", "pending"),
                        "created": sub.get("created_at", datetime.utcnow()),
                        "period_start": sub.get("current_period_start"),
                        "period_end": sub.get("current_period_end"),
                        "description": f"{sub.get('plan_id', 'Unknown').title()} Plan",
                        "invoice_pdf": None,
                        "receipt_url": None
                    })
            
            total = await db_manager.db.subscriptions.count_documents({"user_id": current_user.id})
        
        return BillingHistory(
            invoices=invoices,
            total=total,
            limit=limit,
            offset=offset,
            has_more=(offset + limit) < total
        )
        
    except Exception as e:
        logger.error(f"Get billing history error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve billing history"
        )

# ===========================================
# User Management Endpoints
# ===========================================

@api_router.put("/users/me", response_model=User, tags=["User Management"])
async def update_user_profile(
    user_update: UserUpdate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile."""
    try:
        update_data = user_update.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        await db_manager.db.users.update_one(
            {"id": current_user.id},
            {"$set": update_data}
        )
        
        # Get updated user
        updated_user = await db_manager.db.users.find_one({"id": current_user.id})
        
        logger.info(f"User profile updated: {current_user.id}")
        
        return User(**updated_user)
        
    except Exception as e:
        logger.error(f"Update user profile error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user profile"
        )

@api_router.put("/users/me/password", tags=["User Management"])
async def update_user_password_endpoint(
    payload: dict = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Update current user's password."""
    try:
        current_password = payload.get("current_password")
        new_password = payload.get("new_password")
        
        if not current_password or not new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current and new passwords are required"
            )
        
        if len(new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 8 characters"
            )
        
        # Verify current password
        user_data = await db_manager.db.users.find_one({"id": current_user.id})
        if not verify_password(current_password, user_data.get("hashed_password", "")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Check if new password is same as current
        if verify_password(new_password, user_data.get("hashed_password", "")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password cannot be the same as current password"
            )
        
        # Update password
        new_hashed_password = get_password_hash(new_password)
        await db_manager.db.users.update_one(
            {"id": current_user.id},
            {"$set": {
                "hashed_password": new_hashed_password,
                "updated_at": datetime.utcnow(),
                "password_changed_at": datetime.utcnow()
            }}
        )
        
        # Terminate all sessions (security measure)
        await terminate_all_sessions(current_user.id)
        
        logger.info(f"User password updated: {current_user.id}")
        
        return SuccessResponse(
            message="Password updated successfully",
            data={
                "password_changed_at": datetime.utcnow().isoformat(),
                "session_terminated": True,
                "redirect_url": f"{config.FRONTEND_URL}/login"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update password error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password"
        )

@api_router.get("/organizations/me", response_model=Organization, tags=["User Management"])
async def get_user_organization(
    current_user: User = Depends(get_current_user)
):
    """Get current user's organization."""
    try:
        if not current_user.organization_id:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        org_data = await db_manager.db.organizations.find_one({"id": current_user.organization_id})
        
        if not org_data:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        return Organization(**org_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get organization error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve organization"
        )

@api_router.put("/organizations/me", response_model=Organization, tags=["User Management"])
async def update_user_organization(
    org_update: OrganizationUpdate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Update current user's organization."""
    try:
        if not current_user.organization_id:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Check if user owns the organization
        org_data = await db_manager.db.organizations.find_one({
            "id": current_user.organization_id,
            "owner_id": current_user.id
        })
        
        if not org_data:
            raise HTTPException(status_code=403, detail="Not authorized to update this organization")
        
        update_data = org_update.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        # If name is being updated, also update slug
        if "name" in update_data:
            update_data["slug"] = update_data["name"].lower().replace(" ", "-")
        
        await db_manager.db.organizations.update_one(
            {"id": current_user.organization_id},
            {"$set": update_data}
        )
        
        # Get updated organization
        updated_org = await db_manager.db.organizations.find_one({"id": current_user.organization_id})
        
        logger.info(f"Organization updated: {current_user.organization_id}")
        
        return Organization(**updated_org)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update organization error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update organization"
        )

@api_router.get("/dashboard/stats", response_model=DashboardStats, tags=["User Management"])
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user)
):
    """Get dashboard statistics for current user."""
    try:
        # Get counts
        assessment_count = await db_manager.db.assessments.count_documents({"user_id": current_user.id})
        candidate_count = await db_manager.db.candidates.count_documents({"user_id": current_user.id})
        
        # Get completed candidates count
        completed_candidates = await db_manager.db.candidates.count_documents({
            "user_id": current_user.id,
            "status": "completed"
        })
        
        # Calculate completion rate
        completion_rate = (completed_candidates / candidate_count * 100) if candidate_count > 0 else 0
        
        # Get recent assessments
        recent_assessments = await db_manager.db.assessments.find(
            {"user_id": current_user.id}
        ).sort("updated_at", -1).limit(5).to_list(length=5)
        
        # Get recent candidates
        recent_candidates = await db_manager.db.candidates.find(
            {"user_id": current_user.id}
        ).sort("updated_at", -1).limit(10).to_list(length=10)
        
        return DashboardStats(
            assessment_count=assessment_count,
            candidate_count=candidate_count,
            completed_candidates=completed_candidates,
            completion_rate=completion_rate,
            recent_assessments=recent_assessments,
            recent_candidates=recent_candidates
        )
        
    except Exception as e:
        logger.error(f"Get dashboard stats error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard statistics"
        )

# ===========================================
# Public Endpoints
# ===========================================

@api_router.post("/contact", tags=["Public"])
async def submit_contact_form(
    contact_form: ContactFormCreate = Body(...)
):
    """Submit a contact form."""
    try:
        # Verify reCAPTCHA if configured
        if contact_form.recaptcha_token and not await verify_recaptcha(contact_form.recaptcha_token):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="reCAPTCHA verification failed"
            )
        
        # Create contact form entry
        contact_id = str(uuid.uuid4())
        contact_data = {
            "id": contact_id,
            "name": contact_form.name,
            "email": contact_form.email,
            "subject": contact_form.subject,
            "message": contact_form.message,
            "created_at": datetime.utcnow()
        }
        
        await db_manager.db.contact_forms.insert_one(contact_data)
        
        # Send notification email
        try:
            await send_contact_notification(
                contact_form.name,
                contact_form.email,
                contact_form.subject,
                contact_form.message
            )
        except Exception as e:
            logger.error(f"Failed to send contact notification: {e}")
        
        logger.info(f"Contact form submitted: {contact_form.email}")
        
        return SuccessResponse(message="Thank you for your message. We'll get back to you soon!")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Contact form error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit contact form"
        )

@api_router.post("/demo", tags=["Public"])
async def submit_demo_request(
    demo_request: DemoRequestCreate = Body(...)
):
    """Submit a demo request."""
    try:
        # Verify reCAPTCHA if configured
        if demo_request.recaptcha_token and not await verify_recaptcha(demo_request.recaptcha_token):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="reCAPTCHA verification failed"
            )
        
        # Create demo request entry
        demo_id = str(uuid.uuid4())
        demo_data = {
            "id": demo_id,
            "name": demo_request.name,
            "email": demo_request.email,
            "company": demo_request.company,
            "role": demo_request.role,
            "company_size": demo_request.company_size,
            "message": demo_request.message,
            "preferred_date": demo_request.preferred_date,
            "preferred_time": demo_request.preferred_time,
            "created_at": datetime.utcnow()
        }
        
        await db_manager.db.demo_requests.insert_one(demo_data)
        
        # Send notification email
        try:
            await send_demo_request_notification(
                demo_request.name,
                demo_request.email,
                demo_request.company,
                demo_request.role,
                demo_request.company_size,
                demo_request.message,
                demo_request.preferred_date,
                demo_request.preferred_time
            )
        except Exception as e:
            logger.error(f"Failed to send demo request notification: {e}")
        
        logger.info(f"Demo request submitted: {demo_request.email}")
        
        return SuccessResponse(message="Thank you for your demo request. We'll contact you soon to schedule!")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Demo request error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit demo request"
        )

# ===========================================
# Webhook Endpoints
# ===========================================

@api_router.post("/webhooks/stripe", tags=["Webhooks"])
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")
        
        if not sig_header:
            raise HTTPException(status_code=400, detail="Missing stripe-signature header")
        
        # Handle webhook event
        event = await handle_webhook_event(payload, sig_header)
        
        if not event:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
        
        # Process event based on type
        event_type = event.get("type")
        
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
        elif event_type == "customer.created":
            await handle_customer_created(event)
        elif event_type == "customer.updated":
            await handle_customer_updated(event)
        elif event_type == "customer.deleted":
            await handle_customer_deleted(event)
        
        return {"received": True, "event_type": event_type}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed"
        )

# ===========================================
# Root Redirect
# ===========================================

@app.get("/", include_in_schema=False)
async def root_redirect():
    """Redirect root to API documentation."""
    return RedirectResponse(url="/api/")

# ===========================================
# Include Router
# ===========================================

app.include_router(api_router)

# ===========================================
# Startup/Shutdown Events
# ===========================================

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
        
        # Log configuration
        logger.info(f"Frontend URL: {config.FRONTEND_URL}")
        logger.info(f"CORS Origins: {config.CORS_ORIGINS}")
        logger.info(f"2FA Enabled: {config.TWO_FACTOR_ENABLED}")
        logger.info(f"Max Sessions Per User: {config.MAX_SESSIONS_PER_USER}")
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

backend = app

# ===========================================
# Entry Point
# ===========================================

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
