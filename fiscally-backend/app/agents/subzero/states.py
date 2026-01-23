"""
SubZero Agent State Definitions
TypedDict state for LangGraph workflow.
"""

from typing import TypedDict, Optional, List, Literal, Annotated
from operator import add


class VendorPolicyState(TypedDict):
    """Vendor policy information in state."""
    merchant_name: str
    refund_window_days: int
    pro_rated_refund: bool
    retention_offers: List[str]
    refund_difficulty: str
    notes: str


class MessageState(TypedDict):
    """Single message in conversation."""
    role: str  # agent, vendor, system, user
    content: str
    timestamp: str


class VendorOfferState(TypedDict):
    """Vendor offer details."""
    offer_type: str  # refund, retention, rejection
    amount: Optional[float]
    description: str
    free_months: Optional[int]
    discount_percent: Optional[float]
    requires_user_decision: bool


class OutcomeState(TypedDict):
    """Final outcome details."""
    outcome_type: str
    amount_saved: float
    description: str
    confirmation_message: Optional[str]


class SubZeroAgentState(TypedDict):
    """
    Main state for SubZero negotiation agent.
    This is passed through all LangGraph nodes.
    """
    # Identity
    negotiation_id: str
    
    # Request details
    merchant_name: str
    amount: float
    user_goal: str  # full_refund, partial_refund, better_deal, cancel_only
    user_note: Optional[str]
    
    # Vendor information
    vendor_policy: Optional[VendorPolicyState]
    
    # Conversation tracking
    messages: Annotated[List[MessageState], add]  # Append-only list
    
    # State machine
    current_phase: str  # init, opening, negotiating, awaiting_user, resolved
    negotiation_rounds: int
    
    # Vendor response
    vendor_offer: Optional[VendorOfferState]
    
    # Final outcome
    outcome: Optional[OutcomeState]
    
    # Control flags
    should_continue: bool
    awaiting_user_decision: bool
    error: Optional[str]
