from datetime import datetime
from typing import Any, Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr


class UserCreate(UserBase):
    """Schema for creating a new user (internal use)."""
    hashed_password: str


class UserResponse(BaseModel):
    """Response schema for user data (excludes sensitive fields)."""
    id: UUID
    email: EmailStr
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None
    
    # AI Context (returned for profile endpoint)
    profile: dict[str, Any] = {}
    patterns: dict[str, Any] = {}
    insights: dict[str, Any] = {}
    goals: dict[str, Any] = {}
    memory: dict[str, Any] = {}
    
    class Config:
        from_attributes = True  # Allows creating from SQLAlchemy model


class UserInDB(UserBase):
    """Schema representing user as stored in database."""
    id: UUID
    hashed_password: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    refresh_token_hash: Optional[str] = None
    
    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    """Schema for updating user profile context."""
    profile: Optional[dict[str, Any]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "profile": {
                    "identity": {
                        "name": "Kaushal",
                        "currency": "INR",
                        "income_range": "75k-1L",
                        "payday": 1
                    },
                    "preferences": {
                        "notification_style": "actionable",
                        "digest_day": "sunday",
                        "voice_enabled": True,
                        "language": "en"
                    }
                }
            }
        }
