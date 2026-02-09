"""
Chat endpoints for conversational AI interactions.

Provides:
- POST /chat - Conversational interface to Fiscally AI
- POST /insights - Generate spending insights on demand
"""
from datetime import datetime, timedelta
import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, CurrentUser
from app.models.user import Transaction
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ChatFeedbackRequest,
    InsightRequest,
    InsightResponse,
)
from app.ai.agents import ChatAgent, InsightAgent
from app.ai.context_manager import ContextManager
from app.ai.feedback import log_chat_feedback

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Chat with Fiscally AI.
    
    The AI can answer questions about:
    - Spending patterns ("How much did I spend on food this week?")
    - Budget tracking ("Am I on track for my savings goal?")
    - Transaction history ("What was my largest purchase?")
    
    The AI also extracts and remembers facts from conversations:
    - "I'm saving for a Europe trip" → stored as a goal
    - "I want to reduce Swiggy orders" → stored as a preference
    
    All interactions are traced via Opik for observability.
    Returns reasoning steps showing the AI's chain-of-thought process.
    """
    from app.schemas.chat import ReasoningStep
    
    # Initialize AI components
    context_manager = ContextManager(db)
    agent = ChatAgent(context_manager)
    
    # Convert conversation history to expected format
    history = None
    if request.conversation_history:
        history = [{"role": msg.role, "content": msg.content} for msg in request.conversation_history]
    
    try:
        result = await agent.handle(
            user_id=str(current_user.id),
            message=request.message,
            conversation_history=history
        )
        
        # Convert reasoning steps to API schema format
        reasoning_steps = None
        if result.reasoning_steps:
            reasoning_steps = [
                ReasoningStep(
                    step_type=step.get("step_type", "analyzing"),
                    content=step.get("content", ""),
                    data=step.get("data")
                )
                for step in result.reasoning_steps
            ]

        return ChatResponse(
            response=result.response,
            memory_updated=result.memory_updated,
            new_fact=result.new_fact,
            trace_id=result.trace_id,
            response_confidence=result.response_confidence,
            fallback_used=result.fallback_used,
            fallback_reason=result.fallback_reason,
            reasoning_steps=reasoning_steps
        )
    except Exception:
        logger.exception("Chat processing failed for user_id=%s", current_user.id)
        return ChatResponse(
            response=(
                "I hit a temporary issue generating a full answer. "
                "Try again in a moment, or ask for your current month spending total."
            ),
            memory_updated=False,
            new_fact=None,
            trace_id=None,
            response_confidence=0.0,
            fallback_used=True,
            fallback_reason="temporary_processing_error",
            reasoning_steps=[
                ReasoningStep(
                    step_type="analyzing",
                    content="Returned a safe fallback while core chat processing recovers.",
                    data={"fallback": True},
                )
            ],
        )


@router.post("/feedback")
async def submit_chat_feedback(
    request: ChatFeedbackRequest,
    _current_user: CurrentUser,
):
    """Log thumbs up/down feedback for a chat trace."""
    success = log_chat_feedback(
        trace_id=request.trace_id,
        rating=request.rating,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to log feedback",
        )
    return {"success": True}


@router.post("/insights", response_model=InsightResponse)
async def generate_insights(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    request: Optional[InsightRequest] = None,
):
    """
    Generate spending insights for the specified period.
    
    Analyzes recent transactions and returns:
    - Headline: Catchy summary
    - Summary: 2-3 sentence overview
    - Tip: One actionable suggestion
    
    Default period is 7 days.
    """
    days = request.days if request else 7
    
    # Initialize AI components
    context_manager = ContextManager(db)
    agent = InsightAgent(context_manager)
    
    try:
        result = await agent.generate_weekly_digest(str(current_user.id))
        
        # Get transaction stats for the period
        start_date = datetime.utcnow() - timedelta(days=days)
        transactions = (
            db.query(Transaction)
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.transaction_at >= start_date
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
            transaction_count=len(transactions)
        )
    except Exception:
        logger.exception("Insight generation failed for user_id=%s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Insight generation failed. Please try again shortly.",
        )
