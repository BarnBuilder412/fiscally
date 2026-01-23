"""
SubZero API Endpoints
Complete API for subscription negotiation with SSE support.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
from typing import List, Optional
from uuid import uuid4
import json
import asyncio

from app.models.subzero import (
    NegotiationRequest,
    NegotiationResponse,
    NegotiationStatusResponse,
    UserDecisionRequest,
    Subscription,
    VendorPolicy,
    NegotiationGoal,
)
from app.services.subzero.negotiation_service import negotiation_service
from app.services.subzero.subscription_service import subscription_service


router = APIRouter()


# =============================================================================
# Subscription Endpoints
# =============================================================================

@router.get("/subscriptions", response_model=List[dict])
async def get_subscriptions():
    """
    Get all available subscriptions for negotiation.
    """
    subscriptions = subscription_service.get_all_subscriptions()
    return [
        {
            "id": s.id,
            "merchant_name": s.merchant_name,
            "amount": s.amount,
            "billing_frequency": s.billing_frequency,
        }
        for s in subscriptions
    ]


@router.get("/subscriptions/{subscription_id}")
async def get_subscription(subscription_id: str):
    """
    Get a specific subscription.
    """
    subscription = subscription_service.get_subscription(subscription_id)
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {
        "id": subscription.id,
        "merchant_name": subscription.merchant_name,
        "amount": subscription.amount,
        "billing_frequency": subscription.billing_frequency,
    }


@router.get("/vendor-policies")
async def get_vendor_policies():
    """
    Get all vendor refund policies.
    """
    policies = subscription_service.get_all_vendor_policies()
    return [
        {
            "merchant_name": p.merchant_name,
            "refund_window_days": p.refund_window_days,
            "pro_rated_refund": p.pro_rated_refund,
            "retention_offers": p.retention_offers,
            "refund_difficulty": p.refund_difficulty,
        }
        for p in policies
    ]


# =============================================================================
# Negotiation Endpoints
# =============================================================================

@router.post("/negotiations", response_model=NegotiationResponse)
async def start_negotiation(request: NegotiationRequest):
    """
    Start a new subscription negotiation.
    
    The agent will:
    1. Fetch the vendor's refund policy
    2. Generate an opening negotiation message
    3. Simulate vendor response
    4. Evaluate and respond until resolution
    
    Returns immediately with negotiation ID. Poll /negotiations/{id} for status.
    """
    try:
        response = await negotiation_service.start_negotiation(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/negotiations/{negotiation_id}", response_model=NegotiationStatusResponse)
async def get_negotiation_status(negotiation_id: str):
    """
    Get the current status of a negotiation.
    
    Includes all messages, current phase, vendor offer (if any), and outcome.
    """
    negotiation = await negotiation_service.get_negotiation(negotiation_id)
    if not negotiation:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    return negotiation


@router.post("/negotiations/{negotiation_id}/decision", response_model=NegotiationStatusResponse)
async def submit_user_decision(negotiation_id: str, decision: UserDecisionRequest):
    """
    Submit user's decision on a vendor retention offer.
    
    Called when negotiation is paused with status "awaiting_decision".
    Decision options: "accept" or "reject"
    
    If rejected, the agent will continue pushing for the original goal.
    """
    result = await negotiation_service.submit_user_decision(negotiation_id, decision)
    if not result:
        raise HTTPException(status_code=404, detail="Negotiation not found or not awaiting decision")
    return result


@router.get("/negotiations/{negotiation_id}/stream")
async def stream_negotiation_status(negotiation_id: str):
    """
    Stream negotiation updates via Server-Sent Events (SSE).
    
    Use this for real-time UI updates. Events include:
    - message: New chat message (agent/vendor/system)
    - phase_change: Negotiation phase changed
    - vendor_offer: Vendor made an offer
    - awaiting_user: Paused for user decision
    - outcome: Final result
    - complete: Negotiation finished
    - error: An error occurred
    """
    async def event_generator():
        negotiation = await negotiation_service.get_negotiation(negotiation_id)
        
        if not negotiation:
            yield {
                "event": "error",
                "data": json.dumps({"error": "Negotiation not found"})
            }
            return
        
        # Send current state
        yield {
            "event": "status",
            "data": json.dumps({
                "id": negotiation.id,
                "status": negotiation.status,
                "phase": negotiation.current_phase,
                "message_count": len(negotiation.messages),
            })
        }
        
        # Send all messages
        for msg in negotiation.messages:
            yield {
                "event": "message",
                "data": json.dumps({
                    "role": msg.role.value if hasattr(msg.role, 'value') else msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat() if hasattr(msg.timestamp, 'isoformat') else str(msg.timestamp),
                })
            }
            await asyncio.sleep(0.1)  # Small delay between messages
        
        # Send current offer if any
        if negotiation.vendor_offer:
            yield {
                "event": "vendor_offer",
                "data": json.dumps({
                    "offer_type": negotiation.vendor_offer.offer_type,
                    "description": negotiation.vendor_offer.description,
                    "requires_decision": negotiation.vendor_offer.requires_user_decision,
                })
            }
        
        # Send outcome if complete
        if negotiation.outcome:
            yield {
                "event": "outcome",
                "data": json.dumps({
                    "outcome_type": negotiation.outcome.outcome_type,
                    "amount_saved": negotiation.outcome.amount_saved,
                    "description": negotiation.outcome.description,
                })
            }
        
        yield {"event": "complete", "data": json.dumps({"status": "stream_complete"})}
    
    return EventSourceResponse(event_generator())


@router.post("/negotiations/start-and-stream")
async def start_negotiation_with_stream(request: NegotiationRequest):
    """
    Start a negotiation and stream updates via SSE.
    
    Combines start_negotiation and stream into one call.
    Best for real-time chat UI experience.
    """
    async def event_generator():
        async for event in negotiation_service.stream_negotiation(request):
            yield {
                "event": event["event"],
                "data": json.dumps(event["data"])
            }
    
    return EventSourceResponse(event_generator())


@router.get("/negotiations")
async def list_all_negotiations():
    """
    List all active negotiations.
    """
    # Return all stored negotiations
    negotiations = []
    for neg_id in negotiation_service._negotiations.keys():
        neg = await negotiation_service.get_negotiation(neg_id)
        if neg:
            negotiations.append({
                "id": neg.id,
                "merchant_name": neg.merchant_name,
                "amount": neg.amount,
                "status": neg.status,
            })
    return negotiations


@router.get("/negotiations/history")
async def get_negotiation_history():
    """
    Get history of completed negotiations.
    """
    history = await negotiation_service.get_history()
    return [
        {
            "id": h.id,
            "merchant_name": h.merchant_name,
            "amount": h.amount,
            "goal": h.goal,
            "outcome": h.outcome.outcome_type if h.outcome else None,
            "amount_saved": h.outcome.amount_saved if h.outcome else 0,
        }
        for h in history
    ]
