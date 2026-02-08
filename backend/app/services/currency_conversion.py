"""Currency conversion helpers for cross-currency transaction ingestion."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, Tuple

import httpx


class CurrencyConversionError(RuntimeError):
    """Raised when live FX conversion cannot be completed."""


@dataclass
class _CachedRate:
    rate: float
    expires_at: datetime


_RATE_CACHE: Dict[Tuple[str, str], _CachedRate] = {}
_CACHE_TTL = timedelta(minutes=30)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _read_cache(from_currency: str, to_currency: str) -> float | None:
    key = (from_currency, to_currency)
    cached = _RATE_CACHE.get(key)
    if not cached:
        return None
    if cached.expires_at <= _now_utc():
        _RATE_CACHE.pop(key, None)
        return None
    return cached.rate


def _write_cache(from_currency: str, to_currency: str, rate: float) -> None:
    _RATE_CACHE[(from_currency, to_currency)] = _CachedRate(
        rate=rate,
        expires_at=_now_utc() + _CACHE_TTL,
    )


async def _fetch_rate_frankfurter(from_currency: str, to_currency: str) -> float:
    async with httpx.AsyncClient(timeout=6.0) as client:
        response = await client.get(
            "https://api.frankfurter.app/latest",
            params={"from": from_currency, "to": to_currency},
        )
        response.raise_for_status()
        payload = response.json()
        rates = payload.get("rates", {})
        rate = rates.get(to_currency)
        if rate is None:
            raise CurrencyConversionError("FX provider did not return the target currency rate")
        return float(rate)


async def _fetch_rate_open_er_api(from_currency: str, to_currency: str) -> float:
    async with httpx.AsyncClient(timeout=6.0) as client:
        response = await client.get(f"https://open.er-api.com/v6/latest/{from_currency}")
        response.raise_for_status()
        payload = response.json()
        if payload.get("result") != "success":
            raise CurrencyConversionError("Backup FX provider returned an unsuccessful response")
        rates = payload.get("rates", {})
        rate = rates.get(to_currency)
        if rate is None:
            raise CurrencyConversionError("Backup FX provider did not return target currency")
        return float(rate)


async def get_exchange_rate(from_currency: str, to_currency: str) -> float:
    """
    Resolve a live FX rate for from->to conversion.

    Uses in-memory caching and two public providers for resiliency.
    """
    from_code = from_currency.upper().strip()
    to_code = to_currency.upper().strip()
    if from_code == to_code:
        return 1.0

    cached = _read_cache(from_code, to_code)
    if cached is not None:
        return cached

    providers = (_fetch_rate_frankfurter, _fetch_rate_open_er_api)
    last_error: Exception | None = None
    for provider in providers:
        try:
            rate = await provider(from_code, to_code)
            if rate <= 0:
                raise CurrencyConversionError("FX provider returned a non-positive rate")
            _write_cache(from_code, to_code, rate)
            return rate
        except Exception as exc:  # pragma: no cover - network failures are environment-specific
            last_error = exc
            continue

    raise CurrencyConversionError(
        f"Unable to fetch live FX rate {from_code}->{to_code}"
    ) from last_error


async def convert_amount(
    amount: float,
    from_currency: str,
    to_currency: str,
) -> tuple[float, float]:
    """Convert amount from one currency to another, returning (converted, rate)."""
    from_code = from_currency.upper().strip()
    to_code = to_currency.upper().strip()
    if from_code == to_code:
        return round(float(amount), 2), 1.0

    rate = await get_exchange_rate(from_code, to_code)
    converted = round(float(amount) * rate, 2)
    return converted, rate
