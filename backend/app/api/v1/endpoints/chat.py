"""
Chat endpoints for conversational AI interactions.

Provides:
- POST /chat - Conversational interface to Fiscally AI
- POST /insights - Generate spending insights on demand
"""
from datetime import datetime, timedelta
from typing import Annotated, Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, CurrentUser
from app.models.user import Transaction
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    InsightRequest,
    InsightResponse,
)
from app.ai.agents import ChatAgent, InsightAgent
from app.ai.context_manager import ContextManager

router = APIRouter()


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
    """
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
        
        return ChatResponse(
            response=result.response,
            memory_updated=result.memory_updated,
            new_fact=result.new_fact
        )
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat processing failed: {str(e)}"
        )


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
    except Exception as e:
        print(f"Insight error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Insight generation failed: {str(e)}"
        )
