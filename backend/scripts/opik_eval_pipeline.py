#!/usr/bin/env python3
"""Run Opik baseline/challenger experiments and publish a judge-ready artifact."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.ai.evaluation.experiments import (  # noqa: E402
    run_anomaly_experiment,
    run_categorization_experiment,
    run_chat_experiment,
    run_receipt_parsing_experiment,
    run_spend_class_experiment,
    run_voice_parsing_experiment,
)

try:  # noqa: E402
    from eval_gate import DEFAULT_THRESHOLDS, evaluate_payload
except ImportError:  # pragma: no cover - fallback when executed as module.
    from scripts.eval_gate import DEFAULT_THRESHOLDS, evaluate_payload  # type: ignore


DEFAULT_OUTPUT = BACKEND_ROOT / "eval_artifacts" / "latest.json"
DEFAULT_BASELINE_OUTPUT = BACKEND_ROOT / "eval_artifacts" / "baseline_latest.json"

CHAT_HELPFULNESS_WEIGHTS: Dict[str, float] = {
    "answer_relevance": 0.35,
    "tone_appropriateness": 0.20,
    "specific_numbers": 0.20,
    "response_conciseness": 0.10,
    "currency_indicator_usage": 0.05,
    "hallucination": 0.10,
}

CANONICAL_MAP: Dict[str, str] = {
    "category_accuracy": "categorization_accuracy",
    "voice_parsing_accuracy": "voice_parsing_accuracy",
    "spend_class_accuracy": "spend_class_accuracy",
    "receipt_parsing_accuracy": "receipt_parsing_accuracy",
    "anomaly_detection_accuracy": "anomaly_detection_accuracy",
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_mean(values: List[float]) -> Optional[float]:
    if not values:
        return None
    return sum(values) / len(values)


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


def _coerce_float_dict(raw: Dict[str, Any]) -> Dict[str, float]:
    out: Dict[str, float] = {}
    for key, value in raw.items():
        try:
            out[key] = float(value)
        except (TypeError, ValueError):
            continue
    return out


def _run_and_aggregate_experiment(label: str, runner, tags: List[str]) -> Dict[str, Any]:
    result = runner(experiment_name=label, experiment_tags=tags)
    view = result.aggregate_evaluation_scores()
    metrics: Dict[str, float] = {}
    for metric_name, stats in view.aggregated_scores.items():
        metrics[metric_name] = float(stats.mean)

    return {
        "name": view.experiment_name or label,
        "url": view.experiment_url,
        "trial_count": view.trial_count,
        "metrics": metrics,
    }


def _aggregate_raw_metrics(experiments: List[Dict[str, Any]]) -> Dict[str, float]:
    buckets: Dict[str, List[float]] = {}
    for experiment in experiments:
        for metric_name, value in experiment.get("metrics", {}).items():
            buckets.setdefault(metric_name, []).append(float(value))

    aggregated: Dict[str, float] = {}
    for metric_name, values in buckets.items():
        aggregated[metric_name] = round(sum(values) / len(values), 4)
    return aggregated


def _derive_chat_helpfulness(raw_metrics: Dict[str, float]) -> Optional[float]:
    weighted_score = 0.0
    total_weight = 0.0
    for metric_name, weight in CHAT_HELPFULNESS_WEIGHTS.items():
        if metric_name in raw_metrics:
            weighted_score += raw_metrics[metric_name] * weight
            total_weight += weight

    if total_weight == 0:
        return None
    return round(weighted_score / total_weight, 4)


def _build_canonical_metrics(raw_metrics: Dict[str, float]) -> Dict[str, float]:
    canonical: Dict[str, float] = {}
    for raw_name, canonical_name in CANONICAL_MAP.items():
        if raw_name in raw_metrics:
            canonical[canonical_name] = round(float(raw_metrics[raw_name]), 4)

    chat_helpfulness = _derive_chat_helpfulness(raw_metrics)
    if chat_helpfulness is not None:
        canonical["chat_helpfulness"] = chat_helpfulness

    return canonical


def _compute_deltas(
    challenger_metrics: Dict[str, float],
    baseline_metrics: Optional[Dict[str, float]],
) -> Dict[str, float]:
    if not baseline_metrics:
        return {}

    deltas: Dict[str, float] = {}
    for metric_name, challenger_value in challenger_metrics.items():
        if metric_name in baseline_metrics:
            deltas[metric_name] = round(challenger_value - baseline_metrics[metric_name], 4)
    return deltas


def _normalize_delta(delta: float) -> float:
    if delta >= 0:
        return min(delta / 0.05, 1.0)
    return max(delta / 0.05, -1.0)


def _compute_observability_completeness(payload: Dict[str, Any]) -> float:
    score = 0.0
    baseline = payload.get("baseline")
    challenger = payload.get("challenger")
    if isinstance(baseline, dict):
        score += 0.30
    if isinstance(challenger, dict):
        score += 0.30

    operational = payload.get("operational_metrics")
    if isinstance(operational, dict):
        if "fallback_rate" in operational:
            score += 0.10
        if "chat_feedback_score" in operational:
            score += 0.10

    gate_checks = payload.get("gate_checks")
    if isinstance(gate_checks, list) and gate_checks:
        score += 0.10

    experiment_urls: List[str] = []
    for segment in (baseline, challenger):
        if isinstance(segment, dict):
            for experiment in segment.get("experiments", []):
                if isinstance(experiment, dict) and experiment.get("url"):
                    experiment_urls.append(str(experiment["url"]))
    if len(experiment_urls) >= 6:
        score += 0.10

    return min(score, 1.0)


def _compute_readiness(
    payload: Dict[str, Any],
    gate_result: Dict[str, Any],
) -> Dict[str, Any]:
    metrics = payload.get("metrics") if isinstance(payload.get("metrics"), dict) else {}
    deltas = payload.get("deltas") if isinstance(payload.get("deltas"), dict) else {}

    metric_values = [float(v) for v in metrics.values()]
    quality_component = _safe_mean(metric_values) or 0.0

    delta_values = [_normalize_delta(float(v)) for v in deltas.values()]
    if delta_values:
        # Map [-1, 1] to [0, 1]
        improvement_component = ((_safe_mean(delta_values) or 0.0) + 1.0) / 2.0
    else:
        improvement_component = 0.5

    observability_component = _compute_observability_completeness(payload)

    failure_count = int(gate_result.get("failure_count", 0) or 0)
    gate_component = 1.0 if gate_result.get("gate_passed") else max(0.0, 1.0 - failure_count / 8.0)

    normalized = (
        (0.45 * quality_component)
        + (0.20 * improvement_component)
        + (0.25 * observability_component)
        + (0.10 * gate_component)
    )
    normalized = max(0.0, min(1.0, normalized))
    score_10 = round(normalized * 10.0, 2)

    return {
        "readiness_score": score_10,
        "readiness_components": {
            "quality_component": round(quality_component, 4),
            "improvement_component": round(improvement_component, 4),
            "observability_component": round(observability_component, 4),
            "gate_component": round(gate_component, 4),
        },
    }


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9-]+", "-", text.lower()).strip("-")


def _run_suite(
    suite_name: str,
    run_id: str,
    extra_tags: List[str],
    allow_partial: bool,
) -> Dict[str, Any]:
    suite_slug = _slug(suite_name)
    tags = [f"track:financial-health", f"suite:{suite_slug}", f"run:{run_id}", *extra_tags]

    specs = [
        ("categorization", run_categorization_experiment),
        ("voice", run_voice_parsing_experiment),
        ("chat", run_chat_experiment),
        ("spend-class", run_spend_class_experiment),
        ("receipt", run_receipt_parsing_experiment),
        ("anomaly", run_anomaly_experiment),
    ]

    experiments: List[Dict[str, Any]] = []
    failures: List[str] = []
    for feature_slug, runner in specs:
        experiment_name = f"fiscally-{run_id}-{suite_slug}-{feature_slug}"
        run_tags = [*tags, f"feature:{feature_slug}"]
        try:
            experiment = _run_and_aggregate_experiment(experiment_name, runner, run_tags)
            experiments.append(experiment)
        except Exception as exc:  # pragma: no cover - depends on external APIs.
            message = f"{experiment_name}: {exc}"
            failures.append(message)
            print(f"⚠️ Experiment failed: {message}")
            if not allow_partial:
                raise

    raw_metrics = _aggregate_raw_metrics(experiments)
    canonical_metrics = _build_canonical_metrics(raw_metrics)
    return {
        "suite_name": suite_name,
        "experiments": experiments,
        "raw_metrics": raw_metrics,
        "canonical_metrics": canonical_metrics,
        "failed_experiments": failures,
    }


def _load_artifact(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _print_summary(payload: Dict[str, Any]) -> None:
    print("\n" + "=" * 100)
    print("Opik Eval Pipeline Summary")
    print("=" * 100)
    print(f"Run ID      : {payload.get('run_id')}")
    print(f"Experiment  : {payload.get('experiment')}")
    print(f"Artifact    : {payload.get('artifact_path')}")
    print("-" * 100)
    print("Metric".ljust(36), "Value".rjust(10), "Threshold".rjust(12), "Delta".rjust(10))
    print("-" * 100)

    metrics = payload.get("metrics") if isinstance(payload.get("metrics"), dict) else {}
    thresholds = payload.get("thresholds") if isinstance(payload.get("thresholds"), dict) else {}
    deltas = payload.get("deltas") if isinstance(payload.get("deltas"), dict) else {}
    for metric_name in sorted(set(metrics.keys()) | set(thresholds.keys())):
        value = metrics.get(metric_name)
        threshold = thresholds.get(metric_name)
        delta = deltas.get(metric_name)
        value_str = f"{float(value):.3f}" if value is not None else "-"
        threshold_str = f"{float(threshold):.3f}" if threshold is not None else "-"
        delta_str = f"{float(delta):+.3f}" if delta is not None else "-"
        print(metric_name.ljust(36), value_str.rjust(10), threshold_str.rjust(12), delta_str.rjust(10))

    print("-" * 100)
    print(f"Gate Passed : {payload.get('gate_passed')}")
    print(f"Readiness   : {payload.get('readiness_score')} / 10")
    print("=" * 100 + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run baseline/challenger Opik experiments and publish latest eval artifact."
    )
    parser.add_argument(
        "--mode",
        choices=["baseline-vs-challenger", "challenger-only", "baseline-only"],
        default="baseline-vs-challenger",
        help="How to run experiments and comparisons.",
    )
    parser.add_argument(
        "--run-id",
        default=datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S"),
        help="Run identifier used in experiment names/tags.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output artifact path (default: {DEFAULT_OUTPUT})",
    )
    parser.add_argument(
        "--baseline-output",
        type=Path,
        default=DEFAULT_BASELINE_OUTPUT,
        help=f"Baseline snapshot path (default: {DEFAULT_BASELINE_OUTPUT})",
    )
    parser.add_argument(
        "--baseline-artifact",
        type=Path,
        default=None,
        help="Optional existing baseline artifact JSON (used with challenger-only mode).",
    )
    parser.add_argument(
        "--threshold",
        action="append",
        default=[],
        help="Override threshold using metric=value (repeatable).",
    )
    parser.add_argument(
        "--max-fallback-rate",
        type=float,
        default=None,
        help="Optional gate check for max fallback rate.",
    )
    parser.add_argument(
        "--min-feedback-score",
        type=float,
        default=None,
        help="Optional gate check for min chat feedback score.",
    )
    parser.add_argument(
        "--max-fallback-regression",
        type=float,
        default=None,
        help="Optional gate check for fallback regression vs baseline.",
    )
    parser.add_argument(
        "--max-feedback-drop",
        type=float,
        default=None,
        help="Optional gate check for feedback score drop vs baseline.",
    )
    parser.add_argument(
        "--min-readiness-score",
        type=float,
        default=9.2,
        help="Gate check for minimum readiness score (default: 9.2).",
    )
    parser.add_argument(
        "--fallback-rate",
        type=float,
        default=None,
        help="Operational metric to store in artifact (0-1).",
    )
    parser.add_argument(
        "--chat-feedback-score",
        type=float,
        default=None,
        help="Operational metric to store in artifact (0-1).",
    )
    parser.add_argument(
        "--feedback-sample-size",
        type=int,
        default=None,
        help="Optional sample size for chat feedback score.",
    )
    parser.add_argument(
        "--p95-latency-ms",
        type=float,
        default=None,
        help="Optional latency metric to store in artifact.",
    )
    parser.add_argument(
        "--tag",
        action="append",
        default=[],
        help="Additional experiment tag (repeatable).",
    )
    parser.add_argument(
        "--allow-partial",
        action="store_true",
        help="Continue even if one experiment fails (artifact will include failures).",
    )
    parser.add_argument(
        "--notes",
        default=None,
        help="Optional notes persisted into artifact.",
    )
    args = parser.parse_args()

    missing_env = [name for name in ("OPENAI_API_KEY", "OPIK_API_KEY", "OPIK_WORKSPACE") if not os.getenv(name)]
    if missing_env:
        print(f"⚠️ Missing env vars: {', '.join(missing_env)}")
        print("   Pipeline may fail when running live experiments.")

    try:
        threshold_overrides = _parse_threshold_override(args.threshold)
    except ValueError as exc:
        print(f"❌ {exc}")
        return 2

    thresholds: Dict[str, float] = dict(DEFAULT_THRESHOLDS)
    thresholds.update(threshold_overrides)

    baseline_suite: Optional[Dict[str, Any]] = None
    challenger_suite: Optional[Dict[str, Any]] = None
    baseline_payload_for_gate: Optional[Dict[str, Any]] = None

    if args.mode in {"baseline-vs-challenger", "baseline-only"}:
        print(f"🧪 Running baseline suite (run_id={args.run_id})...")
        baseline_suite = _run_suite(
            suite_name="baseline",
            run_id=args.run_id,
            extra_tags=[*args.tag, "variant:baseline"],
            allow_partial=args.allow_partial,
        )

        baseline_snapshot = {
            "generated_at": _utc_now(),
            "experiment": "financial-health-baseline",
            "run_id": args.run_id,
            "metrics": baseline_suite["canonical_metrics"],
            "thresholds": thresholds,
            "raw_metrics": baseline_suite["raw_metrics"],
            "experiments": baseline_suite["experiments"],
            "failed_experiments": baseline_suite["failed_experiments"],
        }
        _write_json(args.baseline_output, baseline_snapshot)
        print(f"✅ Baseline snapshot written: {args.baseline_output}")

    if args.mode in {"baseline-vs-challenger", "challenger-only"}:
        print(f"🧪 Running challenger suite (run_id={args.run_id})...")
        challenger_suite = _run_suite(
            suite_name="challenger",
            run_id=args.run_id,
            extra_tags=[*args.tag, "variant:challenger"],
            allow_partial=args.allow_partial,
        )

    if args.mode == "challenger-only":
        baseline_artifact_path = args.baseline_artifact or args.baseline_output
        if baseline_artifact_path.exists():
            baseline_payload_for_gate = _load_artifact(baseline_artifact_path)
            print(f"ℹ️ Using baseline artifact: {baseline_artifact_path}")
        else:
            print(f"⚠️ Baseline artifact not found: {baseline_artifact_path}")

    if args.mode == "baseline-vs-challenger" and baseline_suite:
        baseline_payload_for_gate = {
            "metrics": baseline_suite["canonical_metrics"],
            "operational_metrics": {},
        }

    if args.mode == "baseline-only" and baseline_suite:
        challenger_metrics = baseline_suite["canonical_metrics"]
    elif challenger_suite:
        challenger_metrics = challenger_suite["canonical_metrics"]
    else:
        print("❌ No challenger metrics produced.")
        return 2

    if baseline_suite:
        baseline_metrics = baseline_suite["canonical_metrics"]
    elif baseline_payload_for_gate:
        baseline_metrics = _coerce_float_dict(
            baseline_payload_for_gate.get("metrics")
            if isinstance(baseline_payload_for_gate.get("metrics"), dict)
            else {}
        )
    else:
        baseline_metrics = None

    deltas = _compute_deltas(challenger_metrics, baseline_metrics)

    operational_metrics: Dict[str, Any] = {}
    if args.fallback_rate is not None:
        operational_metrics["fallback_rate"] = float(args.fallback_rate)
    if args.chat_feedback_score is not None:
        operational_metrics["chat_feedback_score"] = float(args.chat_feedback_score)
    if args.feedback_sample_size is not None:
        operational_metrics["feedback_sample_size"] = int(args.feedback_sample_size)
    if args.p95_latency_ms is not None:
        operational_metrics["p95_latency_ms"] = float(args.p95_latency_ms)

    payload: Dict[str, Any] = {
        "generated_at": _utc_now(),
        "experiment": "financial-health-baseline-vs-challenger"
        if args.mode == "baseline-vs-challenger"
        else ("financial-health-challenger" if args.mode == "challenger-only" else "financial-health-baseline"),
        "run_id": args.run_id,
        "metrics": challenger_metrics,
        "thresholds": thresholds,
        "deltas": deltas,
        "operational_metrics": operational_metrics,
        "notes": args.notes
        or "Generated by opik_eval_pipeline.py for hackathon submission evidence.",
    }

    if baseline_suite:
        payload["baseline"] = {
            "canonical_metrics": baseline_suite["canonical_metrics"],
            "raw_metrics": baseline_suite["raw_metrics"],
            "experiments": baseline_suite["experiments"],
            "failed_experiments": baseline_suite["failed_experiments"],
        }
    elif baseline_payload_for_gate:
        payload["baseline"] = {
            "canonical_metrics": _coerce_float_dict(
                baseline_payload_for_gate.get("metrics")
                if isinstance(baseline_payload_for_gate.get("metrics"), dict)
                else {}
            ),
            "source_artifact": str(args.baseline_artifact or args.baseline_output),
        }

    if challenger_suite:
        payload["challenger"] = {
            "canonical_metrics": challenger_suite["canonical_metrics"],
            "raw_metrics": challenger_suite["raw_metrics"],
            "experiments": challenger_suite["experiments"],
            "failed_experiments": challenger_suite["failed_experiments"],
        }

    # First gate pass without readiness so we can compute readiness from gate quality.
    pre_gate = evaluate_payload(
        payload=payload,
        threshold_overrides=threshold_overrides,
        baseline_payload=baseline_payload_for_gate,
        max_fallback_rate=args.max_fallback_rate,
        min_feedback_score=args.min_feedback_score,
        max_fallback_regression=args.max_fallback_regression,
        max_feedback_drop=args.max_feedback_drop,
        min_readiness_score=None,
    )

    readiness = _compute_readiness(payload, pre_gate)
    payload.update(readiness)
    payload["readiness_target"] = float(args.min_readiness_score)

    effective_min_readiness = (
        None if args.mode == "baseline-only" else args.min_readiness_score
    )

    final_gate = evaluate_payload(
        payload=payload,
        threshold_overrides=threshold_overrides,
        baseline_payload=baseline_payload_for_gate,
        max_fallback_rate=args.max_fallback_rate,
        min_feedback_score=args.min_feedback_score,
        max_fallback_regression=args.max_fallback_regression,
        max_feedback_drop=args.max_feedback_drop,
        min_readiness_score=effective_min_readiness,
    )
    payload["gate_passed"] = bool(final_gate.get("gate_passed"))
    payload["gate_failure_count"] = int(final_gate.get("failure_count", 0))
    payload["gate_checks"] = final_gate.get("checks", [])

    payload["artifact_path"] = str(args.output)
    _write_json(args.output, payload)
    _print_summary(payload)
    print(f"📝 Wrote artifact: {args.output}")
    print(f"📌 Baseline snapshot: {args.baseline_output}")

    if args.mode == "baseline-only":
        print("ℹ️ Baseline-only mode completed. Gate result is informative, not blocking.")
        return 0

    if payload["gate_passed"]:
        print("✅ Pipeline completed and gate passed.")
        return 0

    print("❌ Pipeline completed but gate failed. See gate_checks in artifact.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
