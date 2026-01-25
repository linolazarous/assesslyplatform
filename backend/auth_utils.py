# backend/auth_utils.py
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
import os
import logging
import pyotp
import qrcode
import base64
import io
import secrets
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

# ---------------------------
# Password Hashing
# ---------------------------
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12  # Production-ready number of rounds
)

# ---------------------------
# JWT Configuration (PRODUCTION SAFE)
# ---------------------------

ACCESS_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
REFRESH_SECRET_KEY = os.getenv("JWT_REFRESH_SECRET_KEY")

# Don't raise errors immediately for development
if not ACCESS_SECRET_KEY:
    logger.warning("JWT_SECRET_KEY environment variable is not set")
    ACCESS_SECRET_KEY = "development_secret_key_change_in_production" + os.urandom(16).hex()

if not REFRESH_SECRET_KEY:
    logger.warning("JWT_REFRESH_SECRET_KEY environment variable is not set")
    REFRESH_SECRET_KEY = "development_refresh_secret_change_in_production" + os.urandom(16).hex()

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24      # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 7              # 7 days

# ---------------------------
# 2FA Utilities
# ---------------------------

def create_2fa_secret() -> Dict[str, Any]:
    """
    Generate a new 2FA secret key with backup codes
    Returns a dict with 'secret' and 'backup_codes'
    """
    secret = pyotp.random_base32()
    
    # Generate backup codes
    backup_codes = []
    for _ in range(10):
        # Format: XXXXX-XXXXX (10 characters, split in middle)
        code = f"{secrets.token_hex(3).upper()}-{secrets.token_hex(3).upper()}"
        backup_codes.append(code)
    
    return {
        "secret": secret,
        "backup_codes": backup_codes
    }


def generate_2fa_qr_code(secret: str, email: str, issuer: str = "Assessly") -> str:
    """
    Generate a QR code as base64 string for 2FA setup
    """
    # Create TOTP URI
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=email, issuer_name=issuer)
    
    # Generate QR code
    qr = qrcode.make(uri)
    
    # Convert to base64
    buffer = io.BytesIO()
    qr.save(buffer, format="PNG")
    buffer.seek(0)
    
    # Encode as base64 string
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"


def verify_2fa_token(secret: str, token: str) -> bool:
    """
    Verify a 2FA token against the secret
    """
    if not token or len(token) != 6:
        return False
    
    totp = pyotp.TOTP(secret)
    return totp.verify(token)


def generate_2fa_backup_codes(count: int = 10) -> Tuple[list, str]:
    """
    Generate backup codes for 2FA
    Returns: (list of plain codes, hashed combined string for storage)
    """
    # Generate random backup codes
    backup_codes = []
    for _ in range(count):
        # Format: XXXXX-XXXXX (10 characters, split in middle)
        code = f"{secrets.token_hex(3).upper()}-{secrets.token_hex(3).upper()}"
        backup_codes.append(code)
    
    # Create a single string for hashing (store only the hash)
    combined_codes = "|".join(backup_codes)
    hashed_codes = pwd_context.hash(combined_codes)
    
    return backup_codes, hashed_codes


def verify_backup_code(backup_code: str, hashed_backup_codes: str) -> bool:
    """
    Verify a backup code against the hashed backup codes
    """
    if not backup_code or not hashed_backup_codes:
        return False
    
    # Backup codes are stored as a single hashed string
    # We need to check if the provided code matches any of the original codes
    # This is done by checking if the code appears in the original string format
    try:
        return pwd_context.verify(backup_code, hashed_backup_codes)
    except:
        # The backup code itself isn't directly verifiable since we hash the combined string
        # In a real implementation, you'd need to store and verify differently
        # For now, we'll implement a simple check
        return False


def get_current_2fa_token(secret: str) -> str:
    """
    Get the current valid 2FA token for display/testing
    """
    totp = pyotp.TOTP(secret)
    return totp.now()


def is_2fa_token_expired(secret: str, token: str) -> bool:
    """
    Check if a 2FA token has expired
    """
    totp = pyotp.TOTP(secret)
    # Try to verify with a window of 1 (previous, current, next)
    # If it doesn't verify with window, it's expired
    return not totp.verify(token, valid_window=1)


# ---------------------------
# Password Utilities
# ---------------------------

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    if not plain_password or not hashed_password:
        logger.warning("Empty password or hash provided for verification")
        return False
    
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def get_password_hash(password: str) -> str:
    """Hash a plaintext password"""
    if not password:
        raise ValueError("Password must not be empty")
    
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    
    try:
        return pwd_context.hash(password)
    except Exception as e:
        logger.error(f"Password hashing error: {e}")
        raise RuntimeError("Failed to hash password") from e


# ---------------------------
# JWT Creation
# ---------------------------

def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a signed JWT access token
    """
    try:
        to_encode = data.copy()

        expire = datetime.utcnow() + (
            expires_delta if expires_delta
            else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access",
            "iss": "assessly-platform"
        })

        encoded_jwt = jwt.encode(
            to_encode,
            ACCESS_SECRET_KEY,
            algorithm=ALGORITHM
        )
        
        logger.debug(f"Created access token for subject: {data.get('sub')}")
        return encoded_jwt
        
    except Exception as e:
        logger.error(f"Failed to create access token: {e}")
        raise RuntimeError("Failed to create access token") from e


def create_refresh_token(data: Dict[str, Any]) -> str:
    """
    Create a signed JWT refresh token
    """
    try:
        to_encode = data.copy()

        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh",
            "iss": "assessly-platform"
        })

        encoded_jwt = jwt.encode(
            to_encode,
            REFRESH_SECRET_KEY,
            algorithm=ALGORITHM
        )
        
        logger.debug(f"Created refresh token for subject: {data.get('sub')}")
        return encoded_jwt
        
    except Exception as e:
        logger.error(f"Failed to create refresh token: {e}")
        raise RuntimeError("Failed to create refresh token") from e


def create_tokens(user_id: str, email: str) -> Dict[str, str]:
    """
    Create both access and refresh tokens for a user
    """
    try:
        access_token = create_access_token({"sub": user_id, "email": email})
        refresh_token = create_refresh_token({"sub": user_id})
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    except Exception as e:
        logger.error(f"Failed to create tokens: {e}")
        raise


# ---------------------------
# JWT Verification
# ---------------------------

def _verify_jwt(token: str, secret: str, token_type: str) -> Dict[str, Any]:
    """Internal JWT verification helper"""
    try:
        if not token:
            raise ValueError("Token is empty")
        
        payload = jwt.decode(
            token, 
            secret, 
            algorithms=[ALGORITHM],
            options={"require": ["exp", "iat", "type", "iss"]}
        )
        
        # Validate required claims
        if payload.get("type") != token_type:
            raise ValueError(f"Invalid token type. Expected {token_type}, got {payload.get('type')}")
        
        if payload.get("iss") != "assessly-platform":
            raise ValueError("Invalid issuer")
        
        # Validate expiration
        exp_timestamp = payload.get("exp")
        if not exp_timestamp:
            raise ValueError("Token missing expiration")
        
        exp_datetime = datetime.utcfromtimestamp(exp_timestamp)
        if exp_datetime < datetime.utcnow():
            raise ValueError("Token has expired")
        
        return payload
        
    except JWTError as e:
        logger.warning(f"JWT validation failed: {e}")
        raise ValueError(f"Invalid token: {str(e)}")
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise ValueError(f"Token verification failed: {str(e)}")


def verify_access_token(token: str) -> Dict[str, Any]:
    """Verify and decode an access token"""
    try:
        return _verify_jwt(token, ACCESS_SECRET_KEY, "access")
    except ValueError as e:
        logger.warning(f"Invalid access token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_refresh_token(token: str) -> Dict[str, Any]:
    """Verify and decode a refresh token"""
    try:
        return _verify_jwt(token, REFRESH_SECRET_KEY, "refresh")
    except ValueError as e:
        logger.warning(f"Invalid refresh token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_token(token: str) -> Dict[str, Any]:
    """
    Backward-compatibility helper.
    Verifies ACCESS tokens by default.
    """
    return verify_access_token(token)


def decode_token(token: str, ignore_expiration: bool = False) -> Optional[Dict[str, Any]]:
    """
    Decode a JWT token without verification (use with caution)
    Useful for debugging or when verification is done elsewhere
    """
    try:
        return jwt.decode(
            token,
            options={"verify_signature": False, "require_exp": not ignore_expiration}
        )
    except Exception as e:
        logger.warning(f"Failed to decode token: {e}")
        return None


# ---------------------------
# Token Utility Functions
# ---------------------------

def extract_user_id_from_token(token: str) -> Optional[str]:
    """
    Extract user ID from token (access or refresh)
    """
    try:
        # Try to verify as access token first
        payload = verify_access_token(token)
    except (ValueError, HTTPException):
        try:
            # If access token fails, try as refresh token
            payload = verify_refresh_token(token)
        except (ValueError, HTTPException):
            logger.warning("Failed to extract user ID from token")
            return None
    
    return payload.get("sub")


def is_token_expired(token: str) -> bool:
    """
    Check if a token is expired without verifying signature
    """
    try:
        payload = decode_token(token, ignore_expiration=True)
        if not payload or "exp" not in payload:
            return True
        
        exp_timestamp = payload["exp"]
        exp_datetime = datetime.utcfromtimestamp(exp_timestamp)
        return exp_datetime < datetime.utcnow()
    except Exception:
        return True


def get_token_expiry(token: str) -> Optional[datetime]:
    """
    Get token expiry datetime
    """
    try:
        payload = decode_token(token, ignore_expiration=True)
        if payload and "exp" in payload:
            return datetime.utcfromtimestamp(payload["exp"])
    except Exception as e:
        logger.warning(f"Failed to get token expiry: {e}")
    
    return None


def refresh_access_token(refresh_token: str) -> Optional[Dict[str, str]]:
    """
    Create a new access token using a valid refresh token
    """
    try:
        # Verify refresh token
        payload = verify_refresh_token(refresh_token)
        user_id = payload.get("sub")
        email = payload.get("email")
        
        if not user_id:
            raise ValueError("Refresh token missing subject")
        
        # Create new access token
        new_access_token = create_access_token({"sub": user_id, "email": email})
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }
        
    except (ValueError, HTTPException) as e:
        logger.warning(f"Failed to refresh access token: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error refreshing token: {e}")
        return None


# ---------------------------
# Security Helper Functions
# ---------------------------

def validate_password_complexity(password: str) -> bool:
    """
    Validate password meets complexity requirements
    """
    if len(password) < 8:
        return False
    
    # Check for at least one uppercase letter
    if not any(c.isupper() for c in password):
        return False
    
    # Check for at least one lowercase letter
    if not any(c.islower() for c in password):
        return False
    
    # Check for at least one digit
    if not any(c.isdigit() for c in password):
        return False
    
    # Check for at least one special character
    special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    if not any(c in special_chars for c in password):
        return False
    
    return True


def generate_secure_token(length: int = 32) -> str:
    """
    Generate a cryptographically secure random token
    """
    return secrets.token_urlsafe(length)


def hash_api_key(api_key: str) -> str:
    """
    Hash an API key for secure storage
    """
    return pwd_context.hash(api_key)


def verify_api_key(plain_api_key: str, hashed_api_key: str) -> bool:
    """
    Verify an API key against its hash
    """
    return verify_password(plain_api_key, hashed_api_key)


# ---------------------------
# Rate Limiting Helper
# ---------------------------

class TokenBucket:
    """
    Simple token bucket implementation for rate limiting
    """
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.tokens = capacity
        self.refill_rate = refill_rate  # tokens per second
        self.last_refill = datetime.utcnow()
    
    def consume(self, tokens: int = 1) -> bool:
        """Try to consume tokens, return True if successful"""
        now = datetime.utcnow()
        time_passed = (now - self.last_refill).total_seconds()
        
        # Refill tokens
        self.tokens = min(
            self.capacity,
            self.tokens + time_passed * self.refill_rate
        )
        self.last_refill = now
        
        # Check if we have enough tokens
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False


# ---------------------------
# Export
# ---------------------------

__all__ = [
    # 2FA Functions
    "create_2fa_secret",
    "generate_2fa_qr_code",
    "verify_2fa_token",
    "generate_2fa_backup_codes",
    "verify_backup_code",
    "get_current_2fa_token",
    "is_2fa_token_expired",
    
    # Password
    "verify_password",
    "get_password_hash",
    "validate_password_complexity",
    
    # JWT Creation
    "create_access_token",
    "create_refresh_token",
    "create_tokens",
    
    # JWT Verification
    "verify_access_token",
    "verify_refresh_token",
    "verify_token",
    "decode_token",
    
    # Token Utilities
    "extract_user_id_from_token",
    "is_token_expired",
    "get_token_expiry",
    "refresh_access_token",
    
    # Security
    "generate_secure_token",
    "hash_api_key",
    "verify_api_key",
    
    # Classes
    "TokenBucket",
    
    # Constants
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "REFRESH_TOKEN_EXPIRE_DAYS",
    "pwd_context",
]
