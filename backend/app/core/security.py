"""
Security utilities — password hashing and JWT token helpers.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import uuid

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings

# ─────────────────────────────────────────────────────────────
# Password hashing configuration
# ─────────────────────────────────────────────────────────────

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)

# ─────────────────────────────────────────────────────────────
# JWT configuration
# ─────────────────────────────────────────────────────────────

ALGORITHM = "HS256"


# ─────────────────────────────────────────────────────────────
# Password Utilities
# ─────────────────────────────────────────────────────────────

def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    """
    Verify plain password against hashed password.
    """
    return pwd_context.verify(
        plain_password,
        hashed_password,
    )


def get_password_hash(password: str) -> str:
    """
    Generate bcrypt password hash.
    """
    return pwd_context.hash(password)


def hash_password(password: str) -> str:
    """
    Alias for backward compatibility.
    """
    return get_password_hash(password)


# ─────────────────────────────────────────────────────────────
# JWT Utilities
# ─────────────────────────────────────────────────────────────

def create_access_token(
    subject: str | Any,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create JWT access token with a unique jti claim.
    """

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "access",
        "jti": str(uuid.uuid4()),
    }

    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )


def create_refresh_token(
    subject: str | Any,
) -> str:
    """
    Create JWT refresh token with a unique jti claim.
    """

    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )

    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "refresh",
        "jti": str(uuid.uuid4()),
    }

    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_token(token: str) -> Optional[dict]:
    """
    Decode JWT token. Returns None on any error (expired, invalid, etc.)
    """
    try:
        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
        )
    except JWTError:
        return None


# ─────────────────────────────────────────────────────────────
# Simple in-memory blacklist
# (development only)
# ─────────────────────────────────────────────────────────────

TOKEN_BLACKLIST: set[str] = set()


def blacklist_token(token: str) -> None:
    """
    Add token to blacklist.
    """
    TOKEN_BLACKLIST.add(token)


def is_token_blacklisted(token: str) -> bool:
    """
    Check whether token is blacklisted.
    """
    return token in TOKEN_BLACKLIST