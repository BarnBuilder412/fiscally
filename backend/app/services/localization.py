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

# Locality adjustment factors used only when location-aware budgeting is enabled.
LOCALITY_TIER_MULTIPLIERS: Dict[str, float] = {
    "metro": 1.12,
    "urban": 1.05,
    "suburban": 0.98,
    "rural": 0.90,
}

# City aliases to infer a metro tier when explicit tier is not provided.
METRO_CITY_ALIASES = {
    "mumbai",
    "new delhi",
    "delhi",
    "bengaluru",
    "bangalore",
    "hyderabad",
    "chennai",
    "pune",
    "kolkata",
    "gurugram",
    "gurgaon",
    "noida",
    "new york",
    "san francisco",
    "los angeles",
    "london",
    "dubai",
    "singapore",
    "toronto",
    "sydney",
    "berlin",
}


def _normalize_city(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip().lower()


def _is_location_budgeting_enabled(profile: Dict[str, Any]) -> bool:
    preferences = profile.get("preferences", {}) if isinstance(profile.get("preferences"), dict) else {}
    return bool(preferences.get("location_budgeting_enabled"))


def _infer_locality_tier(location: Dict[str, Any]) -> str:
    explicit = str(location.get("locality_tier", "")).strip().lower()
    if explicit in LOCALITY_TIER_MULTIPLIERS:
        return explicit

    city = _normalize_city(location.get("city"))
    if city in METRO_CITY_ALIASES:
        return "metro"
    return "urban"


def _resolve_locality_multiplier(location: Dict[str, Any]) -> float:
    raw = location.get("locality_multiplier")
    try:
        parsed = float(raw)
        if parsed > 0:
            return parsed
    except (TypeError, ValueError):
        pass

    tier = _infer_locality_tier(location)
    return LOCALITY_TIER_MULTIPLIERS.get(tier, 1.0)


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

    location.setdefault("locality_tier", _infer_locality_tier(location))
    location.setdefault("locality_multiplier", _resolve_locality_multiplier(location))
    location.setdefault("ppp_multiplier", config["ppp_multiplier"])
    profile["identity"] = identity
    profile["location"] = location
    return profile


def get_profile_ppp_multiplier(profile: Dict[str, Any]) -> float:
    """
    Get budget multiplier for locale/PPP-aware planning.

    Returns `1.0` when location-aware budgeting is disabled.
    """
    if not _is_location_budgeting_enabled(profile):
        return 1.0

    location = profile.get("location", {}) if isinstance(profile.get("location"), dict) else {}
    raw = location.get("ppp_multiplier")
    try:
        base_multiplier = float(raw)
    except (TypeError, ValueError):
        config = get_country_config(location.get("country_code"))
        base_multiplier = float(config["ppp_multiplier"])

    locality_multiplier = _resolve_locality_multiplier(location)
    return round(base_multiplier * locality_multiplier, 4)
