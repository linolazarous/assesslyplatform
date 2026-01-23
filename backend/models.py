# backend/models.py
"""
MongoDB Models for Assessly Platform

Note: Since we're using MongoDB, these are Pydantic models that define
the structure of documents in each collection. They help with validation
and serialization.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
from bson import ObjectId

# ===========================================
# Helper Functions
# ===========================================

def generate_uuid():
    """Generate a UUID string."""
    return str(uuid.uuid4())

class PyObjectId(str):
    """Custom type for MongoDB ObjectId."""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)

# ===========================================
# MongoDB Collection Models
# ===========================================

class UserModel(BaseModel):
    """MongoDB User document model."""
    id: str = Field(default_factory=generate_uuid, alias="_id")
    email: str = Field(..., description="User email")
    name: str = Field(..., description="User full name")
    organization: str = Field(default="Personal", description="Organization name")
    job_title: Optional[str] = Field(None, description="Job title")
    phone: Optional[str] = Field(None, description="Phone number")
    hashed_password: Optional[str] = Field(None, description="Hashed password")
    google_id: Optional[str] = Field(None, description="Google OAuth ID")
    github_id: Optional[str] = Field(None, description="GitHub OAuth ID")
    stripe_customer_id: Optional[str] = Field(None, description="Stripe customer ID")
    avatar: Optional[str] = Field(None, description="Profile avatar URL")
    plan: str = Field(default="free", description="Subscription plan")
    is_verified: bool = Field(default=False, description="Email verification status")
    is_active: bool = Field(default=True, description="Account active status")
    role: str = Field(default="user", description="User role")
    notifications_enabled: bool = Field(default=True, description="Notifications enabled")
    email_notifications: bool = Field(default=True, description="Email notifications enabled")
    two_factor_enabled: bool = Field(default=False, description="2FA enabled")
    two_factor_secret: Optional[str] = Field(None, description="2FA secret")
    two_factor_backup_codes: List[str] = Field(default_factory=list, description="2FA backup codes")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    password_changed_at: Optional[datetime] = Field(None, description="Password change timestamp")
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()},
        extra="ignore"
    )

class AssessmentModel(BaseModel):
    """MongoDB Assessment document model."""
    id: str = Field(default_factory=generate_uuid, alias="_id")
    user_id: str = Field(..., description="Owner user ID")
    organization_id: Optional[str] = Field(None, description="Organization ID")
    title: str = Field(..., description="Assessment title")
    description: Optional[str] = Field(None, description="Assessment description")
    assessment_type: str = Field(default="multiple_choice", description="Assessment type")
    duration_minutes: int = Field(default=30, description="Duration in minutes")
    category: str = Field(default="General", description="Category")
    tags: List[str] = Field(default_factory=list, description="Tags")
    settings: Dict[str, Any] = Field(default_factory=lambda: {
        "shuffle_questions": False,
        "show_score": True,
        "allow_retake": False,
        "time_limit": 30,
        "passing_score": 70,
        "require_full_name": True,
        "require_email": True,
        "auto_submit": True,
        "instructions": None,
        "show_correct_answers": False,
        "show_explanations": False,
        "security_level": "basic"
    }, description="Assessment settings")
    questions: List[Dict[str, Any]] = Field(default_factory=list, description="Questions list")
    status: str = Field(default="draft", description="Status: draft, published, archived")
    is_published: bool = Field(default=False, description="Published status")
    public_slug: Optional[str] = Field(None, description="Public URL slug")
    public_url: Optional[str] = Field(None, description="Public URL")
    candidate_count: int = Field(default=0, description="Total candidates")
    completion_rate: float = Field(default=0.0, description="Completion rate percentage")
    average_time: float = Field(default=0.0, description="Average completion time in seconds")
    average_score: float = Field(default=0.0, description="Average score percentage")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    published_at: Optional[datetime] = Field(None, description="Publication timestamp")
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()},
        extra="ignore"
    )

class CandidateModel(BaseModel):
    """MongoDB Candidate document model."""
    id: str = Field(default_factory=generate_uuid, alias="_id")
    user_id: str = Field(..., description="Owner user ID")
    assessment_id: str = Field(..., description="Assessment ID")
    email: str = Field(..., description="Candidate email")
    name: Optional[str] = Field(None, description="Candidate name")
    invitation_token: str = Field(default_factory=generate_uuid, description="Invitation token")
    status: str = Field(default="invited", description="Status: invited, started, completed, expired")
    score: Optional[float] = Field(None, description="Score percentage")
    time_spent: Optional[int] = Field(None, description="Time spent in seconds")
    answers: List[Dict[str, Any]] = Field(default_factory=list, description="Candidate answers")
    feedback: Optional[str] = Field(None, description="Feedback")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    invited_at: datetime = Field(default_factory=datetime.utcnow, description="Invitation timestamp")
    started_at: Optional[datetime] = Field(None, description="Start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()},
        extra="ignore"
    )

class CandidateResultsModel(BaseModel):
    """MongoDB Candidate Results document model."""
    id: str = Field(default_factory=generate_uuid, alias="_id")
    candidate_id: str = Field(..., description="Candidate ID")
    assessment_id: str = Field(..., description="Assessment ID")
    score: float = Field(..., description="Score")
    total_questions: int = Field(..., description="Total questions")
    correct_answers: int = Field(..., description="Correct answers count")
    time_spent: int = Field(..., description="Time spent in seconds")
    answers: List[Dict[str, Any]] = Field(default_factory=list, description="Detailed answers")
    started_at: Optional[datetime] = Field(None, description="Start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()},
        extra="ignore"
    )

class OrganizationModel(BaseModel):
    """MongoDB Organization document model."""
    id: str = Field(default_factory=generate_uuid, alias="_id")
    owner_id: str = Field(..., description="Owner user ID")
    name: str = Field(..., description="Organization name")
    slug: str = Field(..., description="URL slug")
    website: Optional[str] = Field(None, description="Website URL")
    industry: Optional[str] = Field(None, description="Industry")
    size: Optional[str] = Field(None, description="Organization size")
    settings: Dict[str, Any] = Field(default_factory=dict, description="Organization settings")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()},
        extra="ignore"
    )

class SubscriptionModel(BaseModel):
    """MongoDB Subscription document model."""
    id: str = Field(default_factory=generate_uuid, alias="_id")
    user_id: str = Field(..., description="User ID")
    plan_id: str = Field(..., description="Plan ID")
    stripe_subscription_id: Optional[str] = Field(None, description="Stripe subscription ID")
    stripe_customer_id: Optional[str] = Field(None, description="Stripe customer ID")
    status: str = Field(default="active", description="Status: active, canceled, past_due, incomplete")
    amount: Optional[int] = Field(None, description="Amount in cents")
    currency: str = Field(default="usd", description="Currency")
    current_period_start: Optional[datetime] = Field(None, description="Current period start")
    current_period_end: Optional[datetime] = Field(None, description="Current period end")
    cancel_at_period_end: bool = Field(default=False, description="Cancel at period end")
    canceled_at: Optional[datetime] = Field(None, description="Cancelation timestamp")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()},
        extra="ignore"
    )

class ContactFormModel(BaseModel):
    """MongoDB Contact Form document model."""
    id: str = Field(default_factory=generate_uuid, alias="_id")
    name: str = Field(..., description="Contact name")
    email: str = Field(..., description="Contact email")
    company: Optional[str] = Field(None, description="Company name")
    message: str = Field(..., description="Message content")
    status: str = Field(default="new", description="Status: new, reviewed, responded")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()},
        extra="ignore"
    )

class DemoRequestModel(BaseModel):
    """MongoDB Demo Request document model."""
    id: str = Field(default_factory=generate_uuid, alias="_id")
    name: str = Field(..., description="Requester name")
    email: str = Field(..., description="Requester email")
    company: str = Field(..., description="Company name")
    size: Optional[str] = Field(None, description="Company size")
    notes: Optional[str] = Field(None, description="Additional notes")
    status: str = Field(default="pending", description="Status: pending, scheduled, completed")
    scheduled_at: Optional[datetime] = Field(None, description="Scheduled demo time")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()},
        extra="ignore"
    )

class OAuthStateModel(BaseModel):
    """MongoDB OAuth State document model."""
    id: str = Field(default_factory=generate_uuid, alias="_id")
    state: str = Field(..., description="OAuth state parameter")
    redirect_uri: str = Field(..., description="Redirect URI")
    plan: Optional[str] = Field(None, description="Selected plan")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()},
        extra="ignore"
    )

class EmailVerificationTokenModel(BaseModel):
    """MongoDB Email Verification Token document model."""
    id: str = Field(default_factory=generate_uuid, alias="_id")
    user_id: str = Field(..., description="User ID")
    token: str = Field(..., description="Verification token")
    email: str = Field(..., description="Email address")
    expires_at: datetime = Field(..., description="Expiration timestamp")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()},
        extra="ignore"
    )

class PasswordResetTokenModel(BaseModel):
    """MongoDB Password Reset Token document model."""
    id: str = Field(default_factory=generate_uuid, alias="_id")
    user_id: str = Field(..., description="User ID")
    token: str = Field(..., description="Reset token")
    email: str = Field(..., description="Email address")
    expires_at: datetime = Field(..., description="Expiration timestamp")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()},
        extra="ignore"
    )

class UserSessionModel(BaseModel):
    """MongoDB User Session document model."""
    id: str = Field(default_factory=generate_uuid, alias="_id")
    session_id: str = Field(..., description="Session ID")
    user_id: str = Field(..., description="User ID")
    user_agent: Optional[str] = Field(None, description="User agent")
    ip_address: Optional[str] = Field(None, description="IP address")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    last_activity: datetime = Field(default_factory=datetime.utcnow, description="Last activity timestamp")
    expires_at: datetime = Field(..., description="Expiration timestamp")
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()},
        extra="ignore"
    )

class TwoFactorSecretModel(BaseModel):
    """MongoDB 2FA Secret document model."""
    id: str = Field(default_factory=generate_uuid, alias="_id")
    user_id: str = Field(..., description="User ID")
    secret: str = Field(..., description="2FA secret")
    backup_codes: List[str] = Field(default_factory=list, description="Backup codes")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()},
        extra="ignore"
    )

class APILogModel(BaseModel):
    """MongoDB API Log document model."""
    id: str = Field(default_factory=generate_uuid, alias="_id")
    request_id: str = Field(..., description="Request ID")
    user_id: Optional[str] = Field(None, description="User ID")
    method: str = Field(..., description="HTTP method")
    endpoint: str = Field(..., description="API endpoint")
    query_params: Optional[str] = Field(None, description="Query parameters")
    user_agent: Optional[str] = Field(None, description="User agent")
    ip_address: Optional[str] = Field(None, description="IP address")
    status_code: Optional[int] = Field(None, description="HTTP status code")
    response_time_ms: Optional[float] = Field(None, description="Response time in ms")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()},
        extra="ignore"
    )

class PlatformStatsModel(BaseModel):
    """MongoDB Platform Stats document model."""
    id: str = Field(default_factory=generate_uuid, alias="_id")
    total_organizations: int = Field(default=0, description="Total organizations")
    total_candidates: int = Field(default=0, description="Total candidates")
    total_questions: int = Field(default=0, description="Total questions")
    uptime_percentage: float = Field(default=100.0, description="Uptime percentage")
    active_assessments: int = Field(default=0, description="Active assessments")
    active_candidates: int = Field(default=0, description="Active candidates")
    completion_rate: float = Field(default=0.0, description="Completion rate")
    calculated_at: datetime = Field(default_factory=datetime.utcnow, description="Calculation timestamp")
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()},
        extra="ignore"
    )

# ===========================================
# Export all models
# ===========================================

__all__ = [
    # Document models
    "UserModel", 
    "AssessmentModel", 
    "CandidateModel", 
    "CandidateResultsModel",
    "OrganizationModel", 
    "SubscriptionModel",
    "ContactFormModel", 
    "DemoRequestModel",
    "OAuthStateModel",
    "EmailVerificationTokenModel", 
    "PasswordResetTokenModel",
    "UserSessionModel", 
    "TwoFactorSecretModel", 
    "APILogModel",
    "PlatformStatsModel",
    ]
