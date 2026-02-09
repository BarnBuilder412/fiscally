"""Dedicated insights endpoints (/api/v1/insights)."""
from datetime import datetime, timedelta
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, CurrentUser
from app.models.user import Transaction
from app.schemas.chat import InsightResponse, InsightAlert
from app.ai.agents import InsightAgent
from app.ai.context_manager import ContextManager
from app.ai.prompts import get_currency_symbol

router = APIRouter()
logger = logging.getLogger(__name__)


def _build_insight_alerts(
    transactions: list[Transaction],
    goal_progress: dict,
    currency_symbol: str,
) -> list[InsightAlert]:
    """Build concise, high-signal alerts for the home surface."""
    alerts: list[InsightAlert] = []

    # 1) Most recent anomaly
    anomaly_candidates = [
        tx for tx in transactions if tx.is_anomaly
    ]
    anomaly_candidates.sort(
        key=lambda tx: tx.transaction_at or tx.created_at,
        reverse=True,
    )
    if anomaly_candidates:
        latest = anomaly_candidates[0]
        alerts.append(
            InsightAlert(
                id=f"anomaly-{latest.id}",
                type="anomaly",
                severity="warning",
                title="Unusual Transaction",
                message=(
                    latest.anomaly_reason
                    or f"{currency_symbol}{float(latest.amount):,.0f} at {latest.merchant or 'Unknown'} looks unusual."
                ),
                transaction_id=str(latest.id),
            )
        )

    # 2) Budget pressure (if user configured monthly budget)
    budget_used = float(goal_progress.get("budget_used_percentage") or 0)
    monthly_budget = float(goal_progress.get("monthly_budget") or 0)
    monthly_expenses = float(goal_progress.get("monthly_expenses") or 0)
    if monthly_budget > 0:
        if budget_used >= 100:
            overage = max(0.0, monthly_expenses - monthly_budget)
            alerts.append(
                InsightAlert(
                    id="budget-exceeded",
                    type="budget_exceeded",
                    severity="critical",
                    title="Budget Exceeded",
                    message=(
                        f"You've exceeded this month's budget by {currency_symbol}{overage:,.0f}."
                    ),
                )
            )
        elif budget_used >= 90:
            alerts.append(
                InsightAlert(
                    id="budget-warning",
                    type="budget_warning",
                    severity="warning",
                    title="Budget Warning",
                    message=f"You've used {budget_used:.0f}% of your monthly budget.",
                )
            )

    # 3) Goal status highlight
    goals = goal_progress.get("goals") or []
    at_risk = next(
        (
            goal
            for goal in goals
            if not goal.get("on_track", True) and goal.get("target_date")
        ),
        None,
    )
    if at_risk:
        alerts.append(
            InsightAlert(
                id=f"goal-risk-{at_risk.get('id', 'unknown')}",
                type="goal_at_risk",
                severity="warning",
                title="Goal At Risk",
                message=(
                    f"{at_risk.get('label', 'Goal')} is at risk for {at_risk.get('target_date')}."
                ),
            )
        )
    else:
        milestone = next(
            (
                goal
                for goal in goals
                if 75 <= float(goal.get("progress_percentage") or 0) < 100
            ),
            None,
        )
        if milestone:
            progress = float(milestone.get("progress_percentage") or 0)
            alerts.append(
                InsightAlert(
                    id=f"goal-milestone-{milestone.get('id', 'unknown')}",
                    type="goal_milestone",
                    severity="info",
                    title="Goal Milestone",
                    message=(
                        f"You're {progress:.0f}% of the way to {milestone.get('label', 'your goal')}."
                    ),
                )
            )

    # Keep the top 3 highest-severity alerts.
    severity_rank = {"critical": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda alert: severity_rank.get(alert.severity, 3))
    return alerts[:3]


def _build_impact_counters(
    transactions: list[Transaction],
    goal_progress: dict,
) -> dict[str, float]:
    total_spend = sum(float(tx.amount) for tx in transactions)
    luxury_spend = sum(
        float(tx.amount) for tx in transactions if (tx.spend_class or "").lower() == "luxury"
    )
    goals = goal_progress.get("goals") or []
    goals_on_track = sum(1 for goal in goals if goal.get("on_track", True))
    goals_at_risk = sum(1 for goal in goals if not goal.get("on_track", True))
    anomalies_detected = sum(1 for tx in transactions if tx.is_anomaly)

    return {
        "anomalies_detected": float(anomalies_detected),
        "budget_used_percentage": float(goal_progress.get("budget_used_percentage") or 0),
        "goals_on_track": float(goals_on_track),
        "goals_at_risk": float(goals_at_risk),
        "projected_monthly_savings": float(goal_progress.get("monthly_savings") or 0),
        "luxury_share_percentage": (luxury_spend / total_spend * 100.0) if total_spend > 0 else 0.0,
    }


@router.get("", response_model=InsightResponse)
async def get_insights(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    days: int = Query(default=7, ge=1, le=30),
):
    """Fetch spending insights for a recent period."""
    context_manager = ContextManager(db)
    agent = InsightAgent(context_manager)

    try:
        result = await agent.generate_weekly_digest(str(current_user.id))

        start_date = datetime.utcnow() - timedelta(days=days)
        transactions = (
            db.query(Transaction)
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.transaction_at >= start_date,
            )
            .all()
        )

        total_spent = sum(float(t.amount) for t in transactions)
        goal_progress = await context_manager.calculate_goal_progress(str(current_user.id))
        profile = current_user.profile or {}
        currency_code = (
            profile.get("identity", {}).get("currency")
            or profile.get("currency")
            or "INR"
        )
        currency_symbol = get_currency_symbol(currency_code)
        alerts = _build_insight_alerts(transactions, goal_progress, currency_symbol)
        impact_counters = _build_impact_counters(transactions, goal_progress)

        return InsightResponse(
            headline=result.get("headline", "Your Spending Summary"),
            summary=result.get("summary", "No insights available yet."),
            tip=result.get("tip", "Keep tracking your expenses!"),
            period_days=days,
            total_spent=total_spent,
            transaction_count=len(transactions),
            alerts=alerts,
            impact_counters=impact_counters,
        )
    except Exception:
        logger.exception("Insight generation failed for user_id=%s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Insight generation failed. Please try again shortly.",
        )
