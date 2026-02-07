"""Dedicated insights endpoints (/api/v1/insights)."""
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, CurrentUser
from app.models.user import Transaction
from app.schemas.chat import InsightResponse
from app.ai.agents import InsightAgent
from app.ai.context_manager import ContextManager

router = APIRouter()


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

        return InsightResponse(
            headline=result.get("headline", "Your Spending Summary"),
            summary=result.get("summary", "No insights available yet."),
            tip=result.get("tip", "Keep tracking your expenses!"),
            period_days=days,
            total_spent=total_spent,
            transaction_count=len(transactions),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Insight generation failed: {exc}",
        ) from exc
