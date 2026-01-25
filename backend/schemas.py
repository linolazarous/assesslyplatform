# backend/schemas.py
from pydantic import BaseModel, Field, EmailStr, validator, ConfigDict
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
import uuid
from bson import ObjectId

# ===========================================
# Helper Functions
# ===========================================

def generate_id():
    """Generate a UUID string."""
    return str(uuid.uuid4())

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

# ===========================================
# User Models
# ===========================================

class UserBase(BaseModel):
    email: EmailStr
    name: str
    organization: str = "Personal"
    job_title: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str
    recaptcha_token: Optional[str] = None
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    organization: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None
    notifications_enabled: Optional[bool] = True
    email_notifications: Optional[bool] = None

class User(UserBase):
    id: str = Field(default_factory=generate_id)
    hashed_password: Optional[str] = None
    google_id: Optional[str] = None
    github_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    avatar: Optional[str] = None
    plan: str = "free"
    is_verified: bool = False
    is_active: bool = True
    role: str = "user"
    notifications_enabled: bool = True
    email_notifications: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    organization_id: Optional[str] = None  # ADDED: Organization reference
    two_factor_enabled: bool = False  # ADDED: 2FA status
    
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        },
        arbitrary_types_allowed=True
    )

# ===========================================
# Token Models
# ===========================================

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: User
    redirect_url: Optional[str] = None
    requires_2fa: Optional[bool] = False
    session_id: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# ===========================================
# Assessment Models
# ===========================================

class QuestionOption(BaseModel):
    id: str
    text: str
    correct: bool = False
    explanation: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class Question(BaseModel):
    id: str = Field(default_factory=generate_id)
    text: str
    type: str = "multiple_choice"
    options: List[QuestionOption] = []
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    points: int = 1
    order: int = 0
    time_limit: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(from_attributes=True)

class QuestionUpdate(BaseModel):
    text: Optional[str] = None
    type: Optional[str] = None
    options: Optional[List[QuestionOption]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    points: Optional[int] = None
    order: Optional[int] = None
    time_limit: Optional[int] = None

class AssessmentSettings(BaseModel):
    shuffle_questions: bool = False
    show_score: bool = True
    allow_retake: bool = False
    time_limit: int = 30
    passing_score: int = 70
    require_full_name: bool = True
    require_email: bool = True
    auto_submit: bool = True
    instructions: Optional[str] = None
    show_correct_answers: bool = False
    show_explanations: bool = False
    security_level: str = "basic"
    
    model_config = ConfigDict(from_attributes=True)

class AssessmentSettingsUpdate(BaseModel):
    shuffle_questions: Optional[bool] = None
    show_score: Optional[bool] = None
    allow_retake: Optional[bool] = None
    time_limit: Optional[int] = None
    passing_score: Optional[int] = None
    require_full_name: Optional[bool] = None
    require_email: Optional[bool] = None
    auto_submit: Optional[bool] = None
    instructions: Optional[str] = None
    show_correct_answers: Optional[bool] = None
    show_explanations: Optional[bool] = None
    security_level: Optional[str] = None

class AssessmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    assessment_type: str = "multiple_choice"
    duration_minutes: int = 30
    category: str = "General"
    tags: List[str] = []
    
    model_config = ConfigDict(from_attributes=True)

class AssessmentCreate(AssessmentBase):
    settings: Optional[AssessmentSettings] = None
    questions: Optional[List[Question]] = []
    
    model_config = ConfigDict(from_attributes=True)

class AssessmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assessment_type: Optional[str] = None
    duration_minutes: Optional[int] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    settings: Optional[AssessmentSettings] = None
    questions: Optional[List[Question]] = None
    
    model_config = ConfigDict(from_attributes=True)

class AssessmentPublishRequest(BaseModel):
    publish: bool = True

class AssessmentDuplicateRequest(BaseModel):
    name: str
    copy_candidates: bool = False

class Assessment(AssessmentBase):
    id: str = Field(default_factory=generate_id)
    user_id: str
    organization_id: Optional[str] = None
    settings: AssessmentSettings = Field(default_factory=lambda: AssessmentSettings())
    questions: List[Question] = []
    status: str = "draft"
    is_published: bool = False
    public_slug: Optional[str] = None
    public_url: Optional[str] = None
    candidate_count: int = 0
    completion_rate: float = 0.0
    average_time: float = 0.0
    average_score: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    published_at: Optional[datetime] = None
    
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        },
        arbitrary_types_allowed=True
    )

# ===========================================
# Candidate Models
# ===========================================

class CandidateBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    assessment_id: str
    
    model_config = ConfigDict(from_attributes=True)

class CandidateCreate(CandidateBase):
    metadata: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(from_attributes=True)

class CandidateUpdate(BaseModel):
    status: Optional[str] = None
    name: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    score: Optional[float] = None
    time_spent: Optional[int] = None
    answers: Optional[List[Dict[str, Any]]] = None
    feedback: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class CandidateResendInvite(BaseModel):
    email: EmailStr
    message: Optional[str] = None

class CandidateResults(BaseModel):
    candidate_id: str
    assessment_id: str
    candidate_name: Optional[str] = None
    candidate_email: EmailStr
    assessment_title: str
    score: float
    score_percentage: float
    total_questions: int
    correct_answers: int
    time_spent: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    answers: List[Dict[str, Any]] = []
    feedback: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Candidate(CandidateBase):
    id: str = Field(default_factory=generate_id)
    user_id: str
    invitation_token: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "invited"
    score: Optional[float] = None
    time_spent: Optional[int] = None
    answers: List[Dict[str, Any]] = []
    feedback: Optional[str] = None
    invited_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = {}
    
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        },
        arbitrary_types_allowed=True
    )

# ===========================================
# Organization Models
# ===========================================

class OrganizationBase(BaseModel):
    name: str
    website: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class Organization(OrganizationBase):
    id: str = Field(default_factory=generate_id)
    owner_id: str
    slug: str
    settings: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        },
        arbitrary_types_allowed=True
    )

# ===========================================
# Subscription & Billing Models
# ===========================================

class SubscriptionCreate(BaseModel):
    plan_id: str
    payment_method_id: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class SubscriptionUpdate(BaseModel):
    status: Optional[str] = None
    cancel_at_period_end: Optional[bool] = None
    
    model_config = ConfigDict(from_attributes=True)

class Subscription(BaseModel):
    id: str = Field(default_factory=generate_id)
    user_id: str
    plan_id: str
    stripe_subscription_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    status: str = "active"
    amount: Optional[int] = None
    currency: str = "usd"
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    canceled_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        },
        arbitrary_types_allowed=True
    )

class PaymentIntentCreate(BaseModel):
    amount: int
    currency: str = "usd"
    description: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class PaymentIntent(BaseModel):
    client_secret: Optional[str] = None
    id: str
    amount: int
    currency: str = "usd"
    status: str
    customer_id: Optional[str] = None
    description: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class BillingHistory(BaseModel):
    invoices: List[Dict[str, Any]] = []
    total: int = 0
    limit: int = 50
    offset: int = 0
    has_more: bool = False
    
    model_config = ConfigDict(from_attributes=True)

class Plan(BaseModel):
    id: str
    name: str
    price: int
    currency: str = "usd"
    interval: str
    features: List[str]
    
    model_config = ConfigDict(from_attributes=True)

# ===========================================
# Contact & Demo Models
# ===========================================

class ContactFormCreate(BaseModel):
    name: str
    email: EmailStr
    company: Optional[str] = None
    message: str
    
    model_config = ConfigDict(from_attributes=True)

class ContactForm(ContactFormCreate):
    id: str = Field(default_factory=generate_id)
    status: str = "new"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        },
        arbitrary_types_allowed=True
    )

class DemoRequestCreate(BaseModel):
    name: str
    email: EmailStr
    company: str
    size: Optional[str] = None
    notes: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class DemoRequest(DemoRequestCreate):
    id: str = Field(default_factory=generate_id)
    status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        },
        arbitrary_types_allowed=True
    )

# ===========================================
# OAuth Models
# ===========================================

class OAuthState(BaseModel):
    state: str
    redirect_uri: str
    plan: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        },
        arbitrary_types_allowed=True
    )

class OAuthCallback(BaseModel):
    code: str
    state: str
    
    model_config = ConfigDict(from_attributes=True)

# ===========================================
# Security Models (NEW for server.py)
# ===========================================

class TwoFactorVerify(BaseModel):
    token: str
    method: str = "totp"

class TwoFactorSetup(BaseModel):
    secret: str
    qr_code_url: str
    backup_codes: List[str] = []
    message: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class SessionInfo(BaseModel):
    session_id: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    last_activity: datetime
    expires_at: datetime
    is_current: bool = False
    
    model_config = ConfigDict(from_attributes=True)

class SessionTerminate(BaseModel):
    session_id: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    
    @validator('new_password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

# ===========================================
# Dashboard & Analytics Models
# ===========================================

class DashboardStats(BaseModel):
    assessment_count: int = 0
    candidate_count: int = 0
    completed_candidates: int = 0
    completion_rate: float = 0.0
    recent_assessments: List[Dict[str, Any]] = []
    recent_candidates: List[Dict[str, Any]] = []
    
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        },
        arbitrary_types_allowed=True
    )

class AnalyticsData(BaseModel):
    period: str
    data: List[Dict[str, Any]] = []
    
    model_config = ConfigDict(from_attributes=True)

class PlatformStats(BaseModel):
    total_organizations: int = 0
    total_candidates: int = 0
    total_questions: int = 0
    uptime_percentage: float = 100.0
    active_assessments: int = 0
    active_candidates: int = 0
    completion_rate: float = 0.0
    
    model_config = ConfigDict(from_attributes=True)

# ===========================================
# API Response Models
# ===========================================

class SuccessResponse(BaseModel):
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(from_attributes=True)

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class PaginatedResponse(BaseModel):
    items: List[Any] = []
    total: int = 0
    page: int = 1
    size: int = 10
    pages: int = 1
    
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        },
        arbitrary_types_allowed=True
    )

# ===========================================
# System Status Models (NEW for server.py)
# ===========================================

class APIStatus(BaseModel):
    status: str = "healthy"
    version: str = "1.0.0"
    uptime: float = 0.0
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    dependencies: Dict[str, str] = {}
    stats: Optional[Dict[str, int]] = None
    
    model_config = ConfigDict(from_attributes=True)

# ===========================================
# Webhook Models
# ===========================================

class StripeWebhook(BaseModel):
    id: str
    type: str
    data: Dict[str, Any]
    created: int
    
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        },
        arbitrary_types_allowed=True
    )

# ===========================================
# File Upload Models
# ===========================================

class FileUpload(BaseModel):
    filename: str
    content_type: str
    size: int
    url: Optional[str] = None
    
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        },
        arbitrary_types_allowed=True
    )

# ===========================================
# Email Verification Token Models
# ===========================================

class EmailVerificationToken(BaseModel):
    token: str
    user_id: str
    email: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(from_attributes=True)

class PasswordResetToken(BaseModel):
    token: str
    user_id: str
    email: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(from_attributes=True)

# ===========================================
# 2FA Secret Storage Model (NEW)
# ===========================================

class TwoFactorSecret(BaseModel):
    """Model for storing 2FA secrets"""
    user_id: str
    secret: str
    backup_codes: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        },
        arbitrary_types_allowed=True
    )

# ===========================================
# Session Storage Model (NEW)
# ===========================================

class UserSession(BaseModel):
    """Model for storing user sessions"""
    session_id: str
    user_id: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(days=7))
    is_active: bool = True
    
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        },
        arbitrary_types_allowed=True
    )

# ===========================================
# Export all models
# ===========================================

__all__ = [
    # User
    "UserBase", "UserCreate", "UserLogin", "UserUpdate", "User",
    # Token
    "Token",
    # Assessment
    "QuestionOption", "Question", "QuestionUpdate", "AssessmentSettings", 
    "AssessmentSettingsUpdate", "AssessmentBase", "AssessmentCreate", 
    "AssessmentUpdate", "Assessment", "AssessmentPublishRequest", 
    "AssessmentDuplicateRequest",
    # Candidate
    "CandidateBase", "CandidateCreate", "CandidateUpdate", "Candidate",
    "CandidateResendInvite", "CandidateResults",
    # Organization
    "OrganizationBase", "OrganizationUpdate", "Organization",
    # Subscription
    "SubscriptionCreate", "SubscriptionUpdate", "Subscription",
    "PaymentIntentCreate", "PaymentIntent", "BillingHistory", "Plan",
    # Contact & Demo
    "ContactFormCreate", "ContactForm", "DemoRequestCreate", "DemoRequest",
    # OAuth
    "OAuthState", "OAuthCallback",
    # Security
    "TwoFactorVerify", "TwoFactorSetup", "SessionInfo", "SessionTerminate",
    "ResetPasswordRequest", "TwoFactorSecret", "UserSession",
    # Dashboard & Analytics
    "DashboardStats", "AnalyticsData", "PlatformStats",
    # API Response
    "SuccessResponse", "ErrorResponse", "PaginatedResponse",
    # System
    "APIStatus",
    # Webhook
    "StripeWebhook",
    # File Upload
    "FileUpload",
    # Verification & Reset Tokens
    "EmailVerificationToken", "PasswordResetToken",
    ]
