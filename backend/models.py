from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    organization: str
    role: str = "admin"

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    plan: str = "free"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

# Contact Form Models
class ContactFormCreate(BaseModel):
    name: str
    email: EmailStr
    company: Optional[str] = None
    message: str

class ContactForm(ContactFormCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "new"

# Demo Request Models
class DemoRequestCreate(BaseModel):
    name: str
    email: EmailStr
    company: str
    size: Optional[str] = None
    notes: Optional[str] = None

class DemoRequest(DemoRequestCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "pending"

# Subscription Models
class SubscriptionCreate(BaseModel):
    plan_id: str
    payment_method_id: str

class Subscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    plan_id: str
    stripe_subscription_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    status: str = "active"
    current_period_start: datetime = Field(default_factory=datetime.utcnow)
    current_period_end: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Organization Models
class OrganizationBase(BaseModel):
    name: str
    domain: Optional[str] = None

class Organization(OrganizationBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    settings: dict = {}
