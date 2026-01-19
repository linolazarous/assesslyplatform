from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, Dict
import os

# ---------------------------
# Password Hashing
# ---------------------------
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

# ---------------------------
# JWT Configuration
# ---------------------------
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY environment variable is not set")

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24   # 1 day
REFRESH_TOKEN_EXPIRE_DAYS = 7           # 7 days

# ---------------------------
# Password Utilities
# ---------------------------
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a plaintext password"""
    return pwd_context.hash(password)

# ---------------------------
# JWT Creation
# ---------------------------
def create_access_token(
    data: Dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a signed JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta if expires_delta
        else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({
        "exp": expire,
        "type": "access"
    })

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: Dict) -> str:
    """Create a signed JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode.update({
        "exp": expire,
        "type": "refresh"
    })

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ---------------------------
# JWT Verification
# ---------------------------
def verify_token(token: str) -> Dict:
    """Verify and decode any JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise ValueError("Invalid or expired token") from e


def verify_access_token(token: str) -> Dict:
    """Verify an access token"""
    payload = verify_token(token)

    if payload.get("type") != "access":
        raise ValueError("Invalid access token type")

    return payload


def verify_refresh_token(token: str) -> Dict:
    """Verify a refresh token"""
    payload = verify_token(token)

    if payload.get("type") != "refresh":
        raise ValueError("Invalid refresh token type")

    return payload
