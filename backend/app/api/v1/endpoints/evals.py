"""Evaluation artifact endpoints."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser

logger = logging.getLogger(__name__)
router = APIRouter()

LATEST_ARTIFACT_PATH = (
    Path(__file__).resolve().parents[4] / "eval_artifacts" / "latest.json"
)


def _coerce_float_dict(raw: dict[str, Any]) -> Dict[str, float]:
    output: Dict[str, float] = {}
    for key, value in raw.items():
        try:
            output[key] = float(value)
        except (TypeError, ValueError):
            continue
    return output


class EvalLatestResponse(BaseModel):
    """Latest evaluation artifact summary."""

    available: bool
    source_path: str
    generated_at: Optional[str] = None
    experiment: Optional[str] = None
    gate_passed: Optional[bool] = None
    gate_failure_count: Optional[int] = None
    readiness_score: Optional[float] = None
    readiness_target: Optional[float] = None
    metrics: Dict[str, float] = Field(default_factory=dict)
    thresholds: Dict[str, float] = Field(default_factory=dict)
    deltas: Dict[str, float] = Field(default_factory=dict)
    operational_metrics: Dict[str, float] = Field(default_factory=dict)
    notes: Optional[str] = None
    raw: Dict[str, Any] = Field(default_factory=dict)


@router.get("/latest", response_model=EvalLatestResponse)
async def get_latest_eval_artifact(_current_user: CurrentUser):
    """
    Return latest local evaluation artifact summary.

    The file is expected at `backend/eval_artifacts/latest.json`.
    """
    if not LATEST_ARTIFACT_PATH.exists():
        return EvalLatestResponse(
            available=False,
            source_path=str(LATEST_ARTIFACT_PATH),
            notes="No evaluation artifact found yet. Run eval experiments and publish latest.json.",
        )

    try:
        payload = json.loads(LATEST_ARTIFACT_PATH.read_text(encoding="utf-8"))
    except Exception:
        logger.exception("Failed reading eval artifact at %s", LATEST_ARTIFACT_PATH)
        return EvalLatestResponse(
            available=False,
            source_path=str(LATEST_ARTIFACT_PATH),
            notes="Evaluation artifact exists but could not be parsed.",
        )

    metrics = payload.get("metrics") if isinstance(payload.get("metrics"), dict) else {}
    thresholds = payload.get("thresholds") if isinstance(payload.get("thresholds"), dict) else {}
    deltas = payload.get("deltas") if isinstance(payload.get("deltas"), dict) else {}
    operational_metrics = (
        payload.get("operational_metrics")
        if isinstance(payload.get("operational_metrics"), dict)
        else {}
    )

    return EvalLatestResponse(
        available=True,
        source_path=str(LATEST_ARTIFACT_PATH),
        generated_at=payload.get("generated_at"),
        experiment=payload.get("experiment"),
        gate_passed=payload.get("gate_passed"),
        gate_failure_count=payload.get("gate_failure_count"),
        readiness_score=payload.get("readiness_score"),
        readiness_target=payload.get("readiness_target"),
        metrics=_coerce_float_dict(metrics),
        thresholds=_coerce_float_dict(thresholds),
        deltas=_coerce_float_dict(deltas),
        operational_metrics=_coerce_float_dict(operational_metrics),
        notes=payload.get("notes"),
        raw=payload,
    )
