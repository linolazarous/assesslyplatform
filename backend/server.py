# backend/server.py

# ===========================================
# Standard Library Imports
# ===========================================
import os
import sys
import json
import uuid
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from urllib.parse import urlencode

# ===========================================
# Third-Party Libraries
# ===========================================
import httpx
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

# ===========================================
# FastAPI Core
# ===========================================
from fastapi import (
    FastAPI,
    APIRouter,
    HTTPException,
    Depends,
    Request,
    Response,
    status,
    Query,
    Body,
    Header,
    Path,
)

# ===========================================
# FastAPI Responses
# ===========================================
from fastapi.responses import (
    JSONResponse,
    RedirectResponse,
    PlainTextResponse,
    FileResponse,
)

# ===========================================
# FastAPI Security & Middleware
# ===========================================
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError

# ===========================================
# Starlette Middleware
# ===========================================
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

# ===========================================
# Pydantic
# ===========================================
from pydantic import BaseModel, Field, ConfigDict

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response: Response = await call_next(request)

        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' https://www.googletagmanager.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob:; "
            "connect-src 'self' https://assesslyplatform-pfm1.onrender.com; "
            "frame-ancestors 'none';"
        )

        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        return response
        
# Import database models with clear names
from models import (
    UserModel,
    AssessmentModel,
    CandidateModel,
    SubscriptionModel,
    OrganizationModel,
    ContactFormModel,
    DemoRequestModel,
    OAuthStateModel,
    EmailVerificationTokenModel,
    PasswordResetTokenModel,
    PlatformStatsModel,
    UserSessionModel,
    TwoFactorSecretModel,
    APILogModel,
    CandidateResultsModel
)

# Import API schemas
from schemas import (
    User, UserCreate, UserLogin, UserUpdate, Token,
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
    verify_2fa_token,
    generate_2fa_qr_code
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

handlers = [logging.StreamHandler(sys.stdout)]

if config.is_production:
    try:
        os.makedirs("/var/log/assessly", exist_ok=True)
        file_handler = logging.FileHandler(
            "/var/log/assessly/app.log", encoding="utf-8"
        )
        file_handler.setFormatter(logging.Formatter(
            "%(asctime)s | %(levelname)s | %(name)s | %(module)s:%(lineno)d | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        ))
        handlers.append(file_handler)
    except Exception as e:
        print(f"Warning: File logging disabled: {e}")

logging.basicConfig(
    level=log_level,
    handlers=handlers,
    format="%(asctime)s | %(levelname)s | %(name)s | %(module)s:%(lineno)d | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

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
)

# ===========================================
# Middleware Configuration (PRODUCTION SAFE)
# ===========================================

# 1️⃣ Trusted Host Middleware (FIRST)
allowed_hosts = {
    "assesslyplatform.com",
    "api.assesslyplatform.com",
    "assesslyplatform-pfm1.onrender.com",
    "assesslyplatformfrontend.onrender.com",
}

frontend_url = getattr(config, "FRONTEND_URL", None)
if isinstance(frontend_url, str) and frontend_url.strip():
    frontend_host = (
        frontend_url.replace("https://", "")
        .replace("http://", "")
        .split("/")[0]
        .split(":")[0]
    )
    if frontend_host not in {"*", "...", ""}:
        allowed_hosts.add(frontend_host)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=list(allowed_hosts),
)

# 2️⃣ CORS Middleware
cors_origins = set()

if isinstance(config.FRONTEND_URL, str) and config.FRONTEND_URL.strip():
    cors_origins.add(config.FRONTEND_URL)

cors_origins.add("https://assesslyplatformfrontend.onrender.com")

if isinstance(config.CORS_ORIGINS, (list, tuple, set)):
    for origin in config.CORS_ORIGINS:
        if isinstance(origin, str) and origin.startswith("http"):
            cors_origins.add(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(cors_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "User-Agent",
        "Referer",
        "X-Requested-With",
        "X-API-Key",
        "X-CSRF-Token",
        "X-Session-ID",
    ],
    expose_headers=[
        "Authorization",
        "X-Total-Count",
        "X-Error-Code",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-Request-ID",
    ],
    max_age=86400,
)

# 3️⃣ Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' https://www.googletagmanager.com; "
            "connect-src 'self' https://assesslyplatform-pfm1.onrender.com https://www.googletagmanager.com https://api.stripe.com; "
            "img-src 'self' data: blob: https:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )

        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains; preload"
        )
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )

        return response

app.add_middleware(SecurityHeadersMiddleware)

# 4️⃣ Compression Middleware (LAST)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# -------------------------
# Root & Infrastructure Routes
# -------------------------

@app.head("/")
async def head_root():
    return Response(status_code=200)

@app.get("/")
async def root():
    return RedirectResponse(url="/api", status_code=307)

@app.get("/favicon.ico")
async def favicon():
    return Response(status_code=204)

@app.get("/robots.txt")
async def robots():
    return PlainTextResponse(
        "User-agent: *\n"
        "Disallow: /api/\n"
        "Allow: /health\n"
)
    
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

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint with system status."""
    try:
        # Check database connection
        await db_manager.client.admin.command("ping")
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
        "status": "operational" if db_status == "healthy" else "degraded",
        "version": "1.0.0",
        "environment": config.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": uptime,
        "dependencies": {
            "database": db_status,
            "stripe": stripe_status,
        },
        "checks": {
            "database": db_status == "healthy",
            "stripe": stripe_status == "healthy",
        },
        }
    

# ===========================================
# API Router
# ===========================================

api_router = APIRouter(prefix="/api", tags=["API"])


# ===========================================
# API Root
# ===========================================

@api_router.get("/", tags=["System"])
async def api_root():
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
                "/api/auth/refresh",
                "/api/auth/me",
                "/api/auth/logout",
            ],
            "system": ["/api/status", "/health"],
        },
    }


# ===========================================
# System Status Endpoint (ADMIN ONLY)
# ===========================================

@api_router.get(
    "/status",
    response_model=APIStatus,
    tags=["System"],
    dependencies=[Depends(get_current_admin_user)],
)
async def api_status():
    try:
        await db_manager.client.admin.command("ping")
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    try:
        validate_stripe_config()
        stripe_status = "healthy"
    except Exception as e:
        stripe_status = f"unhealthy: {str(e)}"

    email_status = "configured" if config.EMAIL_HOST else "not_configured"
    uptime = (datetime.utcnow() - config.start_time).total_seconds()

    try:
        user_count = await db_manager.db.users.count_documents({})
        assessment_count = await db_manager.db.assessments.count_documents({})
        candidate_count = await db_manager.db.candidates.count_documents({})
    except Exception:
        user_count = assessment_count = candidate_count = 0

    return APIStatus(
        status="operational",
        version="1.0.0",
        uptime=uptime,
        dependencies={
            "database": db_status,
            "stripe": stripe_status,
            "email": email_status,
        },
        stats={
            "users": user_count,
            "assessments": assessment_count,
            "candidates": candidate_count,
        },
    )


# ===========================================
# Authentication Routes
# ===========================================

@api_router.post(
    "/auth/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    tags=["Authentication"],
)
async def register(request: Request, user_create: UserCreate = Body(...)):
    email = user_create.email.strip().lower()

    if await db_manager.db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="User with this email already exists")

    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_create.password)

    user_data = {
        "id": user_id,
        "email": email,
        "name": user_create.name,
        "hashed_password": hashed_password,
        "organization": user_create.organization,
        "is_verified": False,
        "two_factor_enabled": False,
        "plan": "free",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "last_login": None,
    }

    await db_manager.db.users.insert_one(user_data)

    access_token = create_access_token({"sub": user_id, "email": email})
    refresh_token = create_refresh_token({"sub": user_id})

    session_id = await create_user_session(
        user_id,
        request.headers.get("user-agent"),
        request.client.host if request.client else None,
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=User(**user_data),
        session_id=session_id,
        redirect_url=f"{config.FRONTEND_URL}/dashboard",
    )


@api_router.post("/auth/login", response_model=Token, tags=["Authentication"])
async def login(request: Request, credentials: UserLogin = Body(...)):
    user_data = await db_manager.db.users.find_one(
        {"email": credentials.email.lower()}
    )

    if not user_data or not verify_password(
        credentials.password, user_data.get("hashed_password", "")
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user_data.get("is_verified"):
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before logging in",
        )

    user = User(**user_data)

    if config.TWO_FACTOR_ENABLED and user_data.get("two_factor_enabled"):
        temp_token = create_access_token(
            {"sub": user.id, "email": user.email, "2fa_required": True},
            expires_delta=timedelta(minutes=15),
        )
        return Token(
            access_token=temp_token,
            token_type="bearer",
            user=user,
            requires_2fa=True,
            message="Two-factor authentication required",
        )

    access_token = create_access_token({"sub": user.id, "email": user.email})
    refresh_token = create_refresh_token({"sub": user.id})

    session_id = await create_user_session(
        user.id,
        request.headers.get("user-agent"),
        request.client.host if request.client else None,
    )

    await db_manager.db.users.update_one(
        {"id": user.id},
        {"$set": {"last_login": datetime.utcnow()}},
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user,
        session_id=session_id,
        redirect_url=f"{config.FRONTEND_URL}/dashboard",
    )


@api_router.post("/auth/refresh", response_model=Token, tags=["Authentication"])
async def refresh_token_endpoint(refresh_token: str = Body(..., embed=True)):
    payload = verify_refresh_token(refresh_token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_data = await db_manager.db.users.find_one({"id": payload["sub"]})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    return Token(
        access_token=create_access_token(
            {"sub": user_data["id"], "email": user_data["email"]}
        ),
        refresh_token=create_refresh_token({"sub": user_data["id"]}),
        token_type="bearer",
        user=User(**user_data),
    )


@api_router.get("/auth/me", response_model=User, tags=["Authentication"])
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    return current_user


@api_router.post("/auth/logout", tags=["Authentication"])
async def logout(
    current_user: User = Depends(get_current_user),
    session_id: Optional[str] = Header(None, alias="X-Session-ID"),
):
    if session_id:
        await terminate_session(session_id, current_user.id)
    else:
        await terminate_all_sessions(current_user.id)

    return {
        "message": "Successfully logged out",
        "redirect_url": f"{config.FRONTEND_URL}/login",
    }


# ===========================================
# REGISTER ROUTER (ONCE, AT THE END)
# ===========================================

app.include_router(api_router)
        

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

        # Email must be verified first
        user_data = await db_manager.db.users.find_one({"id": current_user.id})
        if not user_data.get("is_verified"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Verify your email before enabling two-factor authentication"
            )

        if user_data.get("two_factor_enabled"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Two-factor authentication is already enabled"
            )

        # Generate secret + backup codes
        secret_data = create_2fa_secret()

        await db_manager.db.two_factor_secrets.update_one(
            {"user_id": current_user.id},
            {"$set": {
                "secret": secret_data["secret"],
                "backup_codes": secret_data["backup_codes"],
                "created_at": datetime.utcnow()
            }},
            upsert=True
        )

        qr_code_url = generate_2fa_qr_code(
            secret_data["secret"],
            current_user.email
        )

        return TwoFactorSetup(
            secret=secret_data["secret"],
            qr_code_url=qr_code_url,
            backup_codes=secret_data["backup_codes"],
            message="Scan the QR code using your authenticator app"
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
        secret_data = await db_manager.db.two_factor_secrets.find_one(
            {"user_id": current_user.id}
        )

        if not secret_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No pending 2FA setup found"
            )

        if not verify_2fa_token(secret_data["secret"], verification.token):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token"
            )

        await db_manager.db.users.update_one(
            {"id": current_user.id},
            {"$set": {
                "two_factor_enabled": True,
                "two_factor_secret": secret_data["secret"],
                "two_factor_backup_codes": secret_data["backup_codes"],
                "updated_at": datetime.utcnow()
            }}
        )

        await db_manager.db.two_factor_secrets.delete_one(
            {"user_id": current_user.id}
        )

        # Kill existing sessions after enabling 2FA
        await terminate_all_sessions(current_user.id)

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
        user_data = await db_manager.db.users.find_one(
            {"id": current_user.id}
        )

        if not user_data.get("two_factor_enabled"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Two-factor authentication is not enabled"
            )

        secret = user_data.get("two_factor_secret")
        backup_codes = user_data.get("two_factor_backup_codes", [])

        valid = False
        if verification.token in backup_codes:
            backup_codes.remove(verification.token)
            valid = True
        else:
            valid = verify_2fa_token(secret, verification.token)

        if not valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token"
            )

        await db_manager.db.users.update_one(
            {"id": current_user.id},
            {"$set": {
                "two_factor_enabled": False,
                "two_factor_secret": None,
                "two_factor_backup_codes": [],
                "updated_at": datetime.utcnow()
            }}
        )

        return SuccessResponse(
            message="Two-factor authentication disabled successfully"
        )

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
    request: Request,
    verification: TwoFactorVerify = Body(...)
):
    """Verify 2FA token after initial login."""
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )

        payload = verify_token(auth_header.replace("Bearer ", ""))

        if not payload or not payload.get("2fa_required"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired 2FA session"
            )

        user_id = payload["sub"]
        user_data = await db_manager.db.users.find_one({"id": user_id})

        if not user_data or not user_data.get("is_verified"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not verified"
            )

        if not verify_2fa_token(
            user_data["two_factor_secret"],
            verification.token
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid 2FA token"
            )

        user = User(**user_data)

        access_token = create_access_token({
            "sub": user.id,
            "email": user.email,
            "2fa_verified": True
        })
        refresh_token = create_refresh_token({"sub": user.id})

        session_id = await create_user_session(
            user.id,
            request.headers.get("user-agent"),
            request.client.host if request.client else None
        )

        await db_manager.db.users.update_one(
            {"id": user.id},
            {"$set": {"last_login": datetime.utcnow()}}
        )

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
# Security Models
# ===========================================

class TwoFactorVerify(BaseModel):
    token: str


class TwoFactorSetup(BaseModel):
    secret: str
    qr_code_url: str
    backup_codes: List[str]
    message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
        

# ===========================================
# Session Management Endpoints
# ===========================================

@api_router.get("/auth/sessions", response_model=List[SessionInfo], tags=["Security"])
async def get_user_sessions(
    current_user: User = Depends(get_current_user),
    current_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Get all active sessions for current user."""
    try:
        sessions = await db_manager.db.user_sessions.find({
            "user_id": current_user.id,
            "expires_at": {"$gt": datetime.utcnow()}
        }).sort("last_activity", -1).to_list(length=50)

        results = []
        for session in sessions:
            device_info = session.get("device_info") or {}
            if isinstance(device_info, str):
                try:
                    device_info = json.loads(device_info)
                except Exception:
                    device_info = {"raw": device_info}

            results.append(SessionInfo(
                session_id=session["session_id"],
                user_agent=session.get("user_agent", "Unknown"),
                ip_address=session.get("ip_address", "Unknown"),
                created_at=session["created_at"],
                last_activity=session["last_activity"],
                expires_at=session["expires_at"],
                is_current=session["session_id"] == current_session_id,
                device_info=device_info,
                location=session.get("location")
            ))

        return results

    except Exception as e:
        logger.error(f"Get sessions error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve sessions"
        )


@api_router.delete("/auth/sessions/{target_session_id}", tags=["Security"])
async def terminate_user_session(
    target_session_id: str = Path(..., min_length=32, max_length=64),
    current_user: User = Depends(get_current_user)
):
    """Terminate a specific session."""
    try:
        if not await terminate_session(target_session_id, current_user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        return SuccessResponse(
            message="Session terminated successfully",
            data={"session_id": target_session_id}
        )

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
    current_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Terminate all sessions except current."""
    try:
        count = await terminate_all_sessions(
            user_id=current_user.id,
            exclude_session_id=current_session_id
        )

        return SuccessResponse(
            message=f"Terminated {count} session(s)",
            data={"terminated_count": count}
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
    """Verify email address."""
    try:
        payload = verify_token(token)
        if not payload or payload.get("type") != "email_verification":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token"
            )

        user_id = payload["sub"]

        user = await db_manager.db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.get("is_verified"):
            return {"message": "Email already verified"}

        await db_manager.db.users.update_one(
            {"id": user_id},
            {"$set": {"is_verified": True, "updated_at": datetime.utcnow()}}
        )

        return {
            "message": "Email verified successfully",
            "email": user["email"]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email verification error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to verify email"
        )


@api_router.post("/auth/resend-verification", tags=["Authentication"])
async def resend_verification(email: str = Body(..., embed=True)):
    """Resend email verification."""
    try:
        email = email.strip().lower()
        user = await db_manager.db.users.find_one({"email": email})

        if not user or user.get("is_verified"):
            return {
                "message": "If an account exists, a verification email has been sent"
            }

        token = create_access_token(
            {"sub": user["id"], "type": "email_verification"},
            expires_delta=timedelta(hours=24)
        )

        await send_email_verification(user["name"], email, token)

        return {"message": "Verification email sent"}

    except Exception as e:
        logger.error(f"Resend verification error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to resend verification email"
        )


# ===========================================
# Password Reset Endpoints
# ===========================================

@api_router.post("/auth/forgot-password", tags=["Authentication"])
async def forgot_password(email: str = Body(..., embed=True)):
    """Request password reset."""
    try:
        email = email.strip().lower()
        user = await db_manager.db.users.find_one({"email": email})

        if user:
            token = create_access_token(
                {"sub": user["id"], "type": "password_reset"},
                expires_delta=timedelta(hours=1)
            )

            await db_manager.db.password_reset_tokens.insert_one({
                "token": token,
                "user_id": user["id"],
                "expires_at": datetime.utcnow() + timedelta(hours=1),
                "created_at": datetime.utcnow()
            })

            await send_password_reset_email(user["name"], email, token)

        return {
            "message": "If an account exists, a password reset email has been sent"
        }

    except Exception as e:
        logger.error(f"Forgot password error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to process password reset"
        )


@api_router.post("/auth/reset-password", tags=["Authentication"])
async def reset_password(
    token: str = Body(..., embed=True),
    new_password: str = Body(..., embed=True)
):
    """Reset password."""
    try:
        if len(new_password) < 8:
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 8 characters"
            )

        payload = verify_token(token)
        if not payload or payload.get("type") != "password_reset":
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired reset token"
            )

        user_id = payload["sub"]

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

        await db_manager.db.users.update_one(
            {"id": user_id},
            {"$set": {
                "hashed_password": get_password_hash(new_password),
                "password_changed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )

        await db_manager.db.password_reset_tokens.delete_one({"token": token})
        await terminate_all_sessions(user_id)

        return {"message": "Password reset successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to reset password"
            )
        

# ===========================================
# Assessment Endpoints
# ===========================================

@api_router.get(
    "/assessments",
    response_model=List["Assessment"],
    tags=["Assessments"]
)
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

        assessments = await db_manager.db.assessments.find(query)\
            .skip(skip).limit(limit).to_list(length=limit)

        return [Assessment(**assessment) for assessment in assessments]

    except Exception as e:
        logger.error(f"Get assessments error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve assessments"
        )


@api_router.post(
    "/assessments",
    response_model="Assessment",
    status_code=status.HTTP_201_CREATED,
    tags=["Assessments"]
)
async def create_assessment(
    assessment_create: AssessmentCreate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Create a new assessment."""
    try:
        user_data = await db_manager.db.users.find_one({"id": current_user.id})
        plan = user_data.get("plan", "free")

        if plan == "free":
            count = await db_manager.db.assessments.count_documents(
                {"user_id": current_user.id}
            )
            if count >= 5:
                raise HTTPException(
                    status_code=400,
                    detail="Free plan limit reached (5 assessments)"
                )

        assessment_id = str(uuid.uuid4())
        assessment_data = {
            "id": assessment_id,
            "user_id": current_user.id,
            "organization_id": current_user.organization_id,
            "title": assessment_create.title,
            "description": assessment_create.description,
            "status": "draft",
            "is_published": False,
            "settings": assessment_create.settings.dict()
            if assessment_create.settings else {},
            "questions": [],
            "candidate_count": 0,
            "completion_rate": 0.0,
            "average_time": 0.0,
            "average_score": 0.0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        await db_manager.db.assessments.insert_one(assessment_data)

        return Assessment(**assessment_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create assessment error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create assessment"
        )


@api_router.get(
    "/assessments/{assessment_id}",
    response_model="Assessment",
    tags=["Assessments"]
)
async def get_assessment(
    assessment_id: str = Path(..., description="Assessment ID"),
    current_user: User = Depends(get_current_user)
):
    """Get a specific assessment."""
    assessment_data = await db_manager.db.assessments.find_one({
        "id": assessment_id,
        "user_id": current_user.id
    })

    if not assessment_data:
        raise HTTPException(status_code=404, detail="Assessment not found")

    return Assessment(**assessment_data)


@api_router.put(
    "/assessments/{assessment_id}",
    response_model="Assessment",
    tags=["Assessments"]
)
async def update_assessment(
    assessment_id: str = Path(..., description="Assessment ID"),
    assessment_update: AssessmentUpdate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Update an assessment."""
    assessment_data = await db_manager.db.assessments.find_one({
        "id": assessment_id,
        "user_id": current_user.id
    })

    if not assessment_data:
        raise HTTPException(status_code=404, detail="Assessment not found")

    update_data = assessment_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()

    await db_manager.db.assessments.update_one(
        {"id": assessment_id},
        {"$set": update_data}
    )

    updated = await db_manager.db.assessments.find_one({"id": assessment_id})
    return Assessment(**updated)
    

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

@api_router.post(
    "/assessments/{assessment_id}/publish",
    response_model="Assessment",
    tags=["Assessments"]
)
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

        # Validate assessment before publishing
        if publish_request.publish:
            questions = assessment_data.get("questions", [])
            if not questions:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot publish assessment without questions"
                )

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
            public_slug = f"{assessment_data.get('title', '').lower().replace(' ', '-')}-{assessment_id[:8]}"
            update_data["public_slug"] = public_slug
            update_data["public_url"] = f"{config.FRONTEND_URL}/assessment/{public_slug}"

        await db_manager.db.assessments.update_one(
            {"id": assessment_id},
            {"$set": update_data}
        )

        # Optional notification
        if publish_request.publish:
            try:
                await send_assessment_published_notification(
                    current_user.name,
                    current_user.email,
                    assessment_data.get("title"),
                    update_data["public_url"]
                )
            except Exception as e:
                logger.warning(f"Publish notification failed: {e}")

        logger.info(
            f"Assessment {assessment_id} "
            f"{'published' if publish_request.publish else 'unpublished'}"
        )

        # Fetch updated assessment
        updated_assessment = await db_manager.db.assessments.find_one(
            {"id": assessment_id}
        )

        if "_id" in updated_assessment:
            updated_assessment["id"] = str(updated_assessment["_id"])
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

@api_router.post(
    "/assessments/{assessment_id}/duplicate",
    response_model="Assessment",
    tags=["Assessments"]
)
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
            assessment_count = await db_manager.db.assessments.count_documents({
                "user_id": current_user.id
            })
            if assessment_count >= 5:
                raise HTTPException(
                    status_code=400,
                    detail="Free plan limit reached (5 assessments)"
                )
        
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
        
        # Remove Mongo _id
        new_assessment.pop("_id", None)
        
        # Update question IDs
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
                new_candidate["status"] = "invited"
                new_candidate["invitation_token"] = str(uuid.uuid4())
                new_candidate["invited_at"] = datetime.utcnow()
                new_candidate["started_at"] = None
                new_candidate["completed_at"] = None
                new_candidate["score"] = None
                new_candidate["created_at"] = datetime.utcnow()
                new_candidate["updated_at"] = datetime.utcnow()
                
                new_candidate.pop("_id", None)
                
                await db_manager.db.candidates.insert_one(new_candidate)
        
        logger.info(f"Assessment duplicated: {assessment_id} → {new_assessment_id}")
        
        return Assessment(**new_assessment)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Duplicate assessment error", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to duplicate assessment"
            )
        

# ===========================================
# Candidate Endpoints
# ===========================================

@api_router.get(
    "/candidates",
    response_model=List["Candidate"],
    tags=["Candidates"]
)
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
        
        candidates = (
            await db_manager.db.candidates
            .find(query)
            .skip(skip)
            .limit(limit)
            .to_list(length=limit)
        )
        
        return [Candidate(**candidate) for candidate in candidates]
        
    except Exception as e:
        logger.error("Get candidates error", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve candidates"
        )


@api_router.post(
    "/candidates",
    response_model="Candidate",
    status_code=status.HTTP_201_CREATED,
    tags=["Candidates"]
)
async def create_candidate(
    candidate_create: CandidateCreate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Create a new candidate."""
    try:
        assessment = await db_manager.db.assessments.find_one({
            "id": candidate_create.assessment_id,
            "user_id": current_user.id
        })
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        user_data = await db_manager.db.users.find_one({"id": current_user.id})
        plan = user_data.get("plan", "free")
        
        if plan == "free":
            start_of_month = datetime.utcnow().replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            candidate_count = await db_manager.db.candidates.count_documents({
                "user_id": current_user.id,
                "created_at": {"$gte": start_of_month}
            })
            if candidate_count >= 50:
                raise HTTPException(
                    status_code=400,
                    detail="Free plan limit reached (50 candidates per month)"
                )
        
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
        
        await db_manager.db.assessments.update_one(
            {"id": candidate_create.assessment_id},
            {"$inc": {"candidate_count": 1}}
        )
        
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
        except Exception:
            logger.exception("Failed to send candidate invitation")
        
        return Candidate(**candidate_data)
        
    except HTTPException:
        raise
    except Exception:
        logger.exception("Create candidate error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create candidate"
        )


@api_router.get(
    "/candidates/{candidate_id}",
    response_model="Candidate",
    tags=["Candidates"]
)
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
    except Exception:
        logger.exception("Get candidate error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve candidate"
        )


@api_router.put(
    "/candidates/{candidate_id}",
    response_model="Candidate",
    tags=["Candidates"]
)
async def update_candidate(
    candidate_id: str = Path(..., description="Candidate ID"),
    candidate_update: CandidateUpdate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Update a candidate."""
    try:
        candidate_data = await db_manager.db.candidates.find_one({
            "id": candidate_id,
            "user_id": current_user.id
        })
        if not candidate_data:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        update_data = candidate_update.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        await db_manager.db.candidates.update_one(
            {"id": candidate_id},
            {"$set": update_data}
        )
        
        updated_candidate = await db_manager.db.candidates.find_one({
            "id": candidate_id
        })
        
        return Candidate(**updated_candidate)
        
    except HTTPException:
        raise
    except Exception:
        logger.exception("Update candidate error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update candidate"
        )


@api_router.delete(
    "/candidates/{candidate_id}",
    tags=["Candidates"]
)
async def delete_candidate(
    candidate_id: str = Path(..., description="Candidate ID"),
    current_user: User = Depends(get_current_user)
):
    """Delete a candidate."""
    try:
        candidate_data = await db_manager.db.candidates.find_one({
            "id": candidate_id,
            "user_id": current_user.id
        })
        if not candidate_data:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        await db_manager.db.candidates.delete_one({"id": candidate_id})
        
        await db_manager.db.assessments.update_one(
            {"id": candidate_data["assessment_id"]},
            {"$inc": {"candidate_count": -1}}
        )
        
        await db_manager.db.candidate_results.delete_one({
            "candidate_id": candidate_id
        })
        
        return SuccessResponse(message="Candidate deleted successfully")
        
    except HTTPException:
        raise
    except Exception:
        logger.exception("Delete candidate error")
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

@api_router.put("/users/me", response_model="User", tags=["User Management"])
async def update_user_profile(
    user_update: "UserUpdate" = Body(...),
    current_user: "User" = Depends(get_current_user)
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
    current_user: "User" = Depends(get_current_user)
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


@api_router.get("/organizations/me", response_model="OrganizationModel", tags=["User Management"])
async def get_user_organization(
    current_user: "User" = Depends(get_current_user)
):
    """Get current user's organization."""
    try:
        if not current_user.organization_id:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        org_data = await db_manager.db.organizations.find_one({"id": current_user.organization_id})
        
        if not org_data:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        return OrganizationModel(**org_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get organization error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve organization"
        )


@api_router.put("/organizations/me", response_model="OrganizationModel", tags=["User Management"])
async def update_user_organization(
    org_update: "OrganizationUpdate" = Body(...),
    current_user: "User" = Depends(get_current_user)
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
        
        return OrganizationModel(**updated_org)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update organization error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update organization"
        )

# ===========================================
# Public Endpoints
# ===========================================

@api_router.post("/contact", tags=["Public"])
async def submit_contact_form(
    contact_form: "ContactFormCreate" = Body(...)
) -> "SuccessResponse":
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
    demo_request: "DemoRequestCreate" = Body(...)
) -> "SuccessResponse":
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
# Webhook Handlers (Refined)
# ===========================================

from typing import Any, Dict

async def handle_checkout_completed(event: Dict[str, Any]) -> None:
    """Handle checkout.session.completed webhook event."""
    try:
        session = event.get("data", {}).get("object", {})
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")
        user_id = session.get("metadata", {}).get("user_id")
        plan_id = session.get("metadata", {}).get("plan_id", "basic")
        
        if not user_id or not subscription_id:
            logger.warning("Checkout completed webhook missing user_id or subscription_id")
            return
        
        # Update user's subscription in database
        subscription_data = {
            "stripe_subscription_id": subscription_id,
            "stripe_customer_id": customer_id,
            "status": "active",
            "updated_at": datetime.utcnow()
        }
        
        await db_manager.db.subscriptions.update_one(
            {"user_id": user_id},
            {"$set": subscription_data},
            upsert=True
        )
        
        # Update user plan
        await db_manager.db.users.update_one(
            {"id": user_id},
            {"$set": {"plan": plan_id, "updated_at": datetime.utcnow()}}
        )
        
        logger.info(f"Checkout completed for user {user_id}, subscription {subscription_id}")
        
    except Exception as e:
        logger.error(f"Error handling checkout completed: {e}", exc_info=True)


async def handle_subscription_updated(event: Dict[str, Any]) -> None:
    """Handle customer.subscription.updated webhook event."""
    try:
        subscription = event.get("data", {}).get("object", {})
        subscription_id = subscription.get("id")
        status = subscription.get("status")
        
        if subscription_id and status:
            await db_manager.db.subscriptions.update_one(
                {"stripe_subscription_id": subscription_id},
                {"$set": {"status": status, "updated_at": datetime.utcnow()}}
            )
            logger.info(f"Subscription {subscription_id} updated to status {status}")
        else:
            logger.warning("Subscription updated webhook missing id or status")
            
    except Exception as e:
        logger.error(f"Error handling subscription updated: {e}", exc_info=True)


async def handle_subscription_deleted(event: Dict[str, Any]) -> None:
    """Handle customer.subscription.deleted webhook event."""
    try:
        subscription = event.get("data", {}).get("object", {})
        subscription_id = subscription.get("id")
        
        if not subscription_id:
            logger.warning("Subscription deleted webhook missing subscription_id")
            return
        
        await db_manager.db.subscriptions.update_one(
            {"stripe_subscription_id": subscription_id},
            {"$set": {
                "status": "cancelled",
                "cancelled_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        # Downgrade user plan to free
        subscription_data = await db_manager.db.subscriptions.find_one(
            {"stripe_subscription_id": subscription_id}
        )
        user_id = subscription_data.get("user_id") if subscription_data else None
        if user_id:
            await db_manager.db.users.update_one(
                {"id": user_id},
                {"$set": {"plan": "free", "updated_at": datetime.utcnow()}}
            )
        
        logger.info(f"Subscription {subscription_id} deleted and user downgraded if applicable")
            
    except Exception as e:
        logger.error(f"Error handling subscription deleted: {e}", exc_info=True)


async def handle_invoice_payment_succeeded(event: Dict[str, Any]) -> None:
    """Handle invoice.payment_succeeded webhook event."""
    try:
        invoice = event.get("data", {}).get("object", {})
        subscription_id = invoice.get("subscription")
        amount_paid = invoice.get("amount_paid", 0) / 100  # Convert from cents
        
        if subscription_id:
            await db_manager.db.subscriptions.update_one(
                {"stripe_subscription_id": subscription_id},
                {"$set": {
                    "last_payment_at": datetime.utcnow(),
                    "last_payment_amount": amount_paid,
                    "updated_at": datetime.utcnow()
                }}
            )
            logger.info(f"Invoice payment succeeded for subscription {subscription_id}: ${amount_paid}")
        else:
            logger.warning("Invoice payment succeeded webhook missing subscription_id")
            
    except Exception as e:
        logger.error(f"Error handling invoice payment succeeded: {e}", exc_info=True)


async def handle_invoice_payment_failed(event: Dict[str, Any]) -> None:
    """Handle invoice.payment_failed webhook event."""
    try:
        invoice = event.get("data", {}).get("object", {})
        subscription_id = invoice.get("subscription")
        
        if subscription_id:
            await db_manager.db.subscriptions.update_one(
                {"stripe_subscription_id": subscription_id},
                {"$set": {"status": "past_due", "updated_at": datetime.utcnow()}}
            )
            logger.warning(f"Invoice payment failed for subscription {subscription_id}")
        else:
            logger.warning("Invoice payment failed webhook missing subscription_id")
            
    except Exception as e:
        logger.error(f"Error handling invoice payment failed: {e}", exc_info=True)


async def handle_customer_created(event: Dict[str, Any]) -> None:
    """Handle customer.created webhook event."""
    try:
        customer = event.get("data", {}).get("object", {})
        customer_id = customer.get("id")
        email = customer.get("email")
        
        if customer_id and email:
            await db_manager.db.users.update_one(
                {"email": email},
                {"$set": {"stripe_customer_id": customer_id, "updated_at": datetime.utcnow()}}
            )
            logger.info(f"Stripe customer created: {customer_id} for user {email}")
        else:
            logger.warning("Customer created webhook missing id or email")
            
    except Exception as e:
        logger.error(f"Error handling customer created: {e}", exc_info=True)


async def handle_customer_updated(event: Dict[str, Any]) -> None:
    """Handle customer.updated webhook event."""
    try:
        customer = event.get("data", {}).get("object", {})
        customer_id = customer.get("id")
        name = customer.get("name")
        
        if customer_id:
            update_data = {"updated_at": datetime.utcnow()}
            if name:
                update_data["name"] = name
            
            await db_manager.db.users.update_one(
                {"stripe_customer_id": customer_id},
                {"$set": update_data}
            )
            logger.info(f"Stripe customer updated: {customer_id}")
        else:
            logger.warning("Customer updated webhook missing customer_id")
            
    except Exception as e:
        logger.error(f"Error handling customer updated: {e}", exc_info=True)


async def handle_customer_deleted(event: Dict[str, Any]) -> None:
    """Handle customer.deleted webhook event."""
    try:
        customer = event.get("data", {}).get("object", {})
        customer_id = customer.get("id")
        
        if customer_id:
            await db_manager.db.users.update_one(
                {"stripe_customer_id": customer_id},
                {"$set": {"stripe_customer_id": None, "updated_at": datetime.utcnow()}}
            )
            logger.info(f"Stripe customer deleted: {customer_id}")
        else:
            logger.warning("Customer deleted webhook missing customer_id")
            
    except Exception as e:
        logger.error(f"Error handling customer deleted: {e}", exc_info=True)
    

# ===========================================
# Root Redirect
# ===========================================

@app.get("/", include_in_schema=False)
async def root_redirect():
    """
    Redirect root URL `/` to the API documentation.
    This ensures visiting the base domain automatically sends users to `/api/`.
    """
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
