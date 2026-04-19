from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    """Request schema for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: Optional[str] = Field(None, max_length=100)

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "securepassword123",
                "name": "Kaushal"
            }
        }


class LoginRequest(BaseModel):
    """Request schema for user login."""
    email: EmailStr
    password: str

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "securepassword123"
            }
        }


class GoogleAuthRequest(BaseModel):
    """Request schema for Google Sign-In."""
    id_token: str = Field(..., description="Google ID token from mobile Sign-In")


class RefreshTokenRequest(BaseModel):
    """Request schema for token refresh."""
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    """Request schema for forgot password – triggers OTP generation."""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Request schema for resetting password with OTP."""
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8, max_length=128)


class DeleteAccountRequest(BaseModel):
    """Request schema for account deletion."""
    password: Optional[str] = Field(None, description="Required for email-auth users")
    confirm: bool = Field(..., description="Must be true to confirm deletion")


class TokenResponse(BaseModel):
    """Response schema containing JWT tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access token expires
    auth_provider: str = "email"  # "email" or "google"

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 900,
                "auth_provider": "email"
            }
        }


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Operation completed successfully"
            }
        }
