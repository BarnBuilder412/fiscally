"""
Chat schemas for AI conversation endpoints.
"""
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """A single message in conversation history."""
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


class ReasoningStep(BaseModel):
    """A single step in the AI's chain-of-thought reasoning."""
    step_type: str = Field(..., description="Type: 'analyzing', 'querying', 'pattern', 'calculating', 'insight'")
    content: str = Field(..., description="Description of what the AI did in this step")
    data: Optional[Dict[str, Any]] = Field(None, description="Optional data associated with this step")


class ChatRequest(BaseModel):
    """Request to chat with Fiscally AI."""
    message: str = Field(..., min_length=1, max_length=2000, description="User's message")
    conversation_history: Optional[List[ChatMessage]] = Field(
        default=None, 
        description="Previous messages for context"
    )


class ChatResponse(BaseModel):
    """Response from Fiscally AI."""
    response: str = Field(..., description="AI response")
    memory_updated: bool = Field(False, description="Whether a new fact was stored")
    new_fact: Optional[str] = Field(None, description="Fact that was stored, if any")
    trace_id: Optional[str] = Field(None, description="Opik trace ID for feedback logging")
    response_confidence: Optional[float] = Field(
        None,
        description="Estimated confidence (0-1) for the generated response.",
    )
    fallback_used: bool = Field(
        False,
        description="True when a bounded fallback response was returned instead of full agent output.",
    )
    fallback_reason: Optional[str] = Field(
        None,
        description="Machine-readable fallback reason when fallback_used=true.",
    )
    reasoning_steps: Optional[List[ReasoningStep]] = Field(
        None, 
        description="Chain-of-thought reasoning steps the AI performed"
    )


class ChatFeedbackRequest(BaseModel):
    """Request to log chat feedback."""
    trace_id: str = Field(..., description="The trace ID from the chat response")
    rating: Literal[1, 2] = Field(..., description="1 = thumbs down, 2 = thumbs up")


class InsightRequest(BaseModel):
    """Request to generate insights."""
    days: int = Field(default=7, ge=1, le=30, description="Number of days to analyze")


class InsightResponse(BaseModel):
    """Weekly insight response."""
    headline: str
    summary: str
    tip: str
    period_days: int
    total_spent: float
    transaction_count: int
    alerts: List["InsightAlert"] = Field(default_factory=list)
    impact_counters: Dict[str, float] = Field(default_factory=dict)


class InsightAlert(BaseModel):
    """Alert payload used by Home Smart Alerts."""
    id: str
    type: Literal[
        "anomaly",
        "budget_warning",
        "budget_exceeded",
        "goal_milestone",
        "goal_at_risk",
        "tip",
    ]
    severity: Literal["info", "warning", "critical"] = "info"
    title: str
    message: str
    transaction_id: Optional[str] = None
