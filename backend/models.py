from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, JSON, ForeignKey, Float, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid
import enum

Base = declarative_base()

# ===========================================
# Helper Functions
# ===========================================

def generate_uuid():
    """Generate a UUID string."""
    return str(uuid.uuid4())

# ===========================================
# Enum Definitions
# ===========================================

class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"

class PlanType(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class AssessmentType(str, enum.Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    CODING = "coding"
    MIXED = "mixed"
    CUSTOM = "custom"

class AssessmentStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class CandidateStatus(str, enum.Enum):
    INVITED = "invited"
    STARTED = "started"
    COMPLETED = "completed"
    EXPIRED = "expired"

class QuestionType(str, enum.Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TEXT = "text"
    CODE = "code"
    FILE_UPLOAD = "file_upload"

class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    INCOMPLETE = "incomplete"

# ===========================================
# User Model
# ===========================================

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    organization = Column(String, default="Personal")
    job_title = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)  # Nullable for OAuth users
    google_id = Column(String, unique=True, nullable=True)
    github_id = Column(String, unique=True, nullable=True)
    stripe_customer_id = Column(String, nullable=True)
    avatar = Column(String, nullable=True)
    plan = Column(String, default="free")
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="user")
    notifications_enabled = Column(Boolean, default=True)
    email_notifications = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    assessments = relationship("Assessment", back_populates="user", cascade="all, delete-orphan")
    organizations = relationship("Organization", back_populates="owner", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    candidates = relationship("Candidate", back_populates="user", cascade="all, delete-orphan")

# ===========================================
# Organization Model
# ===========================================

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    website = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    size = Column(String, nullable=True)
    settings = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="organizations")
    assessments = relationship("Assessment", back_populates="organization", cascade="all, delete-orphan")

# ===========================================
# Assessment Model
# ===========================================

class Assessment(Base):
    __tablename__ = "assessments"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    assessment_type = Column(String, default="multiple_choice")
    duration_minutes = Column(Integer, default=30)
    category = Column(String, default="General")
    tags = Column(JSON, default=list)
    status = Column(String, default="draft")
    candidate_count = Column(Integer, default=0)
    completion_rate = Column(Float, default=0.0)
    average_time = Column(Float, default=0.0)
    average_score = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    published_at = Column(DateTime(timezone=True), nullable=True)
    
    # JSON fields for settings and questions
    settings = Column(JSON, default={
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
    })
    questions = Column(JSON, default=list)
    
    # Relationships
    user = relationship("User", back_populates="assessments")
    organization = relationship("Organization", back_populates="assessments")
    candidates = relationship("Candidate", back_populates="assessment", cascade="all, delete-orphan")

# ===========================================
# Question Model (for separate question management if needed)
# ===========================================

class Question(Base):
    __tablename__ = "questions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    question_type = Column(String, default="multiple_choice")
    options = Column(JSON, default=list)  # List of QuestionOption dicts
    correct_answer = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    points = Column(Integer, default=1)
    order = Column(Integer, default=0)
    time_limit = Column(Integer, nullable=True)  # seconds
    category = Column(String, nullable=True)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User")

# ===========================================
# Candidate Model
# ===========================================

class Candidate(Base):
    __tablename__ = "candidates"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    assessment_id = Column(String, ForeignKey("assessments.id"), nullable=False)
    email = Column(String, nullable=False)
    name = Column(String, nullable=True)
    invitation_token = Column(String, unique=True, default=generate_uuid)
    status = Column(String, default="invited")
    score = Column(Float, nullable=True)
    time_spent = Column(Integer, nullable=True)  # seconds
    answers = Column(JSON, default=list)
    feedback = Column(Text, nullable=True)
    metadata = Column(JSON, default=dict)
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="candidates")
    assessment = relationship("Assessment", back_populates="candidates")

# ===========================================
# Subscription Model
# ===========================================

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    plan_id = Column(String, nullable=False)
    stripe_subscription_id = Column(String, unique=True, nullable=True)
    stripe_customer_id = Column(String, nullable=True)
    status = Column(String, default="active")
    amount = Column(Integer, nullable=True)  # in cents
    currency = Column(String, default="usd")
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)
    canceled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="subscriptions")

# ===========================================
# Contact Form Model
# ===========================================

class ContactForm(Base):
    __tablename__ = "contact_forms"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    company = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    status = Column(String, default="new")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# ===========================================
# Demo Request Model
# ===========================================

class DemoRequest(Base):
    __tablename__ = "demo_requests"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    company = Column(String, nullable=False)
    size = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# ===========================================
# OAuth State Model
# ===========================================

class OAuthState(Base):
    __tablename__ = "oauth_states"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    state = Column(String, unique=True, index=True, nullable=False)
    redirect_uri = Column(String, nullable=False)
    plan = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# ===========================================
# Email Verification Token Model
# ===========================================

class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")

# ===========================================
# Password Reset Token Model
# ===========================================

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")

# ===========================================
# Platform Stats Model (for caching)
# ===========================================

class PlatformStats(Base):
    __tablename__ = "platform_stats"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    total_organizations = Column(Integer, default=0)
    total_candidates = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    uptime_percentage = Column(Float, default=100.0)
    active_assessments = Column(Integer, default=0)
    active_candidates = Column(Integer, default=0)
    completion_rate = Column(Float, default=0.0)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())

# ===========================================
# Export all models
# ===========================================

__all__ = [
    "Base",
    "User",
    "Organization", 
    "Assessment",
    "Question",
    "Candidate",
    "Subscription",
    "ContactForm",
    "DemoRequest",
    "OAuthState",
    "EmailVerificationToken",
    "PasswordResetToken",
    "PlatformStats",
    ]
