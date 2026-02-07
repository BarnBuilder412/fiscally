"""
Transaction schemas for request/response validation.
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, Literal, Any
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


# Valid transaction sources
TransactionSource = Literal["manual", "voice", "sms", "receipt"]
SpendClass = Literal["need", "want", "luxury"]

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
    "transfer",
    "other",
]


class TransactionCreate(BaseModel):
    """Request schema for creating a transaction."""
    
    amount: Decimal = Field(..., description="Transaction amount", decimal_places=2)
    currency: str = Field(default="INR", max_length=10)
    merchant: Optional[str] = Field(None, max_length=255, description="Merchant/vendor name")
    category: Optional[str] = Field(None, max_length=100, description="Expense category")
    note: Optional[str] = Field(None, description="Optional note about the transaction")
    raw_sms: Optional[str] = Field(
        None,
        max_length=4000,
        description="Original SMS body when source='sms'",
    )
    source: TransactionSource = Field(..., description="How transaction was added: manual, voice, sms, or receipt")
    spend_class: Optional[SpendClass] = Field(
        None,
        description="Optional manual classification into need/want/luxury",
    )
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
    spend_class: Optional[str] = None
    spend_class_confidence: Optional[str] = None
    spend_class_reason: Optional[str] = None
    is_anomaly: bool = False
    anomaly_reason: Optional[str] = None
    opik_trace_id: Optional[str] = None  # Opik trace ID for feedback logging
    transaction_at: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class CategoryCorrectionRequest(BaseModel):
    """Request to correct a transaction category (logs feedback to Opik)."""
    new_category: str = Field(..., description="The corrected category")
    
    @field_validator("new_category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        """Validate that the new category is valid."""
        if v not in VALID_CATEGORIES:
            raise ValueError(f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}")
        return v


class TransactionListResponse(BaseModel):
    """Response schema for paginated transaction list."""
    
    transactions: list[TransactionResponse]
    total: int
    limit: int
    offset: int
    has_more: bool


class TransactionUpdate(BaseModel):
    """Request schema for partially updating a transaction."""

    amount: Optional[Decimal] = Field(default=None, decimal_places=2)
    currency: Optional[str] = Field(default=None, max_length=10)
    merchant: Optional[str] = Field(default=None, max_length=255)
    category: Optional[str] = Field(default=None, max_length=100)
    note: Optional[str] = None
    spend_class: Optional[SpendClass] = None
    transaction_at: Optional[datetime] = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("Amount must be positive")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_CATEGORIES:
            raise ValueError(f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}")
        return v


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


class ReceiptTransactionResponse(BaseModel):
    """Response schema for parsed receipt data and auto-created transaction."""

    amount: float
    currency: str
    merchant: Optional[str] = None
    category: str
    spend_class: Optional[SpendClass] = None
    confidence: float
    needs_review: bool = False
    duplicate_suspected: bool = False
    reason: Optional[str] = None
    transaction: Optional[TransactionResponse] = None
    extracted_items: Optional[list[dict[str, Any]]] = None


class SmsTransactionIngestItem(BaseModel):
    """Single parsed SMS transaction payload for batch ingestion."""

    amount: Decimal = Field(..., decimal_places=2)
    currency: str = Field(default="INR", max_length=10)
    merchant: Optional[str] = Field(default=None, max_length=255)
    category: Optional[str] = Field(default=None, max_length=100)
    transaction_at: Optional[datetime] = None
    raw_sms: Optional[str] = Field(default=None, max_length=4000)
    sms_sender: Optional[str] = Field(default=None, max_length=100)
    dedupe_key: Optional[str] = Field(default=None, max_length=255)

    @field_validator("amount")
    @classmethod
    def validate_sms_amount(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v

    @field_validator("category")
    @classmethod
    def validate_sms_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_CATEGORIES:
            raise ValueError(f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}")
        return v


class SmsBatchIngestRequest(BaseModel):
    """Batch payload for parsed SMS transactions."""

    transactions: list[SmsTransactionIngestItem]


class SmsBatchIngestResponse(BaseModel):
    """Result summary for SMS batch ingestion."""

    received_count: int
    created_count: int
    duplicate_count: int
    failed_count: int
    created_transaction_ids: list[str]
