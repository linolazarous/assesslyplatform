from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
import uuid

# ===========================================
# Helper Functions
# ===========================================

def generate_id():
    """Generate a UUID string."""
    return str(uuid.uuid4())

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
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        }

# ===========================================
# Token Models
# ===========================================

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: User
    redirect_url: Optional[str] = None

# ===========================================
# Assessment Models
# ===========================================

class QuestionOption(BaseModel):
    id: str
    text: str
    correct: bool = False
    explanation: Optional[str] = None

class Question(BaseModel):
    id: str = Field(default_factory=generate_id)
    text: str
    type: str = "multiple_choice"  # multiple_choice, text, code, file_upload
    options: List[QuestionOption] = []
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    points: int = 1
    order: int = 0
    time_limit: Optional[int] = None  # seconds
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AssessmentSettings(BaseModel):
    shuffle_questions: bool = False
    show_score: bool = True
    allow_retake: bool = False
    time_limit: int = 30  # minutes
    passing_score: int = 70
    require_full_name: bool = True
    require_email: bool = True
    auto_submit: bool = True
    instructions: Optional[str] = None
    show_correct_answers: bool = False
    show_explanations: bool = False
    security_level: str = "basic"  # basic, strict, locked_down

class AssessmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    assessment_type: str = "multiple_choice"  # multiple_choice, coding, mixed, custom
    duration_minutes: int = 30
    category: str = "General"
    tags: List[str] = []

class AssessmentCreate(AssessmentBase):
    settings: Optional[AssessmentSettings] = None
    questions: Optional[List[Question]] = []

class AssessmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assessment_type: Optional[str] = None
    duration_minutes: Optional[int] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None  # draft, published, archived
    settings: Optional[AssessmentSettings] = None
    questions: Optional[List[Question]] = None

class Assessment(AssessmentBase):
    id: str = Field(default_factory=generate_id)
    user_id: str
    organization_id: str
    settings: AssessmentSettings = Field(default_factory=lambda: AssessmentSettings())
    questions: List[Question] = []
    status: str = "draft"
    candidate_count: int = 0
    completion_rate: float = 0.0
    average_time: float = 0.0
    average_score: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    published_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        }

# ===========================================
# Candidate Models
# ===========================================

class CandidateBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    assessment_id: str

class CandidateCreate(CandidateBase):
    metadata: Optional[Dict[str, Any]] = None

class Candidate(CandidateBase):
    id: str = Field(default_factory=generate_id)
    user_id: str
    invitation_token: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "invited"  # invited, started, completed, expired
    score: Optional[float] = None
    time_spent: Optional[int] = None  # seconds
    answers: List[Dict[str, Any]] = []
    feedback: Optional[str] = None
    invited_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = {}
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        }

# ===========================================
# Organization Models
# ===========================================

class OrganizationBase(BaseModel):
    name: str
    website: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None

class Organization(OrganizationBase):
    id: str = Field(default_factory=generate_id)
    owner_id: str
    slug: str
    settings: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        }

# ===========================================
# Subscription & Billing Models
# ===========================================

class SubscriptionCreate(BaseModel):
    plan_id: str
    payment_method_id: Optional[str] = None

class Subscription(BaseModel):
    id: str = Field(default_factory=generate_id)
    user_id: str
    plan_id: str
    stripe_subscription_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    status: str = "active"  # active, canceled, past_due, incomplete
    amount: Optional[int] = None  # in cents
    currency: str = "usd"
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    canceled_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        }

# ===========================================
# Contact & Demo Models
# ===========================================

class ContactFormCreate(BaseModel):
    name: str
    email: EmailStr
    company: Optional[str] = None
    message: str

class ContactForm(ContactFormCreate):
    id: str = Field(default_factory=generate_id)
    status: str = "new"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        }

class DemoRequestCreate(BaseModel):
    name: str
    email: EmailStr
    company: str
    size: Optional[str] = None
    notes: Optional[str] = None

class DemoRequest(DemoRequestCreate):
    id: str = Field(default_factory=generate_id)
    status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        }

# ===========================================
# OAuth Models
# ===========================================

class OAuthState(BaseModel):
    state: str
    redirect_uri: str
    plan: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        }

class OAuthCallback(BaseModel):
    code: str
    state: str

# ===========================================
# Dashboard & Analytics Models
# ===========================================

class DashboardStats(BaseModel):
    assessments: Dict[str, int]
    candidates: Dict[str, int]
    completion_rate: float
    average_score: float
    recent_assessments: List[Dict[str, Any]]
    recent_candidates: List[Dict[str, Any]]
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        }

class AnalyticsData(BaseModel):
    period: str  # day, week, month, year
    data: List[Dict[str, Any]]
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        }

# ===========================================
# API Response Models
# ===========================================

class SuccessResponse(BaseModel):
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        }

# ===========================================
# Webhook Models
# ===========================================

class StripeWebhook(BaseModel):
    id: str
    type: str
    data: Dict[str, Any]
    created: int
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        }

# ===========================================
# File Upload Models
# ===========================================

class FileUpload(BaseModel):
    filename: str
    content_type: str
    size: int
    url: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        }

# ===========================================
# Export all models
# ===========================================

__all__ = [
    # User
    "UserBase", "UserCreate", "UserLogin", "UserUpdate", "User",
    # Token
    "Token",
    # Assessment
    "QuestionOption", "Question", "AssessmentSettings", "AssessmentBase",
    "AssessmentCreate", "AssessmentUpdate", "Assessment",
    # Candidate
    "CandidateBase", "CandidateCreate", "Candidate",
    # Organization
    "OrganizationBase", "OrganizationUpdate", "Organization",
    # Subscription
    "SubscriptionCreate", "Subscription",
    # Contact & Demo
    "ContactFormCreate", "ContactForm", "DemoRequestCreate", "DemoRequest",
    # OAuth
    "OAuthState", "OAuthCallback",
    # Dashboard & Analytics
    "DashboardStats", "AnalyticsData",
    # API Response
    "SuccessResponse", "ErrorResponse", "PaginatedResponse",
    # Webhook
    "StripeWebhook",
    # File Upload
    "FileUpload",
    ]
