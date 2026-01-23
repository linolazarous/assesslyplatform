# schemas.py - Pydantic models/schemas
from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
import uuid

def generate_id():
    return str(uuid.uuid4())

# User Models
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

# Token Model
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: 'User'  # Reference to User schema
    redirect_url: Optional[str] = None
    
    class Config:
        from_attributes = True

# Assessment Models
class QuestionOption(BaseModel):
    id: str
    text: str
    correct: bool = False
    explanation: Optional[str] = None
    
    class Config:
        from_attributes = True

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
    
    class Config:
        from_attributes = True

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
    
    class Config:
        from_attributes = True

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
    
    class Config:
        from_attributes = True

class AssessmentCreate(AssessmentBase):
    settings: Optional[AssessmentSettings] = None
    questions: Optional[List[Question]] = []
    
    class Config:
        from_attributes = True

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
    
    class Config:
        from_attributes = True

class AssessmentPublishRequest(BaseModel):
    publish: bool = True

class AssessmentDuplicateRequest(BaseModel):
    new_title: Optional[str] = None
    include_candidates: bool = False

# Organization Models
class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    
    class Config:
        from_attributes = True

# Candidate Models
class CandidateCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    assessment_id: str
    metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

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
    
    class Config:
        from_attributes = True

class CandidateResendInvite(BaseModel):
    email: EmailStr

class CandidateResults(BaseModel):
    score: float
    time_spent: int
    answers: List[Dict[str, Any]]
    feedback: Optional[str] = None

# Subscription Models
class SubscriptionCreate(BaseModel):
    plan_id: str
    payment_method_id: Optional[str] = None
    
    class Config:
        from_attributes = True

class SubscriptionUpdate(BaseModel):
    status: Optional[str] = None
    cancel_at_period_end: Optional[bool] = None
    
    class Config:
        from_attributes = True

# Payment Models
class PaymentIntentCreate(BaseModel):
    plan_id: str
    payment_method_id: Optional[str] = None
    
    class Config:
        from_attributes = True

class PaymentIntent(BaseModel):
    id: str
    client_secret: Optional[str] = None
    amount: int
    currency: str = "usd"
    status: str
    
    class Config:
        from_attributes = True

class BillingHistory(BaseModel):
    id: str
    amount: int
    currency: str
    description: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class Plan(BaseModel):
    id: str
    name: str
    price: int  # in cents
    currency: str = "usd"
    interval: str  # month, year
    features: List[str]
    
    class Config:
        from_attributes = True

# Contact & Demo Models
class ContactFormCreate(BaseModel):
    name: str
    email: EmailStr
    company: Optional[str] = None
    message: str
    
    class Config:
        from_attributes = True

class DemoRequestCreate(BaseModel):
    name: str
    email: EmailStr
    company: str
    size: Optional[str] = None
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True

# Security Models
class TwoFactorSetup(BaseModel):
    secret: str
    qr_code: str
    
    class Config:
        from_attributes = True

class SessionInfo(BaseModel):
    id: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    last_used_at: datetime
    
    class Config:
        from_attributes = True

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    
    @validator('new_password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

# Dashboard & Response Models
class DashboardStats(BaseModel):
    assessments: Dict[str, int]
    candidates: Dict[str, int]
    completion_rate: float
    average_score: float
    recent_assessments: List[Dict[str, Any]]
    recent_candidates: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True

class SuccessResponse(BaseModel):
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None
    
    class Config:
        from_attributes = True

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int
    
    class Config:
        from_attributes = True

# Add User model AFTER all dependencies are defined
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .schemas import User

# Now define the User model with forward references
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
        from_attributes = True
