from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    """Request schema for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "securepassword123"
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


class RefreshTokenRequest(BaseModel):
    """Request schema for token refresh."""
    refresh_token: str


class TokenResponse(BaseModel):
    """Response schema containing JWT tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access token expires
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 900
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
