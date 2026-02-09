"""Push notification utilities with profile-backed rate limiting."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import logging
from typing import Any, Optional

import httpx
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.config import get_settings
from app.models.user import User

logger = logging.getLogger(__name__)
settings = get_settings()

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
MAX_PUSH_TOKENS_PER_USER = 8


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def _parse_iso(value: Any) -> Optional[datetime]:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None


def _ensure_profile_preferences(user: User) -> tuple[dict[str, Any], dict[str, Any], bool]:
    profile_changed = False
    profile = user.profile if isinstance(user.profile, dict) else {}
    if not isinstance(user.profile, dict):
        profile_changed = True

    preferences = profile.get("preferences")
    if not isinstance(preferences, dict):
        preferences = {}
        profile["preferences"] = preferences
        profile_changed = True

    return profile, preferences, profile_changed


def _write_profile(db: Session, user: User, profile: dict[str, Any]) -> None:
    user.profile = profile
    flag_modified(user, "profile")
    db.add(user)


def _active_push_token_entries(preferences: dict[str, Any]) -> list[dict[str, Any]]:
    entries = preferences.get("push_tokens")
    if not isinstance(entries, list):
        return []
    valid: list[dict[str, Any]] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        token = entry.get("token")
        if not isinstance(token, str) or not token.strip():
            continue
        if entry.get("active", True) is False:
            continue
        valid.append(entry)
    return valid


def _normalized_platform(platform: Optional[str]) -> str:
    value = (platform or "unknown").strip().lower()
    return value if value in {"ios", "android", "web"} else "unknown"


def register_push_token(
    db: Session,
    user: User,
    token: str,
    platform: Optional[str] = None,
) -> int:
    """Register or refresh a push token in user profile preferences."""
    normalized_token = token.strip()
    if not normalized_token:
        raise ValueError("Push token cannot be empty")

    profile, preferences, _ = _ensure_profile_preferences(user)
    tokens = preferences.get("push_tokens")
    if not isinstance(tokens, list):
        tokens = []
        preferences["push_tokens"] = tokens

    now_iso = _iso(_utcnow())
    normalized_device = _normalized_platform(platform)
    found = False
    for entry in tokens:
        if not isinstance(entry, dict):
            continue
        if entry.get("token") == normalized_token:
            entry["platform"] = normalized_device
            entry["active"] = True
            entry["updated_at"] = now_iso
            found = True
            break
    if not found:
        tokens.append(
            {
                "token": normalized_token,
                "platform": normalized_device,
                "active": True,
                "updated_at": now_iso,
            }
        )

    # Keep most recent entries only.
    sortable: list[dict[str, Any]] = []
    for entry in tokens:
        if isinstance(entry, dict) and isinstance(entry.get("token"), str):
            sortable.append(entry)
    sortable.sort(key=lambda item: str(item.get("updated_at", "")), reverse=True)
    preferences["push_tokens"] = sortable[:MAX_PUSH_TOKENS_PER_USER]
    profile["preferences"] = preferences

    _write_profile(db, user, profile)
    db.commit()
    db.refresh(user)

    return len(_active_push_token_entries(preferences))


def unregister_push_token(db: Session, user: User, token: str) -> int:
    """Deactivate a push token for the user."""
    normalized_token = token.strip()
    if not normalized_token:
        raise ValueError("Push token cannot be empty")

    profile, preferences, _ = _ensure_profile_preferences(user)
    tokens = preferences.get("push_tokens")
    changed = False
    if isinstance(tokens, list):
        for entry in tokens:
            if not isinstance(entry, dict):
                continue
            if entry.get("token") == normalized_token and entry.get("active", True):
                entry["active"] = False
                entry["updated_at"] = _iso(_utcnow())
                changed = True
    if changed:
        preferences["push_tokens"] = tokens
        profile["preferences"] = preferences
        _write_profile(db, user, profile)
        db.commit()
        db.refresh(user)

    return len(_active_push_token_entries(preferences))


def _is_notifications_enabled(preferences: dict[str, Any]) -> bool:
    value = preferences.get("notifications_enabled")
    if isinstance(value, bool):
        return value
    return True


def _is_expo_push_token(token: str) -> bool:
    return token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken[")


def _can_send_for_type(
    preferences: dict[str, Any],
    notification_type: str,
    min_interval_minutes: int,
) -> tuple[bool, Optional[int]]:
    sent_map = preferences.get("push_last_sent_at")
    if not isinstance(sent_map, dict):
        return True, None
    last_sent_at = _parse_iso(sent_map.get(notification_type))
    if not last_sent_at:
        return True, None

    now = _utcnow()
    min_interval = timedelta(minutes=max(1, min_interval_minutes))
    elapsed = now - last_sent_at
    if elapsed >= min_interval:
        return True, None

    remaining = min_interval - elapsed
    remaining_minutes = max(1, int(remaining.total_seconds() // 60))
    return False, remaining_minutes


def _mark_sent_now(
    profile: dict[str, Any],
    preferences: dict[str, Any],
    notification_type: str,
) -> None:
    sent_map = preferences.get("push_last_sent_at")
    if not isinstance(sent_map, dict):
        sent_map = {}
    sent_map[notification_type] = _iso(_utcnow())
    preferences["push_last_sent_at"] = sent_map
    profile["preferences"] = preferences


async def _send_expo_push_batch(
    messages: list[dict[str, Any]],
    access_token: Optional[str],
) -> dict[str, Any]:
    headers = {"Content-Type": "application/json"}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(EXPO_PUSH_URL, json=messages, headers=headers)
        response.raise_for_status()
        payload = response.json()
    if isinstance(payload, dict):
        return payload
    return {"data": []}


async def send_rate_limited_push(
    db: Session,
    user: User,
    *,
    notification_type: str,
    title: str,
    body: str,
    data: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """
    Send push notification with per-user/per-type anti-spam throttling.

    Returns metadata with sent/suppressed reasons for observability.
    """
    profile, preferences, _ = _ensure_profile_preferences(user)
    if not _is_notifications_enabled(preferences):
        return {"sent": False, "reason": "disabled_by_user"}

    active_entries = _active_push_token_entries(preferences)
    tokens = [str(entry.get("token")) for entry in active_entries if _is_expo_push_token(str(entry.get("token")))]
    if not tokens:
        return {"sent": False, "reason": "no_active_push_tokens"}

    can_send, retry_in_minutes = _can_send_for_type(
        preferences,
        notification_type=notification_type,
        min_interval_minutes=settings.notification_min_interval_minutes,
    )
    if not can_send:
        return {
            "sent": False,
            "reason": "rate_limited",
            "retry_in_minutes": retry_in_minutes,
        }

    messages = [
        {
            "to": token,
            "title": title,
            "body": body,
            "sound": "default",
            "data": data or {},
            "priority": "high",
        }
        for token in tokens
    ]

    try:
        payload = await _send_expo_push_batch(messages, settings.expo_push_access_token)
    except Exception:
        logger.warning(
            "Push delivery failed user_id=%s type=%s",
            user.id,
            notification_type,
            exc_info=True,
        )
        return {"sent": False, "reason": "delivery_error"}

    results = payload.get("data")
    if not isinstance(results, list):
        results = []

    ok_count = 0
    tokens_to_disable: set[str] = set()
    for idx, result in enumerate(results):
        if not isinstance(result, dict):
            continue
        status = str(result.get("status") or "").lower()
        if status == "ok":
            ok_count += 1
            continue
        details = result.get("details")
        if isinstance(details, dict) and details.get("error") == "DeviceNotRegistered" and idx < len(tokens):
            tokens_to_disable.add(tokens[idx])

    if tokens_to_disable:
        token_entries = preferences.get("push_tokens")
        if isinstance(token_entries, list):
            for entry in token_entries:
                if not isinstance(entry, dict):
                    continue
                if entry.get("token") in tokens_to_disable:
                    entry["active"] = False
                    entry["updated_at"] = _iso(_utcnow())
            preferences["push_tokens"] = token_entries
            profile["preferences"] = preferences
            _write_profile(db, user, profile)
            db.commit()
            db.refresh(user)

    if ok_count <= 0:
        return {"sent": False, "reason": "provider_rejected"}

    _mark_sent_now(profile, preferences, notification_type)
    _write_profile(db, user, profile)
    db.commit()
    db.refresh(user)
    return {"sent": True, "sent_count": ok_count}
