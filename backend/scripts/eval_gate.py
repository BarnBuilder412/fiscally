#!/usr/bin/env python3
"""Simple evaluation regression gate for hackathon/demo workflows."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, Optional


DEFAULT_ARTIFACT = Path(__file__).resolve().parents[1] / "eval_artifacts" / "latest.json"
DEFAULT_THRESHOLDS: Dict[str, float] = {
    "categorization_accuracy": 0.88,
    "chat_helpfulness": 0.86,
    "voice_parsing_accuracy": 0.86,
    "spend_class_accuracy": 0.80,
    "receipt_parsing_accuracy": 0.82,
    "anomaly_detection_accuracy": 0.80,
}


def _parse_threshold_override(values: list[str]) -> Dict[str, float]:
    overrides: Dict[str, float] = {}
    for raw in values:
        if "=" not in raw:
            raise ValueError(f"Invalid --threshold '{raw}'. Use metric=value format.")
        name, value = raw.split("=", 1)
        metric_name = name.strip()
        if not metric_name:
            raise ValueError(f"Invalid threshold metric name in '{raw}'.")
        try:
            overrides[metric_name] = float(value)
        except ValueError as exc:
            raise ValueError(f"Invalid threshold value in '{raw}'.") from exc
    return overrides


def evaluate_payload(
    payload: Dict[str, Any],
    threshold_overrides: Optional[Dict[str, float]] = None,
    baseline_payload: Optional[Dict[str, Any]] = None,
    max_fallback_rate: Optional[float] = None,
    min_feedback_score: Optional[float] = None,
    max_fallback_regression: Optional[float] = None,
    max_feedback_drop: Optional[float] = None,
    min_readiness_score: Optional[float] = None,
) -> Dict[str, Any]:
    metrics = payload.get("metrics") if isinstance(payload.get("metrics"), dict) else {}
    artifact_thresholds = payload.get("thresholds") if isinstance(payload.get("thresholds"), dict) else {}
    thresholds: Dict[str, float] = dict(DEFAULT_THRESHOLDS)
    thresholds.update({k: float(v) for k, v in artifact_thresholds.items()})
    if threshold_overrides:
        thresholds.update(threshold_overrides)

    checks: list[Dict[str, Any]] = []

    # Metric threshold checks
    for metric, threshold in sorted(thresholds.items()):
        if metric not in metrics:
            checks.append(
                {
                    "type": "metric",
                    "metric": metric,
                    "status": "MISS",
                    "reason": "metric not present",
                    "threshold": threshold,
                }
            )
            continue
        value = float(metrics[metric])
        status = "PASS" if value >= threshold else "FAIL"
        checks.append(
            {
                "type": "metric",
                "metric": metric,
                "status": status,
                "value": value,
                "threshold": threshold,
            }
        )

    operational = payload.get("operational_metrics") if isinstance(payload.get("operational_metrics"), dict) else {}
    fallback_rate = operational.get("fallback_rate")
    feedback_score = operational.get("chat_feedback_score")

    # Operational absolute checks
    if max_fallback_rate is not None:
        if fallback_rate is None:
            checks.append(
                {
                    "type": "operational",
                    "metric": "fallback_rate",
                    "status": "MISS",
                    "reason": "fallback_rate missing",
                    "threshold": max_fallback_rate,
                }
            )
        else:
            value = float(fallback_rate)
            status = "PASS" if value <= max_fallback_rate else "FAIL"
            checks.append(
                {
                    "type": "operational",
                    "metric": "fallback_rate",
                    "status": status,
                    "value": value,
                    "threshold": max_fallback_rate,
                }
            )

    if min_feedback_score is not None:
        if feedback_score is None:
            checks.append(
                {
                    "type": "operational",
                    "metric": "chat_feedback_score",
                    "status": "MISS",
                    "reason": "chat_feedback_score missing",
                    "threshold": min_feedback_score,
                }
            )
        else:
            value = float(feedback_score)
            status = "PASS" if value >= min_feedback_score else "FAIL"
            checks.append(
                {
                    "type": "operational",
                    "metric": "chat_feedback_score",
                    "status": status,
                    "value": value,
                    "threshold": min_feedback_score,
                }
            )

    # Regression checks against baseline artifact.
    if baseline_payload:
        baseline_operational = (
            baseline_payload.get("operational_metrics")
            if isinstance(baseline_payload.get("operational_metrics"), dict)
            else {}
        )
        baseline_fallback = baseline_operational.get("fallback_rate")
        baseline_feedback = baseline_operational.get("chat_feedback_score")

        if max_fallback_regression is not None and fallback_rate is not None and baseline_fallback is not None:
            delta = float(fallback_rate) - float(baseline_fallback)
            status = "PASS" if delta <= max_fallback_regression else "FAIL"
            checks.append(
                {
                    "type": "regression",
                    "metric": "fallback_rate_delta",
                    "status": status,
                    "value": delta,
                    "threshold": max_fallback_regression,
                }
            )

        if max_feedback_drop is not None and feedback_score is not None and baseline_feedback is not None:
            drop = float(baseline_feedback) - float(feedback_score)
            status = "PASS" if drop <= max_feedback_drop else "FAIL"
            checks.append(
                {
                    "type": "regression",
                    "metric": "chat_feedback_drop",
                    "status": status,
                    "value": drop,
                    "threshold": max_feedback_drop,
                }
            )

    if min_readiness_score is not None:
        readiness_score = payload.get("readiness_score")
        if readiness_score is None:
            checks.append(
                {
                    "type": "readiness",
                    "metric": "readiness_score",
                    "status": "MISS",
                    "reason": "readiness_score missing",
                    "threshold": min_readiness_score,
                }
            )
        else:
            value = float(readiness_score)
            status = "PASS" if value >= min_readiness_score else "FAIL"
            checks.append(
                {
                    "type": "readiness",
                    "metric": "readiness_score",
                    "status": status,
                    "value": value,
                    "threshold": min_readiness_score,
                }
            )

    failures = [check for check in checks if check["status"] in {"FAIL", "MISS"}]
    return {
        "gate_passed": len(failures) == 0,
        "checks": checks,
        "failure_count": len(failures),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Fail if eval metrics drop below thresholds.")
    parser.add_argument(
        "--artifact",
        type=Path,
        default=DEFAULT_ARTIFACT,
        help=f"Path to evaluation artifact JSON (default: {DEFAULT_ARTIFACT})",
    )
    parser.add_argument(
        "--threshold",
        action="append",
        default=[],
        help="Override threshold using metric=value (repeatable).",
    )
    parser.add_argument(
        "--baseline-artifact",
        type=Path,
        default=None,
        help="Optional baseline artifact JSON for regression checks.",
    )
    parser.add_argument(
        "--max-fallback-rate",
        type=float,
        default=None,
        help="Fail if operational_metrics.fallback_rate exceeds this value.",
    )
    parser.add_argument(
        "--min-feedback-score",
        type=float,
        default=None,
        help="Fail if operational_metrics.chat_feedback_score drops below this value.",
    )
    parser.add_argument(
        "--max-fallback-regression",
        type=float,
        default=None,
        help="Fail if fallback_rate increases by more than this amount vs baseline.",
    )
    parser.add_argument(
        "--max-feedback-drop",
        type=float,
        default=None,
        help="Fail if chat_feedback_score drops by more than this amount vs baseline.",
    )
    parser.add_argument(
        "--min-readiness-score",
        type=float,
        default=None,
        help="Fail if artifact readiness_score is below this value.",
    )
    args = parser.parse_args()

    artifact_path = args.artifact
    if not artifact_path.exists():
        print(f"❌ Artifact not found: {artifact_path}")
        print("   Generate backend/eval_artifacts/latest.json first.")
        return 2

    try:
        payload = json.loads(artifact_path.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"❌ Failed to parse artifact: {artifact_path}")
        print(f"   Error: {exc}")
        return 2

    baseline_payload = None
    if args.baseline_artifact:
        if not args.baseline_artifact.exists():
            print(f"❌ Baseline artifact not found: {args.baseline_artifact}")
            return 2
        try:
            baseline_payload = json.loads(args.baseline_artifact.read_text(encoding="utf-8"))
        except Exception as exc:
            print(f"❌ Failed to parse baseline artifact: {args.baseline_artifact}")
            print(f"   Error: {exc}")
            return 2

    try:
        threshold_overrides = _parse_threshold_override(args.threshold)
    except ValueError as exc:
        print(f"❌ {exc}")
        return 2

    metrics = payload.get("metrics") if isinstance(payload.get("metrics"), dict) else {}
    if not metrics:
        print("❌ Artifact missing 'metrics' object.")
        return 2

    print(f"Checking eval gate: {artifact_path}")
    result = evaluate_payload(
        payload=payload,
        threshold_overrides=threshold_overrides,
        baseline_payload=baseline_payload,
        max_fallback_rate=args.max_fallback_rate,
        min_feedback_score=args.min_feedback_score,
        max_fallback_regression=args.max_fallback_regression,
        max_feedback_drop=args.max_feedback_drop,
        min_readiness_score=args.min_readiness_score,
    )

    print("-" * 96)
    for check in result["checks"]:
        status = check["status"]
        metric = check["metric"]
        threshold = check.get("threshold")
        value = check.get("value")
        if value is None:
            print(f"{status:<5} {metric:<32} threshold={threshold} reason={check.get('reason')}")
        else:
            print(f"{status:<5} {metric:<32} value={value:.3f} threshold={float(threshold):.3f}")

    failures = [check for check in result["checks"] if check["status"] in {"FAIL", "MISS"}]
    print("-" * 72)
    if failures:
        failed_names = ", ".join(check["metric"] for check in failures)
        print(f"❌ Eval gate failed ({len(failures)} check(s)): {failed_names}")
        return 1

    print("✅ Eval gate passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
