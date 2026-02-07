"""
Authentication endpoints for user signup, login, and token management.
"""
from datetime import datetime
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, CurrentUser
from app.models.user import User
from app.schemas.auth import (
    SignupRequest,
    LoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    MessageResponse,
)
from app.schemas.user import UserResponse
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_token,
    verify_token_hash,
)
from app.config import get_settings
from app.services.localization import apply_profile_location_defaults

router = APIRouter()
settings = get_settings()


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: SignupRequest, db: Annotated[Session, Depends(get_db)]):
    """
    Register a new user account.
    
    - Validates email uniqueness
    - Hashes password with bcrypt
    - Creates user with default empty context
    - Returns access + refresh tokens
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    default_profile = apply_profile_location_defaults({
        "preferences": {"location_budgeting_enabled": False},
    })
    user = User(
        email=request.email,
        hashed_password=hash_password(request.password),
        # Initialize empty context JSONB fields
        profile=default_profile,
        patterns={},
        insights={},
        goals={},
        memory={},
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Generate tokens
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    
    # Store hashed refresh token for rotation/invalidation
    user.refresh_token_hash = hash_token(refresh_token)
    db.commit()
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Annotated[Session, Depends(get_db)]):
    """
    Authenticate user and return JWT tokens.
    
    - Verifies email exists and account is active
    - Validates password against stored hash
    - Updates last_login_at timestamp
    - Returns new access + refresh tokens
    """
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    # Update last login timestamp
    user.last_login_at = datetime.utcnow()
    
    # Generate tokens
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    
    # Store hashed refresh token (invalidates any previous refresh tokens)
    user.refresh_token_hash = hash_token(refresh_token)
    db.commit()
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest, db: Annotated[Session, Depends(get_db)]):
    """
    Get new access token using refresh token.
    
    Implements refresh token rotation:
    - Validates the refresh token
    - Verifies it matches the stored hash (prevents reuse of old tokens)
    - Issues new access + refresh token pair
    - Updates stored refresh token hash
    """
    # Decode and validate refresh token
    payload = decode_refresh_token(request.refresh_token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Find user
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    # Verify refresh token matches stored hash (token rotation security)
    if not user.refresh_token_hash or not verify_token_hash(request.refresh_token, user.refresh_token_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate new token pair
    access_token = create_access_token(subject=str(user.id))
    new_refresh_token = create_refresh_token(subject=str(user.id))
    
    # Rotate: store new refresh token hash
    user.refresh_token_hash = hash_token(new_refresh_token)
    db.commit()
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    """
    Logout user by invalidating their refresh token.
    
    - Requires valid access token
    - Clears the stored refresh token hash
    - User must re-authenticate to get new tokens
    """
    # Invalidate refresh token by clearing the hash
    current_user.refresh_token_hash = None
    db.commit()
    
    return MessageResponse(message="Successfully logged out")


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: CurrentUser):
    """
    Get current authenticated user's profile and context.
    
    Returns user info including all AI context fields:
    - profile, patterns, insights, goals, memory
    """
    return current_user
