"""Localization and PPP helpers for user budgeting context."""
from __future__ import annotations

from typing import Any, Dict


COUNTRY_CONFIG: Dict[str, Dict[str, Any]] = {
    "IN": {"currency": "INR", "locale": "en-IN", "ppp_multiplier": 1.00},
    "US": {"currency": "USD", "locale": "en-US", "ppp_multiplier": 2.75},
    "GB": {"currency": "GBP", "locale": "en-GB", "ppp_multiplier": 2.20},
    "AE": {"currency": "AED", "locale": "en-AE", "ppp_multiplier": 2.10},
    "SG": {"currency": "SGD", "locale": "en-SG", "ppp_multiplier": 1.95},
    "CA": {"currency": "CAD", "locale": "en-CA", "ppp_multiplier": 2.05},
    "AU": {"currency": "AUD", "locale": "en-AU", "ppp_multiplier": 2.00},
    "DE": {"currency": "EUR", "locale": "de-DE", "ppp_multiplier": 2.15},
}


DEFAULT_COUNTRY = "IN"


def get_country_config(country_code: str | None) -> Dict[str, Any]:
    """Return localization config for country code with fallback."""
    if not country_code:
        return COUNTRY_CONFIG[DEFAULT_COUNTRY]
    return COUNTRY_CONFIG.get(country_code.upper(), COUNTRY_CONFIG[DEFAULT_COUNTRY])


def apply_profile_location_defaults(profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ensure profile has sensible currency/locale defaults from location.

    Profile shape (subset):
    {
      "identity": {"currency": "...", "locale": "..."},
      "location": {"country_code": "IN", "city": "...", ...}
    }
    """
    identity = profile.get("identity", {}) if isinstance(profile.get("identity"), dict) else {}
    location = profile.get("location", {}) if isinstance(profile.get("location"), dict) else {}

    config = get_country_config(location.get("country_code"))

    if not identity.get("currency"):
        identity["currency"] = config["currency"]
    if not identity.get("locale"):
        identity["locale"] = config["locale"]

    location.setdefault("ppp_multiplier", config["ppp_multiplier"])
    profile["identity"] = identity
    profile["location"] = location
    return profile


def get_profile_ppp_multiplier(profile: Dict[str, Any]) -> float:
    """Get budget multiplier for locale/PPP-aware planning."""
    location = profile.get("location", {}) if isinstance(profile.get("location"), dict) else {}
    raw = location.get("ppp_multiplier")
    try:
        return float(raw)
    except (TypeError, ValueError):
        pass
    config = get_country_config(location.get("country_code"))
    return float(config["ppp_multiplier"])
