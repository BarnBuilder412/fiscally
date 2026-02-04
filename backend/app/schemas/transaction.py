"""
Transaction schemas for request/response validation.
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, Literal
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


# Valid transaction sources
TransactionSource = Literal["manual", "voice", "sms"]

# Valid categories (matches spec)
VALID_CATEGORIES = [
    "food",
    "food_delivery",
    "restaurant", 
    "groceries",
    "transport",
    "shopping",
    "entertainment",
    "bills",
    "subscriptions",
    "health",
    "education",
    "other",
]


class TransactionCreate(BaseModel):
    """Request schema for creating a transaction."""
    
    amount: Decimal = Field(..., description="Transaction amount", decimal_places=2)
    currency: str = Field(default="INR", max_length=10)
    merchant: Optional[str] = Field(None, max_length=255, description="Merchant/vendor name")
    category: Optional[str] = Field(None, max_length=100, description="Expense category")
    note: Optional[str] = Field(None, description="Optional note about the transaction")
    source: TransactionSource = Field(..., description="How transaction was added: manual, voice, or sms")
    transaction_at: Optional[datetime] = Field(None, description="When transaction occurred (defaults to now)")
    
    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        """Ensure amount is a valid positive number."""
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v
    
    @field_validator("category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        """Validate category if provided."""
        if v is not None and v not in VALID_CATEGORIES:
            raise ValueError(f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "amount": 450.00,
                "currency": "INR",
                "merchant": "Swiggy",
                "category": "food_delivery",
                "note": "Dinner",
                "source": "manual",
                "transaction_at": "2026-01-30T20:30:00Z"
            }
        }


class TransactionResponse(BaseModel):
    """Response schema for a single transaction."""
    
    id: UUID
    user_id: UUID
    amount: str
    currency: str
    merchant: Optional[str] = None
    category: Optional[str] = None
    note: Optional[str] = None
    source: str
    ai_category_confidence: Optional[str] = None
    is_anomaly: bool = False
    anomaly_reason: Optional[str] = None
    transaction_at: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    """Response schema for paginated transaction list."""
    
    transactions: list[TransactionResponse]
    total: int
    limit: int
    offset: int
    has_more: bool


class TransactionSummary(BaseModel):
    """Summary statistics for transactions."""
    
    total_spent: str
    transaction_count: int
    category_breakdown: dict[str, str]  # category -> total amount
    period_start: datetime
    period_end: datetime


class VoiceTransactionResponse(BaseModel):
    """Response schema for parsed voice input."""
    
    amount: float
    merchant: Optional[str] = None
    category: str
    confidence: float
    needs_clarification: bool = False
    clarification_question: Optional[str] = None
    transcript: Optional[str] = None  # The actual spoken text from transcription
