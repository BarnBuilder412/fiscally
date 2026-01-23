"""
SubZero Negotiation Agent
High-level agent class for orchestrating negotiations.
"""

from typing import Optional, Dict, Any, AsyncGenerator
from datetime import datetime
import asyncio

from app.agents.subzero.states import SubZeroAgentState
from app.agents.subzero.graph import negotiation_graph
from app.agents.subzero.nodes import handle_user_decision
from app.integrations.opik_client import track, opik_client
from app.models.subzero import (
    NegotiationState,
    NegotiationStatus,
    NegotiationMessage,
    MessageRole,
)


class NegotiationAgent:
    """
    SubZero Negotiation Agent
    
    Orchestrates the LangGraph workflow for subscription negotiations.
    Supports:
    - Running full negotiation flow
    - Pausing for user decisions (retention offers)
    - Resuming after user input
    - Streaming state updates
    """
    
    def __init__(self):
        self.graph = negotiation_graph
        self._active_negotiations: Dict[str, SubZeroAgentState] = {}
    
    @track(name="subzero_negotiation_start")
    async def start_negotiation(
        self,
        negotiation_id: str,
        merchant_name: str,
        amount: float,
        goal: str,
        user_note: Optional[str] = None,
    ) -> SubZeroAgentState:
        """
        Start a new negotiation.
        
        Returns the final state (may be paused if awaiting user decision).
        """
        # Initialize state
        initial_state: SubZeroAgentState = {
            "negotiation_id": negotiation_id,
            "merchant_name": merchant_name,
            "amount": amount,
            "user_goal": goal,
            "user_note": user_note,
            "vendor_policy": None,
            "messages": [],
            "current_phase": "init",
            "negotiation_rounds": 0,
            "vendor_offer": None,
            "outcome": None,
            "should_continue": True,
            "awaiting_user_decision": False,
            "error": None,
        }
        
        try:
            # Run the graph
            final_state = await self.graph.ainvoke(initial_state)
            
            # Store state if paused for user decision
            if final_state.get("awaiting_user_decision"):
                self._active_negotiations[negotiation_id] = final_state
            
            return final_state
            
        except Exception as e:
            initial_state["error"] = str(e)
            initial_state["current_phase"] = "failed"
            return initial_state
    
    @track(name="subzero_negotiation_resume")
    async def resume_negotiation(
        self,
        negotiation_id: str,
        decision: str,  # "accept" or "reject"
    ) -> SubZeroAgentState:
        """
        Resume a paused negotiation after user decision.
        """
        state = self._active_negotiations.get(negotiation_id)
        
        if not state:
            return {
                "negotiation_id": negotiation_id,
                "error": "Negotiation not found or not awaiting decision",
                "current_phase": "failed",
            }
        
        # Process user decision
        updated_state = await handle_user_decision(state, decision)
        
        # Merge updates into state
        for key, value in updated_state.items():
            if key == "messages":
                state["messages"] = state.get("messages", []) + value
            else:
                state[key] = value
        
        # If user rejected retention offer, continue negotiation
        if state.get("should_continue"):
            # Run remaining graph steps
            try:
                final_state = await self.graph.ainvoke(state)
                
                if not final_state.get("awaiting_user_decision"):
                    # Clean up completed negotiation
                    self._active_negotiations.pop(negotiation_id, None)
                else:
                    self._active_negotiations[negotiation_id] = final_state
                
                return final_state
                
            except Exception as e:
                state["error"] = str(e)
                state["current_phase"] = "failed"
                return state
        else:
            # Negotiation complete
            self._active_negotiations.pop(negotiation_id, None)
            return state
    
    async def stream_negotiation(
        self,
        negotiation_id: str,
        merchant_name: str,
        amount: float,
        goal: str,
        user_note: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream negotiation updates for real-time SSE.
        
        Yields events as the negotiation progresses.
        """
        # Initialize state
        state: SubZeroAgentState = {
            "negotiation_id": negotiation_id,
            "merchant_name": merchant_name,
            "amount": amount,
            "user_goal": goal,
            "user_note": user_note,
            "vendor_policy": None,
            "messages": [],
            "current_phase": "init",
            "negotiation_rounds": 0,
            "vendor_offer": None,
            "outcome": None,
            "should_continue": True,
            "awaiting_user_decision": False,
            "error": None,
        }
        
        yield {"event": "start", "data": {"negotiation_id": negotiation_id, "status": "started"}}
        
        try:
            # Stream through each node
            async for event in self.graph.astream(state):
                # Extract node name and output
                for node_name, node_output in event.items():
                    # Check for new messages
                    if "messages" in node_output:
                        for msg in node_output["messages"]:
                            yield {
                                "event": "message",
                                "data": {
                                    "role": msg["role"],
                                    "content": msg["content"],
                                    "timestamp": msg["timestamp"],
                                }
                            }
                            # Add delay for realistic conversation feel
                            await asyncio.sleep(1.5)
                    
                    # Check for phase changes
                    if "current_phase" in node_output:
                        yield {
                            "event": "phase_change",
                            "data": {"phase": node_output["current_phase"]}
                        }
                    
                    # Check for vendor offer
                    if "vendor_offer" in node_output and node_output["vendor_offer"]:
                        yield {
                            "event": "vendor_offer",
                            "data": node_output["vendor_offer"]
                        }
                    
                    # Check for awaiting user
                    if node_output.get("awaiting_user_decision"):
                        yield {
                            "event": "awaiting_user",
                            "data": {"offer": node_output.get("vendor_offer")}
                        }
                    
                    # Check for outcome
                    if "outcome" in node_output and node_output["outcome"]:
                        yield {
                            "event": "outcome",
                            "data": node_output["outcome"]
                        }
            
            yield {"event": "complete", "data": {"status": "completed"}}
            
        except Exception as e:
            yield {"event": "error", "data": {"error": str(e)}}
    
    def get_negotiation(self, negotiation_id: str) -> Optional[SubZeroAgentState]:
        """Get current state of an active negotiation."""
        return self._active_negotiations.get(negotiation_id)
    
    def convert_to_pydantic(self, state: SubZeroAgentState) -> NegotiationState:
        """Convert agent state to Pydantic model."""
        from app.models.subzero import VendorPolicy, VendorOffer, NegotiationOutcome
        
        messages = [
            NegotiationMessage(
                role=MessageRole(msg["role"]),
                content=msg["content"],
                timestamp=datetime.fromisoformat(msg["timestamp"]) if isinstance(msg["timestamp"], str) else msg["timestamp"],
            )
            for msg in state.get("messages", [])
        ]
        
        status_map = {
            "init": NegotiationStatus.PENDING,
            "opening": NegotiationStatus.IN_PROGRESS,
            "negotiating": NegotiationStatus.IN_PROGRESS,
            "awaiting_user": NegotiationStatus.AWAITING_USER,
            "resolved": NegotiationStatus.COMPLETED,
            "failed": NegotiationStatus.FAILED,
        }
        
        return NegotiationState(
            id=state["negotiation_id"],
            merchant_name=state["merchant_name"],
            amount=state["amount"],
            goal=state["user_goal"],
            status=status_map.get(state.get("current_phase", "init"), NegotiationStatus.PENDING),
            vendor_policy=VendorPolicy(**state["vendor_policy"]) if state.get("vendor_policy") else None,
            user_note=state.get("user_note"),
            messages=messages,
            current_phase=state.get("current_phase", "init"),
            vendor_offer=VendorOffer(**state["vendor_offer"]) if state.get("vendor_offer") else None,
            negotiation_rounds=state.get("negotiation_rounds", 0),
            outcome=NegotiationOutcome(**state["outcome"]) if state.get("outcome") else None,
        )


# Singleton instance
negotiation_agent = NegotiationAgent()
