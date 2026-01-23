"""
Negotiation Evaluation Datasets
Pre-built test scenarios for evaluating SubZero agent quality.
"""

from typing import List, Dict, Any


# =============================================================================
# Test Scenarios per SRS Requirements
# =============================================================================

NEGOTIATION_SCENARIOS: List[Dict[str, Any]] = [
    # Scenario 1: Easy refund (Adobe within window)
    {
        "id": "scenario_1",
        "name": "Adobe Easy Refund",
        "description": "User wants full refund from Adobe within 14-day window",
        "input": {
            "merchant_name": "Adobe Creative Cloud",
            "amount": 54.99,
            "goal": "full_refund",
            "user_note": "I signed up yesterday by accident",
        },
        "expected_outcome": "refund_approved",
        "expected_min_tenacity": 0.7,
        "expected_min_alignment": 0.9,
    },
    
    # Scenario 2: Hard refund (Netflix)
    {
        "id": "scenario_2",
        "name": "Netflix Challenge",
        "description": "User wants refund from Netflix (no refund policy)",
        "input": {
            "merchant_name": "Netflix",
            "amount": 15.99,
            "goal": "full_refund",
            "user_note": "Haven't used the service this month",
        },
        "expected_outcome": "retention_offer_accepted",  # Likely outcome
        "expected_min_tenacity": 0.6,
        "expected_min_alignment": 0.5,
    },
    
    # Scenario 3: Cancellation only
    {
        "id": "scenario_3",
        "name": "Planet Fitness Cancel",
        "description": "User just wants to cancel, no refund needed",
        "input": {
            "merchant_name": "Planet Fitness",
            "amount": 10.00,
            "goal": "cancel_only",
            "user_note": "Moving to a new city",
        },
        "expected_outcome": "cancelled",
        "expected_min_tenacity": 0.5,
        "expected_min_alignment": 0.7,
    },
    
    # Scenario 4: Better deal negotiation
    {
        "id": "scenario_4",
        "name": "Spotify Better Deal",
        "description": "User wants a better price on Spotify",
        "input": {
            "merchant_name": "Spotify",
            "amount": 10.99,
            "goal": "better_deal",
            "user_note": "Apple Music is offering me $4.99/month",
        },
        "expected_outcome": "retention_offer_accepted",
        "expected_min_tenacity": 0.6,
        "expected_min_alignment": 0.8,
    },
    
    # Scenario 5: Meal kit partial refund
    {
        "id": "scenario_5",
        "name": "HelloFresh Partial",
        "description": "User wants partial refund for undelivered box",
        "input": {
            "merchant_name": "HelloFresh",
            "amount": 60.00,
            "goal": "partial_refund",
            "user_note": "Box was damaged on arrival, ingredients spoiled",
        },
        "expected_outcome": "refund_approved",
        "expected_min_tenacity": 0.7,
        "expected_min_alignment": 0.8,
    },
    
    # Scenario 6: High tenacity test (reject retention)
    {
        "id": "scenario_6",
        "name": "Adobe Full Refund Insistence",
        "description": "User explicitly wants ONLY full refund, rejects retention",
        "input": {
            "merchant_name": "Adobe Creative Cloud",
            "amount": 54.99,
            "goal": "full_refund",
            "user_note": "I do not want any offers, only complete refund",
        },
        "expected_outcome": "refund_approved",
        "expected_min_tenacity": 0.9,
        "expected_min_alignment": 1.0,
    },
    
    # Scenario 7: Unknown vendor
    {
        "id": "scenario_7",
        "name": "Unknown Service Refund",
        "description": "Test with vendor not in database",
        "input": {
            "merchant_name": "Random SaaS Tool",
            "amount": 29.99,
            "goal": "full_refund",
            "user_note": "Trial converted without my consent",
        },
        "expected_outcome": "refund_approved",
        "expected_min_tenacity": 0.6,
        "expected_min_alignment": 0.7,
    },
    
    # Scenario 8: Multiple rounds needed
    {
        "id": "scenario_8",
        "name": "Persistent Negotiation",
        "description": "Scenario requiring multiple negotiation rounds",
        "input": {
            "merchant_name": "Netflix",
            "amount": 15.99,
            "goal": "full_refund",
            "user_note": "I was charged after cancelling",
        },
        "expected_outcome": "refund_approved",
        "expected_min_tenacity": 0.8,
        "expected_min_alignment": 0.9,
    },
]


def get_all_scenarios() -> List[Dict[str, Any]]:
    """Get all evaluation scenarios."""
    return NEGOTIATION_SCENARIOS


def get_scenario_by_id(scenario_id: str) -> Dict[str, Any]:
    """Get a specific scenario by ID."""
    for scenario in NEGOTIATION_SCENARIOS:
        if scenario["id"] == scenario_id:
            return scenario
    return None


def get_scenarios_by_merchant(merchant_name: str) -> List[Dict[str, Any]]:
    """Get all scenarios for a specific merchant."""
    return [
        s for s in NEGOTIATION_SCENARIOS
        if s["input"]["merchant_name"] == merchant_name
    ]


def get_scenarios_by_goal(goal: str) -> List[Dict[str, Any]]:
    """Get all scenarios with a specific goal."""
    return [
        s for s in NEGOTIATION_SCENARIOS
        if s["input"]["goal"] == goal
    ]
