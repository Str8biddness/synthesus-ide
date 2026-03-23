"""
Authentication and Security Module for SYNTHESUS IDE
Provides JWT authentication, rate limiting, and security utilities.
"""

from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from typing import Optional, Dict, Any
import os
import secrets

# Security configuration
SECRET_KEY = os.environ.get("JWT_SECRET", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token scheme
security = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate password hash"""
    return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Dependency to get current authenticated user from JWT token.
    Returns user data or raises 401 if invalid/missing token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not credentials:
        raise credentials_exception
    
    payload = decode_token(credentials.credentials)
    
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    # Check token expiration
    exp = payload.get("exp")
    if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return {
        "user_id": user_id,
        "email": payload.get("email"),
        "username": payload.get("username"),
        "is_admin": payload.get("is_admin", False)
    }


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Optional[Dict[str, Any]]:
    """
    Get current user if authenticated, None otherwise.
    Use for endpoints that work with or without authentication.
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


# Simple in-memory rate limiter (use Redis in production)
_rate_limit_store: Dict[str, Dict[str, Any]] = {}


async def rate_limiter(
    request: Request,
    max_requests: int = 100,
    window_seconds: int = 60
) -> None:
    """
    Simple rate limiter based on client IP.
    Raises HTTPException if rate limit exceeded.
    """
    client_ip = request.client.host if request.client else "unknown"
    key = f"rate_limit:{client_ip}"
    
    now = datetime.now(timezone.utc)
    
    # Clean old entries
    if key in _rate_limit_store:
        _rate_limit_store[key]["requests"] = [
            req_time for req_time in _rate_limit_store[key]["requests"]
            if (now - req_time).total_seconds() < window_seconds
        ]
    else:
        _rate_limit_store[key] = {"requests": []}
    
    # Check rate limit
    if len(_rate_limit_store[key]["requests"]) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Try again in {window_seconds} seconds."
        )
    
    # Record request
    _rate_limit_store[key]["requests"].append(now)


# Security headers middleware
async def security_headers_middleware(request: Request, call_next):
    """Add security headers to all responses"""
    response = await call_next(request)
    
    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"
    
    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # XSS protection
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # Referrer policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Content Security Policy (adjust as needed)
    csp = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self'; "
        "connect-src 'self' ws: wss: http: https:;"
    )
    response.headers["Content-Security-Policy"] = csp
    
    return response


# Request validation utilities
MAX_REQUEST_SIZE = 10 * 1024 * 1024  # 10MB

def validate_request_size(body: bytes) -> None:
    """Validate request body size"""
    if len(body) > MAX_REQUEST_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Request body too large. Max size: {MAX_REQUEST_SIZE} bytes"
        )


def validate_websocket_token(token: str) -> Optional[Dict[str, Any]]:
    """Validate JWT token for WebSocket connections"""
    if not token:
        return None
    return decode_token(token)
