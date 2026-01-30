from datetime import datetime, timedelta
from typing import Optional, Any
from passlib.context import CryptContext
from jose import jwt, JWTError

from app.config import get_settings

settings = get_settings()

# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.
    
    Args:
        plain_password: The password in plain text
        hashed_password: The bcrypt hashed password
        
    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: The plain text password
        
    Returns:
        The bcrypt hashed password
    """
    return pwd_context.hash(password)


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        subject: The subject of the token (typically user ID)
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "type": "access",
        "iat": datetime.utcnow(),
    }
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.secret_key, 
        algorithm=settings.algorithm
    )
    return encoded_jwt


def create_refresh_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT refresh token.
    
    Refresh tokens have longer expiry and are used to obtain new access tokens.
    
    Args:
        subject: The subject of the token (typically user ID)
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    
    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "type": "refresh",
        "iat": datetime.utcnow(),
    }
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.secret_key, 
        algorithm=settings.algorithm
    )
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict[str, Any]]:
    """
    Decode and validate a JWT access token.
    
    Args:
        token: The JWT token string
        
    Returns:
        Decoded payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token, 
            settings.secret_key, 
            algorithms=[settings.algorithm]
        )
        
        # Verify it's an access token
        if payload.get("type") != "access":
            return None
            
        return payload
    except JWTError:
        return None


def decode_refresh_token(token: str) -> Optional[dict[str, Any]]:
    """
    Decode and validate a JWT refresh token.
    
    Args:
        token: The JWT token string
        
    Returns:
        Decoded payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token, 
            settings.secret_key, 
            algorithms=[settings.algorithm]
        )
        
        # Verify it's a refresh token
        if payload.get("type") != "refresh":
            return None
            
        return payload
    except JWTError:
        return None


def hash_token(token: str) -> str:
    """
    Hash a token for storage (used for refresh token rotation).
    
    We don't store raw refresh tokens in the database for security.
    Instead, we store a hash and verify against it.
    
    Args:
        token: The token to hash
        
    Returns:
        Hashed token
    """
    return pwd_context.hash(token)


def verify_token_hash(token: str, hashed_token: str) -> bool:
    """
    Verify a token against its stored hash.
    
    Args:
        token: The plain token
        hashed_token: The stored hash
        
    Returns:
        True if token matches hash
    """
    return pwd_context.verify(token, hashed_token)
