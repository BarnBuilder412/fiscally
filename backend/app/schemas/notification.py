"""Schemas for push notification token registration."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class PushTokenRegisterRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=400)
    platform: Literal["ios", "android", "web", "unknown"] = "unknown"

    @field_validator("token")
    @classmethod
    def normalize_token(cls, value: str) -> str:
        token = value.strip()
        if not token:
            raise ValueError("token is required")
        return token


class PushTokenUnregisterRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=400)

    @field_validator("token")
    @classmethod
    def normalize_token(cls, value: str) -> str:
        token = value.strip()
        if not token:
            raise ValueError("token is required")
        return token


class PushTokenResponse(BaseModel):
    success: bool = True
    active_token_count: int = 0
    message: str = "ok"
