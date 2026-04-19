"""
Authentication endpoints for user signup, login, Google auth, password reset,
token management, and account deletion.
"""
import secrets
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, CurrentUser
from app.models.user import User
from app.schemas.auth import (
    SignupRequest,
    LoginRequest,
    GoogleAuthRequest,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    DeleteAccountRequest,
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
from app.core.google_auth import verify_google_id_token
from app.config import get_settings
from app.services.localization import apply_profile_location_defaults

router = APIRouter()
settings = get_settings()


def _build_token_response(user: User, db: Session) -> TokenResponse:
    """Generate tokens for a user and persist the refresh token hash."""
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))

    user.refresh_token_hash = hash_token(refresh_token)
    user.last_login_at = datetime.utcnow()
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        auth_provider=user.auth_provider or "email",
    )


# ---------------------------------------------------------------------------
# Email auth
# ---------------------------------------------------------------------------

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: SignupRequest, db: Annotated[Session, Depends(get_db)]):
    """
    Register a new user account.

    - Validates email uniqueness
    - Hashes password with bcrypt
    - Creates user with default empty context
    - Optionally stores name in profile
    - Returns access + refresh tokens
    """
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    default_profile = apply_profile_location_defaults({
        "preferences": {"location_budgeting_enabled": False},
    })

    # If a name was provided, store it in the profile
    if request.name:
        default_profile.setdefault("identity", {})["name"] = request.name

    user = User(
        email=request.email,
        hashed_password=hash_password(request.password),
        auth_provider="email",
        profile=default_profile,
        patterns={},
        insights={},
        goals={},
        memory={},
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return _build_token_response(user, db)


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Annotated[Session, Depends(get_db)]):
    """
    Authenticate user and return JWT tokens.

    - Verifies email exists and account is active
    - Validates password against stored hash
    - Blocks Google-only users from email login with helpful message
    - Returns new access + refresh tokens
    """
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Google-only user trying email login
    if user.auth_provider == "google" and not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses Google Sign-In. Please sign in with Google.",
        )

    if not user.hashed_password or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    return _build_token_response(user, db)


# ---------------------------------------------------------------------------
# Google auth
# ---------------------------------------------------------------------------

@router.post("/google", response_model=TokenResponse)
async def google_auth(request: GoogleAuthRequest, db: Annotated[Session, Depends(get_db)]):
    """
    Authenticate or register via Google Sign-In.

    Flow:
    1. Verify the Google ID token
    2. If user with this google_sub exists → login
    3. If user with this email exists → link Google account
    4. Otherwise → create new user
    """
    google_info = verify_google_id_token(request.id_token)

    email = google_info["email"]
    google_sub = google_info["google_sub"]
    name = google_info.get("name", "")

    # 1. Check by google_sub first (previously linked account)
    user = db.query(User).filter(User.google_sub == google_sub).first()

    if user:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated",
            )
        return _build_token_response(user, db)

    # 2. Check by email (existing email user → link Google)
    user = db.query(User).filter(User.email == email).first()

    if user:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated",
            )
        # Link Google account
        user.google_sub = google_sub
        if user.auth_provider == "email":
            # Keep as email if they already have a password, but allow Google too
            pass
        db.commit()
        return _build_token_response(user, db)

    # 3. New user → register
    default_profile = apply_profile_location_defaults({
        "preferences": {"location_budgeting_enabled": False},
    })
    if name:
        default_profile.setdefault("identity", {})["name"] = name

    user = User(
        email=email,
        hashed_password=None,
        auth_provider="google",
        google_sub=google_sub,
        is_verified=True,  # Google email is already verified
        profile=default_profile,
        patterns={},
        insights={},
        goals={},
        memory={},
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return _build_token_response(user, db)


# ---------------------------------------------------------------------------
# Token management
# ---------------------------------------------------------------------------

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
            detail="User account is deactivated",
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
        auth_provider=user.auth_provider or "email",
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    """
    Logout user by invalidating their refresh token.
    """
    current_user.refresh_token_hash = None
    db.commit()

    return MessageResponse(message="Successfully logged out")


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------

@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(request: ForgotPasswordRequest, db: Annotated[Session, Depends(get_db)]):
    """
    Request a password reset OTP.

    Generates a 6-digit OTP valid for 15 minutes.
    For MVP, the OTP is returned in the response.
    In production, this would send via email.
    """
    user = db.query(User).filter(User.email == request.email).first()

    # Always return success to prevent email enumeration
    if not user:
        return MessageResponse(message="If this email is registered, a reset code has been sent.")

    # Google-only users can't reset password
    if user.auth_provider == "google" and not user.hashed_password:
        return MessageResponse(message="If this email is registered, a reset code has been sent.")

    # Generate 6-digit OTP
    otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])

    user.password_reset_token = hash_token(otp)
    user.password_reset_expires = datetime.utcnow() + timedelta(minutes=15)
    db.commit()

    # MVP: Return OTP directly. Production: send via email.
    return MessageResponse(message=f"Your password reset code is: {otp}")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(request: ResetPasswordRequest, db: Annotated[Session, Depends(get_db)]):
    """
    Reset password using OTP.

    Verifies the OTP matches and hasn't expired, then updates the password.
    """
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code",
        )

    # Check OTP exists and hasn't expired
    if not user.password_reset_token or not user.password_reset_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code",
        )

    if datetime.utcnow() > user.password_reset_expires:
        # Clear expired token
        user.password_reset_token = None
        user.password_reset_expires = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset code has expired. Please request a new one.",
        )

    # Verify OTP
    if not verify_token_hash(request.otp, user.password_reset_token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code",
        )

    # Update password
    user.hashed_password = hash_password(request.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None

    # If user was Google-only, they now also have email auth
    if user.auth_provider == "google":
        user.auth_provider = "email"  # They can now use both

    db.commit()

    return MessageResponse(message="Password has been reset successfully")


# ---------------------------------------------------------------------------
# Account management
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: CurrentUser):
    """
    Get current authenticated user's profile and context.
    """
    return current_user


@router.delete("/account", response_model=MessageResponse)
async def delete_account(
    request: DeleteAccountRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Delete (deactivate) the current user's account.

    - Email users must provide their password for confirmation
    - Google users just need to confirm
    - Soft-deletes: sets is_active=False and clears PII
    """
    if not request.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must confirm account deletion",
        )

    # Email users must verify password
    if current_user.auth_provider == "email" and current_user.hashed_password:
        if not request.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password is required to delete an email-based account",
            )
        if not verify_password(request.password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password",
            )

    # Soft-delete: deactivate and clear PII
    current_user.is_active = False
    current_user.refresh_token_hash = None
    current_user.hashed_password = None
    current_user.google_sub = None
    current_user.password_reset_token = None
    current_user.password_reset_expires = None

    # Clear context data
    current_user.profile = {}
    current_user.patterns = {}
    current_user.insights = {}
    current_user.goals = {}
    current_user.memory = {}

    db.commit()

    return MessageResponse(message="Account has been deleted successfully")
