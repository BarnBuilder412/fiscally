"""
Opik Client Configuration
LLM observability and evaluation integration.
"""

import os
from typing import Optional

from app.core.config import settings

# Try to import opik
try:
    import opik
    from opik import Opik, track
    OPIK_AVAILABLE = True
except ImportError:
    OPIK_AVAILABLE = False
    
    # Fallback decorator
    def track(*args, **kwargs):
        def decorator(func):
            return func
        return decorator


class OpikClient:
    """
    Opik integration client for LLM observability.
    Handles initialization, tracing, and evaluation.
    """
    
    def __init__(self):
        self.api_key = os.getenv("OPIK_API_KEY", "")
        self.workspace = os.getenv("OPIK_WORKSPACE", "fiscally-hackathon")
        self.project_name = os.getenv("OPIK_PROJECT_NAME", "subzero-agent")
        self.enabled = OPIK_AVAILABLE and bool(self.api_key)
        self._client: Optional[Opik] = None
        
        if self.enabled:
            self._initialize()
    
    def _initialize(self):
        """Initialize Opik client with configuration."""
        try:
            opik.configure(
                api_key=self.api_key,
                workspace=self.workspace,
            )
            self._client = Opik(project_name=self.project_name)
            print(f"✅ Opik initialized: workspace={self.workspace}, project={self.project_name}")
        except Exception as e:
            print(f"⚠️ Opik initialization failed: {e}")
            self.enabled = False
    
    def log_trace(
        self,
        name: str,
        input_data: dict,
        output_data: dict,
        metadata: Optional[dict] = None,
    ):
        """
        Log a trace to Opik.
        Used for custom tracing outside of @track decorator.
        """
        if not self.enabled or not self._client:
            return
        
        try:
            trace = self._client.trace(
                name=name,
                input=input_data,
                output=output_data,
                metadata=metadata or {},
            )
            return trace
        except Exception as e:
            print(f"⚠️ Failed to log trace: {e}")
    
    def log_feedback(
        self,
        trace_id: str,
        score_name: str,
        score_value: float,
        reason: Optional[str] = None,
    ):
        """
        Log feedback/score for a trace.
        Used for evaluation metrics.
        """
        if not self.enabled or not self._client:
            return
        
        try:
            self._client.log_traces_feedback(
                trace_ids=[trace_id],
                scores=[{
                    "name": score_name,
                    "value": score_value,
                    "reason": reason or "",
                }]
            )
        except Exception as e:
            print(f"⚠️ Failed to log feedback: {e}")
    
    @property
    def is_enabled(self) -> bool:
        """Check if Opik is properly configured and enabled."""
        return self.enabled


# Export the track decorator for use in other modules
__all__ = ["OpikClient", "track", "OPIK_AVAILABLE"]

# Singleton instance
opik_client = OpikClient()
