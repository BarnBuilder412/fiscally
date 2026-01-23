"""
SubZero LangGraph Workflow
Defines the negotiation state machine graph.
"""

from langgraph.graph import StateGraph, END
from typing import Literal

from app.agents.subzero.states import SubZeroAgentState
from app.agents.subzero.nodes import (
    read_vendor_policy,
    generate_opening_message,
    process_vendor_response,
    evaluate_offer,
    resolve_negotiation,
)


def should_continue(state: SubZeroAgentState) -> Literal["continue", "resolve", "await_user"]:
    """
    Router function to determine next step after vendor response.
    """
    if state.get("awaiting_user_decision"):
        return "await_user"
    
    if state.get("should_continue", False):
        return "continue"
    
    phase = state.get("current_phase", "")
    if phase == "resolved":
        return "resolve"
    
    # Default: try to continue negotiating if we haven't hit max rounds
    rounds = state.get("negotiation_rounds", 0)
    if rounds < 3 and state.get("vendor_offer", {}).get("offer_type") != "refund":
        return "continue"
    
    return "resolve"


def create_negotiation_graph() -> StateGraph:
    """
    Create the SubZero negotiation workflow graph.
    
    Flow:
    1. read_vendor_policy -> Fetch merchant refund policy
    2. generate_opening_message -> Create initial request
    3. process_vendor_response -> Simulate vendor reply
    4. evaluate_offer -> Decide next action
    5. resolve_negotiation -> Final outcome (or loop back to step 3)
    
    If vendor offers retention deal: pauses for user decision
    """
    
    # Create the graph
    workflow = StateGraph(SubZeroAgentState)
    
    # Add nodes
    workflow.add_node("read_policy", read_vendor_policy)
    workflow.add_node("generate_opening", generate_opening_message)
    workflow.add_node("vendor_response", process_vendor_response)
    workflow.add_node("evaluate", evaluate_offer)
    workflow.add_node("resolve", resolve_negotiation)
    
    # Define edges
    workflow.set_entry_point("read_policy")
    
    # Linear flow to start
    workflow.add_edge("read_policy", "generate_opening")
    workflow.add_edge("generate_opening", "vendor_response")
    workflow.add_edge("vendor_response", "evaluate")
    
    # Conditional routing after evaluation
    workflow.add_conditional_edges(
        "evaluate",
        should_continue,
        {
            "continue": "vendor_response",  # Loop back for another round
            "resolve": "resolve",           # Go to final resolution
            "await_user": END,              # Pause for user decision
        }
    )
    
    # Resolution ends the graph
    workflow.add_edge("resolve", END)
    
    return workflow


def compile_graph():
    """Compile the workflow graph for execution."""
    workflow = create_negotiation_graph()
    return workflow.compile()


# Pre-compiled graph instance
negotiation_graph = compile_graph()
