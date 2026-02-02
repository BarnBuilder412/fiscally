"""
Chat schemas for AI conversation endpoints.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """A single message in conversation history."""
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


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
