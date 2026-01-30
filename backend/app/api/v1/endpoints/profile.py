"""
Profile endpoints for user context management.
"""
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, CurrentUser
from app.schemas.user import UserResponse, ProfileUpdate

router = APIRouter()


@router.get("", response_model=UserResponse)
async def get_profile(current_user: CurrentUser):
    """
    Get current user's full profile and AI context.
    
    Returns:
        - User info (id, email, status)
        - AI Context: profile, patterns, insights, goals, memory
    """
    return current_user


@router.patch("", response_model=UserResponse)
async def update_profile(
    request: ProfileUpdate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Update user profile context.
    
    Only updates the `profile` JSONB field.
    Other context fields (patterns, goals, etc.) are managed by AI agents.
    """
    if request.profile is not None:
        # Merge with existing profile (don't overwrite entirely)
        existing_profile = current_user.profile or {}
        
        # Deep merge for nested keys
        for key, value in request.profile.items():
            if isinstance(value, dict) and isinstance(existing_profile.get(key), dict):
                existing_profile[key] = {**existing_profile[key], **value}
            else:
                existing_profile[key] = value
        
        current_user.profile = existing_profile
        db.commit()
        db.refresh(current_user)
    
    return current_user
