"""
Google OAuth ID token verification.

Verifies tokens issued by Google Sign-In on the mobile client,
then returns the user's profile claims.
"""
import logging
from typing import Any

from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from fastapi import HTTPException, status

from app.config import get_settings

logger = logging.getLogger(__name__)

# Reusable transport (keeps a session pool)
_transport = google_requests.Request()


def verify_google_id_token(token: str) -> dict[str, Any]:
    """
    Verify a Google ID token and return user info.

    Args:
        token: The ID token string from Google Sign-In on the client.

    Returns:
        dict with keys: email, name, picture, google_sub

    Raises:
        HTTPException 401 if verification fails.
        HTTPException 500 if Google client ID is not configured.
    """
    settings = get_settings()

    if not settings.google_client_id:
        logger.error("GOOGLE_CLIENT_ID is not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google Sign-In is not configured on this server",
        )

    try:
        id_info = google_id_token.verify_oauth2_token(
            token,
            _transport,
            audience=settings.google_client_id,
        )

        # Ensure the token was issued by Google
        if id_info.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
            raise ValueError("Invalid issuer")

        return {
            "email": id_info["email"],
            "name": id_info.get("name", ""),
            "picture": id_info.get("picture"),
            "google_sub": id_info["sub"],
            "email_verified": id_info.get("email_verified", False),
        }

    except ValueError as e:
        logger.warning("Google ID token verification failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token",
        )
