"""
Profile endpoints for user context management.
"""
from copy import deepcopy
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.api.deps import get_db, CurrentUser
from app.schemas.user import UserResponse, ProfileUpdate
from app.services.localization import apply_profile_location_defaults

router = APIRouter()


def _coerce_profile_financial(profile: dict[str, Any]) -> dict[str, Any]:
    """Normalize financial fields to stable numeric/string primitives."""
    financial = profile.get("financial")
    if not isinstance(financial, dict):
        return profile

    for key in ("monthly_salary", "monthly_budget"):
        value = financial.get(key)
        if value is None:
            continue
        if isinstance(value, str):
            cleaned = value.replace(",", "").strip()
            if not cleaned:
                financial[key] = None
                continue
            try:
                financial[key] = int(float(cleaned))
            except ValueError:
                financial[key] = None
        elif isinstance(value, (int, float)):
            financial[key] = int(value)
        else:
            financial[key] = None

    for key in ("salary_range_id", "budget_range_id"):
        value = financial.get(key)
        if value is None:
            continue
        financial[key] = str(value)

    profile["financial"] = financial
    return profile


def _drop_financial_memory_facts(memory: dict[str, Any] | None) -> tuple[dict[str, Any], bool]:
    """Remove stale memory facts about salary/income/budget after profile financial updates."""
    if not isinstance(memory, dict):
        return {"facts": [], "conversation_summary": ""}, False

    facts = memory.get("facts")
    if not isinstance(facts, list):
        return memory, False

    changed = False
    filtered_facts = []
    for fact in facts:
        text = ""
        if isinstance(fact, dict):
            text = str(fact.get("fact") or fact.get("content") or fact.get("text") or "").lower()
        elif isinstance(fact, str):
            text = fact.lower()
        if any(token in text for token in ("income", "salary", "budget", "monthly pay", "monthly income")):
            changed = True
            continue
        filtered_facts.append(fact)

    if changed:
        memory["facts"] = filtered_facts
    return memory, changed


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
        existing_profile = deepcopy(current_user.profile or {})
        
        # Deep merge for nested keys
        for key, value in request.profile.items():
            if isinstance(value, dict) and isinstance(existing_profile.get(key), dict):
                existing_profile[key] = {**existing_profile[key], **value}
            else:
                existing_profile[key] = value

        financial_updated = "financial" in request.profile
        existing_profile = _coerce_profile_financial(existing_profile)
        existing_profile = apply_profile_location_defaults(existing_profile)
        
        current_user.profile = existing_profile
        flag_modified(current_user, "profile")
        if financial_updated:
            cleaned_memory, memory_changed = _drop_financial_memory_facts(current_user.memory or {})
            if memory_changed:
                current_user.memory = cleaned_memory
                flag_modified(current_user, "memory")
        db.commit()
        db.refresh(current_user)
    
    return current_user
