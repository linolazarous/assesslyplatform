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
# JWT Configuration (PRODUCTION SAFE)
# ---------------------------

ACCESS_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
REFRESH_SECRET_KEY = os.getenv("JWT_REFRESH_SECRET_KEY")

if not ACCESS_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY environment variable is not set")

if not REFRESH_SECRET_KEY:
    raise RuntimeError("JWT_REFRESH_SECRET_KEY environment variable is not set")

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24      # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 7              # 7 days

# ---------------------------
# Password Utilities
# ---------------------------

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    if not plain_password or not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a plaintext password"""
    if not password:
        raise ValueError("Password must not be empty")
    return pwd_context.hash(password)

# ---------------------------
# JWT Creation
# ---------------------------

def create_access_token(
    data: Dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a signed JWT access token
    """
    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta if expires_delta
        else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })

    return jwt.encode(
        to_encode,
        ACCESS_SECRET_KEY,
        algorithm=ALGORITHM
    )


def create_refresh_token(data: Dict) -> str:
    """
    Create a signed JWT refresh token
    """
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    })

    return jwt.encode(
        to_encode,
        REFRESH_SECRET_KEY,
        algorithm=ALGORITHM
    )

# ---------------------------
# JWT Verification
# ---------------------------

def _verify_jwt(token: str, secret: str) -> Dict:
    """Internal JWT verification helper"""
    try:
        payload = jwt.decode(token, secret, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise ValueError("Invalid or expired token") from e


def verify_access_token(token: str) -> Dict:
    """Verify and decode an access token"""
    payload = _verify_jwt(token, ACCESS_SECRET_KEY)

    if payload.get("type") != "access":
        raise ValueError("Invalid access token type")

    return payload


def verify_refresh_token(token: str) -> Dict:
    """Verify and decode a refresh token"""
    payload = _verify_jwt(token, REFRESH_SECRET_KEY)

    if payload.get("type") != "refresh":
        raise ValueError("Invalid refresh token type")

    return payload


def verify_token(token: str) -> Dict:
    """
    Backward-compatibility helper.
    Verifies ACCESS tokens by default.
    """
    return verify_access_token(token)
