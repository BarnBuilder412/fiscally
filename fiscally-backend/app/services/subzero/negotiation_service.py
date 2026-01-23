"""
Negotiation Service
Business logic for managing SubZero negotiations.
"""

from typing import List, Optional, Dict, Any, AsyncGenerator
from uuid import uuid4
from datetime import datetime

from app.models.subzero import (
    NegotiationRequest,
    NegotiationResponse,
    NegotiationState,
    NegotiationStatus,
    NegotiationStatusResponse,
    VendorOffer,
    NegotiationOutcome,
    NegotiationMessage,
    UserDecisionRequest,
)
from app.agents.subzero.negotiation_agent import negotiation_agent
from app.integrations.opik_client import track


class NegotiationService:
    """
    Service layer for SubZero negotiations.
    Handles negotiation lifecycle and persistence.
    """
    
    def __init__(self):
        # In-memory storage for MVP (can switch to DB later)
        self._negotiations: Dict[str, NegotiationState] = {}
        self._negotiation_history: List[NegotiationState] = []
    
    @track(name="negotiation_service_start")
    async def start_negotiation(self, request: NegotiationRequest) -> NegotiationResponse:
        """
        Start a new negotiation case.
        """
        negotiation_id = str(uuid4())
        
        # Run the agent
        final_state = await negotiation_agent.start_negotiation(
            negotiation_id=negotiation_id,
            merchant_name=request.merchant_name,
            amount=request.amount,
            goal=request.goal.value if hasattr(request.goal, 'value') else request.goal,
            user_note=request.user_note,
        )
        
        # Convert to Pydantic model
        negotiation = negotiation_agent.convert_to_pydantic(final_state)
        
        # Store
        self._negotiations[negotiation_id] = negotiation
        
        # Determine response status
        if final_state.get("awaiting_user_decision"):
            status = "awaiting_decision"
            message = "Vendor made a retention offer. Please review and decide."
        elif final_state.get("current_phase") == "resolved":
            status = "completed"
            message = "Negotiation completed."
        else:
            status = "in_progress"
            message = "Negotiation in progress."
        
        return NegotiationResponse(
            negotiation_id=negotiation_id,
            status=status,
            message=message,
        )
    
    async def get_negotiation(self, negotiation_id: str) -> Optional[NegotiationStatusResponse]:
        """
        Get current status of a negotiation.
        """
        negotiation = self._negotiations.get(negotiation_id)
        
        if not negotiation:
            return None
        
        return NegotiationStatusResponse(
            id=negotiation.id,
            merchant_name=negotiation.merchant_name,
            amount=negotiation.amount,
            goal=negotiation.goal.value if hasattr(negotiation.goal, 'value') else str(negotiation.goal),
            status=negotiation.status.value if hasattr(negotiation.status, 'value') else str(negotiation.status),
            current_phase=negotiation.current_phase,
            messages=negotiation.messages,
            vendor_offer=negotiation.vendor_offer,
            outcome=negotiation.outcome,
        )
    
    @track(name="negotiation_service_decision")
    async def submit_user_decision(
        self,
        negotiation_id: str,
        decision: UserDecisionRequest,
    ) -> Optional[NegotiationStatusResponse]:
        """
        Submit user's decision on a vendor offer.
        """
        final_state = await negotiation_agent.resume_negotiation(
            negotiation_id=negotiation_id,
            decision=decision.decision,
        )
        
        if final_state.get("error"):
            return None
        
        # Update stored negotiation
        negotiation = negotiation_agent.convert_to_pydantic(final_state)
        self._negotiations[negotiation_id] = negotiation
        
        # If completed, add to history
        if negotiation.status == NegotiationStatus.COMPLETED:
            self._negotiation_history.append(negotiation)
        
        return NegotiationStatusResponse(
            id=negotiation.id,
            merchant_name=negotiation.merchant_name,
            amount=negotiation.amount,
            goal=negotiation.goal.value if hasattr(negotiation.goal, 'value') else str(negotiation.goal),
            status=negotiation.status.value if hasattr(negotiation.status, 'value') else str(negotiation.status),
            current_phase=negotiation.current_phase,
            messages=negotiation.messages,
            vendor_offer=negotiation.vendor_offer,
            outcome=negotiation.outcome,
        )
    
    async def stream_negotiation(
        self,
        request: NegotiationRequest,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream negotiation updates using SSE.
        """
        negotiation_id = str(uuid4())
        
        async for event in negotiation_agent.stream_negotiation(
            negotiation_id=negotiation_id,
            merchant_name=request.merchant_name,
            amount=request.amount,
            goal=request.goal.value if hasattr(request.goal, 'value') else request.goal,
            user_note=request.user_note,
        ):
            yield event
    
    async def get_history(self) -> List[NegotiationStatusResponse]:
        """
        Get all completed negotiations.
        """
        return [
            NegotiationStatusResponse(
                id=n.id,
                merchant_name=n.merchant_name,
                amount=n.amount,
                goal=n.goal.value if hasattr(n.goal, 'value') else str(n.goal),
                status=n.status.value if hasattr(n.status, 'value') else str(n.status),
                current_phase=n.current_phase,
                messages=n.messages,
                vendor_offer=n.vendor_offer,
                outcome=n.outcome,
            )
            for n in self._negotiation_history
        ]


# Singleton instance
negotiation_service = NegotiationService()
