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
    assessment_status: Optional[str] = Query(None)
):
    try:
        query = {"user_id": current_user.id}
        if assessment_status:
            query["status"] = assessment_status

        assessments = (
            await db_manager.db.assessments
            .find(query)
            .skip(skip)
            .limit(limit)
            .to_list(length=limit)
        )

        for a in assessments:
            a.pop("_id", None)

        return [Assessment(**a) for a in assessments]

    except Exception:
        logger.exception("Get assessments error")
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
    try:
        user_data = await db_manager.db.users.find_one({"id": current_user.id}) or {}
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

        now = datetime.utcnow()
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
            "created_at": now,
            "updated_at": now
        }

        await db_manager.db.assessments.insert_one(assessment_data)
        return Assessment(**assessment_data)

    except HTTPException:
        raise
    except Exception:
        logger.exception("Create assessment error")
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
    assessment_id: str = Path(...),
    current_user: User = Depends(get_current_user)
):
    assessment = await db_manager.db.assessments.find_one({
        "id": assessment_id,
        "user_id": current_user.id
    })

    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    assessment.pop("_id", None)
    return Assessment(**assessment)


@api_router.put(
    "/assessments/{assessment_id}",
    response_model="Assessment",
    tags=["Assessments"]
)
async def update_assessment(
    assessment_id: str = Path(...),
    assessment_update: AssessmentUpdate = Body(...),
    current_user: User = Depends(get_current_user)
):
    assessment = await db_manager.db.assessments.find_one({
        "id": assessment_id,
        "user_id": current_user.id
    })

    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    update_data = assessment_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()

    await db_manager.db.assessments.update_one(
        {"id": assessment_id},
        {"$set": update_data}
    )

    updated = await db_manager.db.assessments.find_one({"id": assessment_id})
    updated.pop("_id", None)
    return Assessment(**updated)


# ===========================================
# Assessment Publish Endpoint
# ===========================================

def _slugify(text: str) -> str:
    return "-".join(
        "".join(c for c in text.lower() if c.isalnum() or c == " ").split()
    )


@api_router.post(
    "/assessments/{assessment_id}/publish",
    response_model="Assessment",
    tags=["Assessments"]
)
async def publish_assessment(
    assessment_id: str = Path(...),
    publish_request: AssessmentPublishRequest = Body(...),
    current_user: User = Depends(get_current_user)
):
    try:
        assessment = await db_manager.db.assessments.find_one({
            "id": assessment_id,
            "user_id": current_user.id
        })
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")

        if publish_request.publish and not assessment.get("questions"):
            raise HTTPException(
                status_code=400,
                detail="Cannot publish assessment without questions"
            )

        now = datetime.utcnow()
        update_data = {
            "is_published": publish_request.publish,
            "status": "published" if publish_request.publish else "draft",
            "published_at": now if publish_request.publish else None,
            "updated_at": now
        }

        if publish_request.publish:
            slug = f"{_slugify(assessment['title'])}-{assessment_id[:8]}"
            update_data["public_slug"] = slug
            update_data["public_url"] = f"{config.FRONTEND_URL}/assessment/{slug}"
        else:
            update_data["public_slug"] = None
            update_data["public_url"] = None

        await db_manager.db.assessments.update_one(
            {"id": assessment_id},
            {"$set": update_data}
        )

        updated = await db_manager.db.assessments.find_one({"id": assessment_id})
        updated.pop("_id", None)
        return Assessment(**updated)

    except HTTPException:
        raise
    except Exception:
        logger.exception("Publish assessment error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to publish assessment"
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
    candidate_status: Optional[str] = Query(None)
):
    try:
        query = {"user_id": current_user.id}
        if assessment_id:
            query["assessment_id"] = assessment_id
        if candidate_status:
            query["status"] = candidate_status

        candidates = (
            await db_manager.db.candidates
            .find(query)
            .skip(skip)
            .limit(limit)
            .to_list(length=limit)
        )

        for c in candidates:
            c.pop("_id", None)

        return [Candidate(**c) for c in candidates]

    except Exception:
        logger.exception("Get candidates error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve candidates"
        )
        
# ===========================================
# Subscription & Billing Endpoints (PRODUCTION READY)
# ===========================================

PLAN_HIERARCHY = {
    "free": 0,
    "basic": 1,
    "professional": 2,
    "enterprise": 3,
}


@api_router.get("/plans", response_model=List[Plan], tags=["Subscriptions"])
async def get_plans():
    try:
        from stripe_service import get_available_plans
        plans_data = get_available_plans()

        return [
            Plan(
                id=pid,
                name=p["name"],
                price=p["price"],
                currency=p["currency"],
                interval=p["interval"],
                features=p["features"],
                limits=p["limits"],
            )
            for pid, p in plans_data.items()
        ]

    except Exception:
        logger.exception("Get plans error")
        raise HTTPException(500, "Failed to retrieve plans")


# ===========================================
# Checkout & Subscription Creation
# ===========================================

@api_router.post("/subscriptions/checkout", tags=["Subscriptions"])
async def create_checkout_session_endpoint(
    payload: dict = Body(...),
    current_user: User = Depends(get_current_user),
):
    plan_id = payload.get("plan_id")
    if not plan_id:
        raise HTTPException(400, "Plan ID is required")

    success_url = f"{config.FRONTEND_URL}/dashboard?checkout=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{config.FRONTEND_URL}/pricing?checkout=cancelled"

    customer_id = await get_or_create_stripe_customer(
        user_id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        organization=current_user.organization,
    )

    session_data = await create_checkout_session(
        plan_id=plan_id,
        success_url=success_url,
        cancel_url=cancel_url,
        customer_id=customer_id,
        email=current_user.email,
        user_id=current_user.id,
        trial_days=7,
        metadata={
            "user_id": current_user.id,
            "plan_id": plan_id,
        },
    )

    if not session_data or session_data.get("type") == "error":
        raise HTTPException(400, session_data.get("message", "Checkout failed"))

    logger.info(f"Checkout created | user={current_user.id} plan={plan_id}")
    return session_data


# ===========================================
# Current Subscription
# ===========================================

@api_router.get("/subscriptions/me", tags=["Subscriptions"])
async def get_user_subscription(current_user: User = Depends(get_current_user)):
    sub = await db_manager.db.subscriptions.find_one(
        {"user_id": current_user.id, "status": {"$in": ["active", "trialing"]}},
        sort=[("created_at", -1)],
    )

    if not sub:
        return {
            "plan_id": "free",
            "status": "active",
            "is_free": True,
        }

    sub.pop("_id", None)
    return sub


# ===========================================
# Cancel Subscription
# ===========================================

@api_router.post("/subscriptions/cancel", tags=["Subscriptions"])
async def cancel_subscription_endpoint(current_user: User = Depends(get_current_user)):
    sub = await db_manager.db.subscriptions.find_one(
        {"user_id": current_user.id, "status": "active"}
    )
    if not sub:
        raise HTTPException(404, "No active subscription found")

    if sub.get("stripe_subscription_id") and sub["stripe_subscription_id"] != "free_plan":
        await cancel_subscription(sub["stripe_subscription_id"])

    await db_manager.db.subscriptions.update_one(
        {"id": sub["id"]},
        {"$set": {
            "status": "cancelled",
            "cancelled_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }},
    )

    await db_manager.db.users.update_one(
        {"id": current_user.id},
        {"$set": {"plan": "free", "updated_at": datetime.utcnow()}},
    )

    logger.info(f"Subscription cancelled | user={current_user.id}")
    return SuccessResponse(message="Subscription cancelled")


# ===========================================
# Upgrade Subscription
# ===========================================

@api_router.post("/subscriptions/upgrade", tags=["Subscriptions"])
async def upgrade_subscription(
    payload: dict = Body(...),
    current_user: User = Depends(get_current_user),
):
    plan_id = payload.get("plan_id")
    if plan_id not in PLAN_HIERARCHY:
        raise HTTPException(400, "Invalid plan")

    sub = await db_manager.db.subscriptions.find_one(
        {"user_id": current_user.id, "status": "active"}
    )

    current_plan = sub.get("plan_id", "free") if sub else "free"

    if PLAN_HIERARCHY[plan_id] <= PLAN_HIERARCHY[current_plan]:
        raise HTTPException(400, "Invalid upgrade path")

    if not sub or sub.get("stripe_subscription_id") == "free_plan":
        return await create_checkout_session_endpoint(payload, current_user)

    success = await update_subscription(sub["stripe_subscription_id"], plan_id)
    if not success:
        raise HTTPException(500, "Stripe upgrade failed")

    await db_manager.db.subscriptions.update_one(
        {"id": sub["id"]},
        {"$set": {"plan_id": plan_id, "updated_at": datetime.utcnow()}},
    )

    await db_manager.db.users.update_one(
        {"id": current_user.id},
        {"$set": {"plan": plan_id, "updated_at": datetime.utcnow()}},
    )

    logger.info(f"Subscription upgraded | user={current_user.id} -> {plan_id}")
    return {
        "success": True,
        "plan": plan_id,
        "redirect_url": f"{config.FRONTEND_URL}/dashboard?plan={plan_id}",
    }


# ===========================================
# Stripe Webhook (IDEMPOTENT)
# ===========================================

@api_router.post("/webhooks/stripe", tags=["Webhooks"])
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    if not sig:
        raise HTTPException(400, "Missing signature")

    event = await handle_webhook_event(payload, sig)
    if not event:
        raise HTTPException(400, "Invalid webhook")

    handlers = {
        "checkout.session.completed": handle_checkout_completed,
        "customer.subscription.updated": handle_subscription_updated,
        "customer.subscription.deleted": handle_subscription_deleted,
        "invoice.payment_succeeded": handle_invoice_payment_succeeded,
        "invoice.payment_failed": handle_invoice_payment_failed,
    }

    handler = handlers.get(event["type"])
    if handler:
        await handler(event)

    return {"received": True, "type": event["type"]}
    

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
