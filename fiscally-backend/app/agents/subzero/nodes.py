"""
SubZero Agent Node Functions
LangGraph nodes for negotiation workflow with Opik tracing.
"""

import json
import random
from datetime import datetime
from typing import Dict, Any

from app.agents.subzero.states import SubZeroAgentState, MessageState, VendorOfferState, OutcomeState
from app.integrations.openai_client import openai_client
from app.integrations.opik_client import track, OPIK_AVAILABLE

# Load vendor policies
import os
MOCK_DATA_PATH = os.path.join(os.path.dirname(__file__), "../../../mock_data/vendor_policies.json")


def load_vendor_policies() -> Dict[str, Any]:
    """Load vendor policies from JSON file."""
    try:
        with open(MOCK_DATA_PATH, "r") as f:
            data = json.load(f)
            return {v["merchant_name"]: v for v in data["vendors"]}
    except Exception as e:
        print(f"Warning: Could not load vendor policies: {e}")
        return {}


VENDOR_POLICIES = load_vendor_policies()


# =============================================================================
# Node 1: Read Vendor Policy
# =============================================================================

@track(name="read_vendor_policy")
async def read_vendor_policy(state: SubZeroAgentState) -> Dict[str, Any]:
    """
    Fetch the vendor's refund/cancellation policy.
    """
    merchant_name = state["merchant_name"]
    
    policy = VENDOR_POLICIES.get(merchant_name)
    
    if policy:
        vendor_policy = {
            "merchant_name": policy["merchant_name"],
            "refund_window_days": policy["refund_window_days"],
            "pro_rated_refund": policy["pro_rated_refund"],
            "retention_offers": policy["retention_offers"],
            "refund_difficulty": policy["refund_difficulty"],
            "notes": policy["notes"],
        }
        system_msg: MessageState = {
            "role": "system",
            "content": f"📋 Retrieved policy for {merchant_name}: {policy['refund_difficulty']} difficulty, {policy['refund_window_days']} day refund window.",
            "timestamp": datetime.utcnow().isoformat(),
        }
    else:
        # Default policy for unknown vendors
        vendor_policy = {
            "merchant_name": merchant_name,
            "refund_window_days": 14,
            "pro_rated_refund": False,
            "retention_offers": ["Discount offer", "Free month"],
            "refund_difficulty": "medium",
            "notes": "Unknown vendor - using default negotiation strategy.",
        }
        system_msg: MessageState = {
            "role": "system",
            "content": f"📋 No specific policy found for {merchant_name}. Using standard approach.",
            "timestamp": datetime.utcnow().isoformat(),
        }
    
    return {
        "vendor_policy": vendor_policy,
        "messages": [system_msg],
        "current_phase": "opening",
    }


# =============================================================================
# Node 2: Generate Opening Message
# =============================================================================

@track(name="generate_opening_message")
async def generate_opening_message(state: SubZeroAgentState) -> Dict[str, Any]:
    """
    Generate the initial negotiation message using GPT-4o.
    """
    merchant = state["merchant_name"]
    amount = state["amount"]
    goal = state["user_goal"]
    policy = state.get("vendor_policy", {})
    user_note = state.get("user_note", "")
    
    # Build prompt
    goal_descriptions = {
        "full_refund": "a complete refund",
        "partial_refund": "a partial refund",
        "better_deal": "a better deal or discount",
        "cancel_only": "to cancel the subscription",
    }
    goal_text = goal_descriptions.get(goal, "a refund")
    
    system_prompt = """You are SubZero, a professional and assertive negotiation agent helping users get refunds from companies.
Your approach is:
- Polite but firm
- Reference specific facts (billing date, amount, usage)
- Know the company's policies
- Be persuasive but not aggressive

Generate an opening message to the company's support team requesting {goal_text}.
Keep it concise (2-3 sentences max).
"""
    
    user_prompt = f"""Company: {merchant}
Amount to refund: ${amount:.2f}
Goal: {goal_text}
Company Policy Notes: {policy.get('notes', 'N/A')}
User's Additional Context: {user_note if user_note else 'None provided'}

Generate the opening negotiation message:"""
    
    opening_message = await openai_client.chat_completion(
        messages=[
            {"role": "system", "content": system_prompt.format(goal_text=goal_text)},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
        max_tokens=200,
    )
    
    agent_msg: MessageState = {
        "role": "agent",
        "content": opening_message,
        "timestamp": datetime.utcnow().isoformat(),
    }
    
    return {
        "messages": [agent_msg],
        "current_phase": "negotiating",
        "negotiation_rounds": 1,
    }


# =============================================================================
# Node 3: Process Vendor Response (Simulated)
# =============================================================================

@track(name="process_vendor_response")
async def process_vendor_response(state: SubZeroAgentState) -> Dict[str, Any]:
    """
    Simulate vendor response based on probability distribution from SRS:
    - 70% chance: Full refund approved
    - 20% chance: Retention offer
    - 10% chance: Refund denied
    """
    policy = state.get("vendor_policy", {})
    amount = state["amount"]
    goal = state["user_goal"]
    difficulty = policy.get("refund_difficulty", "medium")
    rounds = state.get("negotiation_rounds", 1)
    
    # Adjust probabilities based on difficulty and rounds
    if difficulty == "easy":
        refund_prob = 0.80
        retention_prob = 0.15
    elif difficulty == "hard":
        refund_prob = 0.50
        retention_prob = 0.35
    else:
        refund_prob = 0.70
        retention_prob = 0.20
    
    # Increase refund probability on subsequent rounds (persistence pays off)
    if rounds > 1:
        refund_prob = min(0.90, refund_prob + 0.10)
    
    roll = random.random()
    
    if roll < refund_prob:
        # Refund approved
        vendor_offer: VendorOfferState = {
            "offer_type": "refund",
            "amount": amount,
            "description": f"Full refund of ${amount:.2f} approved",
            "free_months": None,
            "discount_percent": None,
            "requires_user_decision": False,
        }
        vendor_msg: MessageState = {
            "role": "vendor",
            "content": f"Thank you for reaching out. After reviewing your account, I'm happy to process a full refund of ${amount:.2f}. This will be credited back to your original payment method within 5-7 business days.",
            "timestamp": datetime.utcnow().isoformat(),
        }
        awaiting_user = False
        
    elif roll < refund_prob + retention_prob:
        # Retention offer
        retention_offers = policy.get("retention_offers", ["2 months free"])
        selected_offer = random.choice(retention_offers)
        
        vendor_offer: VendorOfferState = {
            "offer_type": "retention",
            "amount": None,
            "description": selected_offer,
            "free_months": 2 if "month" in selected_offer.lower() else None,
            "discount_percent": 40 if "%" in selected_offer else None,
            "requires_user_decision": True,
        }
        vendor_msg: MessageState = {
            "role": "vendor",
            "content": f"I understand your concerns. While I can't process a full refund at this time, I can offer you something special: {selected_offer}. Would you like to accept this offer?",
            "timestamp": datetime.utcnow().isoformat(),
        }
        awaiting_user = True
        
    else:
        # Refund denied
        vendor_offer: VendorOfferState = {
            "offer_type": "rejection",
            "amount": None,
            "description": "Refund request denied",
            "free_months": None,
            "discount_percent": None,
            "requires_user_decision": False,
        }
        vendor_msg: MessageState = {
            "role": "vendor",
            "content": "I apologize, but according to our policy, we're unable to process a refund for your subscription at this time. The charges are valid based on our terms of service.",
            "timestamp": datetime.utcnow().isoformat(),
        }
        awaiting_user = False
    
    return {
        "vendor_offer": vendor_offer,
        "messages": [vendor_msg],
        "awaiting_user_decision": awaiting_user,
        "current_phase": "awaiting_user" if awaiting_user else "negotiating",
    }


# =============================================================================
# Node 4: Evaluate Offer
# =============================================================================

@track(name="evaluate_offer")
async def evaluate_offer(state: SubZeroAgentState) -> Dict[str, Any]:
    """
    Use GPT-4o to decide how to respond to vendor's offer.
    Returns: accept, counter, or escalate
    """
    offer = state.get("vendor_offer")
    goal = state["user_goal"]
    amount = state["amount"]
    rounds = state.get("negotiation_rounds", 1)
    
    if not offer:
        return {"error": "No vendor offer to evaluate"}
    
    offer_type = offer["offer_type"]
    
    # If full refund approved and that's the goal, accept immediately
    if offer_type == "refund" and goal == "full_refund":
        return {
            "current_phase": "resolved",
            "should_continue": False,
        }
    
    # If retention offer and user wants full refund, evaluate
    if offer_type == "retention" and goal == "full_refund":
        # This requires user decision - pause here
        system_msg: MessageState = {
            "role": "system",
            "content": f"⚠️ Vendor offered retention deal: {offer['description']}. This doesn't match your goal of full refund. Please decide: accept this offer or push for full refund?",
            "timestamp": datetime.utcnow().isoformat(),
        }
        return {
            "messages": [system_msg],
            "awaiting_user_decision": True,
            "current_phase": "awaiting_user",
            "should_continue": False,
        }
    
    # If rejected, try counter-argument (up to 3 rounds)
    if offer_type == "rejection" and rounds < 3:
        counter_prompt = f"""The vendor rejected our refund request. 
Original amount: ${amount:.2f}
Current round: {rounds}

Generate a brief, persuasive counter-argument to push for the refund. 
Be persistent but professional. Mention consumer rights or escalation if needed.
Keep it to 2-3 sentences."""
        
        counter_message = await openai_client.chat_completion(
            messages=[
                {"role": "system", "content": "You are SubZero, a tenacious negotiation agent."},
                {"role": "user", "content": counter_prompt},
            ],
            temperature=0.7,
            max_tokens=150,
        )
        
        agent_msg: MessageState = {
            "role": "agent",
            "content": counter_message,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        return {
            "messages": [agent_msg],
            "negotiation_rounds": rounds + 1,
            "should_continue": True,
            "current_phase": "negotiating",
        }
    
    # Max rounds reached or other failure
    if offer_type == "rejection":
        return {
            "current_phase": "resolved",
            "should_continue": False,
        }
    
    return {"should_continue": False, "current_phase": "resolved"}


# =============================================================================
# Node 5: Handle User Decision (for retention offers)
# =============================================================================

@track(name="handle_user_decision")
async def handle_user_decision(state: SubZeroAgentState, decision: str) -> Dict[str, Any]:
    """
    Process user's decision on retention offer.
    decision: "accept" or "reject"
    """
    offer = state.get("vendor_offer")
    amount = state["amount"]
    
    if decision == "accept":
        outcome: OutcomeState = {
            "outcome_type": "retention_offer_accepted",
            "amount_saved": 0,  # No refund, but got retention deal
            "description": f"Accepted retention offer: {offer['description']}",
            "confirmation_message": "Retention offer accepted. Your account has been updated.",
        }
        agent_msg: MessageState = {
            "role": "agent",
            "content": f"I've accepted the retention offer on your behalf: {offer['description']}. Your account has been updated accordingly.",
            "timestamp": datetime.utcnow().isoformat(),
        }
    else:
        # User rejected - push for full refund
        agent_msg: MessageState = {
            "role": "agent",
            "content": "I understand you want to pursue the full refund. Let me escalate this request and push harder for your original goal.",
            "timestamp": datetime.utcnow().isoformat(),
        }
        return {
            "messages": [agent_msg],
            "awaiting_user_decision": False,
            "should_continue": True,
            "negotiation_rounds": state.get("negotiation_rounds", 1) + 1,
            "current_phase": "negotiating",
        }
    
    return {
        "outcome": outcome,
        "messages": [agent_msg],
        "current_phase": "resolved",
        "awaiting_user_decision": False,
        "should_continue": False,
    }


# =============================================================================
# Node 6: Resolve Negotiation
# =============================================================================

@track(name="resolve_negotiation")
async def resolve_negotiation(state: SubZeroAgentState) -> Dict[str, Any]:
    """
    Generate final outcome and summary.
    """
    offer = state.get("vendor_offer")
    amount = state["amount"]
    goal = state["user_goal"]
    
    if not offer:
        outcome: OutcomeState = {
            "outcome_type": "cancelled",
            "amount_saved": 0,
            "description": "Negotiation ended without resolution",
            "confirmation_message": None,
        }
    elif offer["offer_type"] == "refund":
        outcome: OutcomeState = {
            "outcome_type": "refund_approved",
            "amount_saved": amount,
            "description": f"Full refund of ${amount:.2f} approved!",
            "confirmation_message": "Your refund has been processed. Expect credit within 5-7 business days.",
        }
    elif offer["offer_type"] == "retention" and state.get("outcome"):
        # Already handled by user decision
        outcome = state["outcome"]
    elif offer["offer_type"] == "rejection":
        outcome: OutcomeState = {
            "outcome_type": "refund_denied",
            "amount_saved": 0,
            "description": "Unfortunately, the refund request was denied after multiple attempts.",
            "confirmation_message": "You may consider filing a dispute with your bank/credit card company.",
        }
    else:
        outcome: OutcomeState = {
            "outcome_type": "cancelled",
            "amount_saved": 0,
            "description": "Negotiation completed",
            "confirmation_message": None,
        }
    
    # Final summary message
    goal_achieved = (
        (goal == "full_refund" and outcome["outcome_type"] == "refund_approved") or
        (goal == "cancel_only" and outcome["outcome_type"] in ["refund_approved", "cancelled"])
    )
    
    if goal_achieved:
        summary = f"🎉 SUCCESS! {outcome['description']}"
    else:
        summary = f"📋 {outcome['description']}"
    
    final_msg: MessageState = {
        "role": "system",
        "content": summary,
        "timestamp": datetime.utcnow().isoformat(),
    }
    
    return {
        "outcome": outcome,
        "messages": [final_msg],
        "current_phase": "resolved",
        "should_continue": False,
    }
