"""Push notification token management endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_db
from app.schemas.notification import (
    PushTokenRegisterRequest,
    PushTokenResponse,
    PushTokenUnregisterRequest,
)
from app.services.notifications import register_push_token, unregister_push_token

router = APIRouter()


@router.post("/register-token", response_model=PushTokenResponse)
async def register_token(
    request: PushTokenRegisterRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    try:
        active_count = register_push_token(
            db,
            current_user,
            token=request.token,
            platform=request.platform,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return PushTokenResponse(
        success=True,
        active_token_count=active_count,
        message="push_token_registered",
    )


@router.post("/unregister-token", response_model=PushTokenResponse)
async def unregister_token(
    request: PushTokenUnregisterRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    try:
        active_count = unregister_push_token(
            db,
            current_user,
            token=request.token,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return PushTokenResponse(
        success=True,
        active_token_count=active_count,
        message="push_token_unregistered",
    )
