"""
SubZero Pydantic Models
Schemas for negotiation state machine, vendor policies, messages, and API contracts.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
from enum import Enum
from uuid import uuid4


# =============================================================================
# Enums
# =============================================================================

class NegotiationGoal(str, Enum):
    """User's desired outcome from the negotiation."""
    FULL_REFUND = "full_refund"
    PARTIAL_REFUND = "partial_refund"
    BETTER_DEAL = "better_deal"
    CANCEL_ONLY = "cancel_only"


class NegotiationStatus(str, Enum):
    """Current status of the negotiation."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    AWAITING_USER = "awaiting_user"  # Paused for user decision
    COMPLETED = "completed"
    FAILED = "failed"


class NegotiationOutcomeType(str, Enum):
    """Final outcome type of negotiation."""
    REFUND_APPROVED = "refund_approved"
    RETENTION_OFFER_ACCEPTED = "retention_offer_accepted"
    RETENTION_OFFER_REJECTED = "retention_offer_rejected"
    REFUND_DENIED = "refund_denied"
    CANCELLED = "cancelled"


class MessageRole(str, Enum):
    """Role of message sender."""
    AGENT = "agent"
    VENDOR = "vendor"
    SYSTEM = "system"
    USER = "user"


# =============================================================================
# Vendor Policy Models
# =============================================================================

class VendorPolicy(BaseModel):
    """Refund/cancellation policy for a vendor."""
    merchant_name: str
    refund_window_days: int = Field(description="Days within which refund is possible")
    pro_rated_refund: bool = Field(default=False, description="Allows pro-rated refunds")
    retention_offers: List[str] = Field(default_factory=list, description="Possible retention offers")
    cancellation_notice_days: int = Field(default=0, description="Days notice required for cancellation")
    refund_difficulty: Literal["easy", "medium", "hard"] = "medium"
    notes: Optional[str] = None


# =============================================================================
# Subscription Models
# =============================================================================

class Subscription(BaseModel):
    """User subscription to track."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    merchant_name: str
    amount: float
    billing_frequency: Literal["daily", "weekly", "monthly", "yearly"] = "monthly"
    next_billing_date: Optional[datetime] = None
    status: Literal["active", "cancelled", "paused"] = "active"


# =============================================================================
# Negotiation Message Models
# =============================================================================

class NegotiationMessage(BaseModel):
    """A single message in the negotiation conversation."""
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[dict] = None


# =============================================================================
# Vendor Offer Models
# =============================================================================

class VendorOffer(BaseModel):
    """Offer made by vendor during negotiation."""
    offer_type: Literal["refund", "retention", "rejection"]
    amount: Optional[float] = None  # For refund offers
    description: str
    free_months: Optional[int] = None  # For retention offers
    discount_percent: Optional[float] = None  # For retention offers
    requires_user_decision: bool = False


# =============================================================================
# Negotiation Outcome Models
# =============================================================================

class NegotiationOutcome(BaseModel):
    """Final outcome of a negotiation."""
    outcome_type: NegotiationOutcomeType
    amount_saved: float = 0.0
    description: str
    confirmation_message: Optional[str] = None
    next_steps: Optional[str] = None


# =============================================================================
# Negotiation State (Main Model)
# =============================================================================

class NegotiationState(BaseModel):
    """Complete state of a negotiation case."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    merchant_name: str
    amount: float
    goal: NegotiationGoal
    status: NegotiationStatus = NegotiationStatus.PENDING
    
    # Policy and context
    vendor_policy: Optional[VendorPolicy] = None
    user_note: Optional[str] = None
    
    # Conversation
    messages: List[NegotiationMessage] = Field(default_factory=list)
    current_phase: str = "init"  # init, opening, negotiating, awaiting_user, resolved
    
    # Vendor response tracking
    vendor_offer: Optional[VendorOffer] = None
    negotiation_rounds: int = 0
    
    # Outcome
    outcome: Optional[NegotiationOutcome] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        use_enum_values = True


# =============================================================================
# API Request/Response Models
# =============================================================================

class NegotiationRequest(BaseModel):
    """API request to start a negotiation."""
    merchant_name: str
    amount: float
    goal: NegotiationGoal
    user_note: Optional[str] = None


class NegotiationResponse(BaseModel):
    """API response for negotiation creation."""
    negotiation_id: str
    status: str
    message: str


class NegotiationStatusResponse(BaseModel):
    """Full negotiation status response."""
    id: str
    merchant_name: str
    amount: float
    goal: str
    status: str
    current_phase: str
    messages: List[NegotiationMessage]
    vendor_offer: Optional[VendorOffer] = None
    outcome: Optional[NegotiationOutcome] = None


class UserDecisionRequest(BaseModel):
    """User's decision on a vendor offer."""
    decision: Literal["accept", "reject", "counter"]
    counter_message: Optional[str] = None


class SSEEvent(BaseModel):
    """Server-Sent Event payload."""
    event: str
    data: dict
