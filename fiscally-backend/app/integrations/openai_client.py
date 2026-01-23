"""
OpenAI Client Integration
Thin wrapper around OpenAI SDK with Opik tracing support.
"""

from openai import OpenAI, AsyncOpenAI
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import json

from app.core.config import settings

# Try to import opik for tracing
try:
    from opik import track
    from opik.integrations.openai import track_openai
    OPIK_AVAILABLE = True
except ImportError:
    OPIK_AVAILABLE = False
    # Fallback decorator that does nothing
    def track(*args, **kwargs):
        def decorator(func):
            return func
        return decorator


class OpenAIClient:
    """
    OpenAI API client with Opik tracing integration.
    Supports both sync and async operations.
    """
    
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.model = settings.OPENAI_MODEL
        self.mock_mode = settings.MOCK_MODE
        
        if not self.mock_mode and self.api_key:
            self._sync_client = OpenAI(api_key=self.api_key)
            self._async_client = AsyncOpenAI(api_key=self.api_key)
            
            # Wrap clients with Opik tracking if available
            if OPIK_AVAILABLE:
                self._sync_client = track_openai(self._sync_client)
                self._async_client = track_openai(self._async_client)
        else:
            self._sync_client = None
            self._async_client = None
    
    @track(name="openai_chat_completion")
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1000,
        response_format: Optional[Dict] = None,
    ) -> str:
        """
        Generate a chat completion.
        Returns the assistant's response content.
        """
        if self.mock_mode or not self._async_client:
            return self._mock_response(messages)
        
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        if response_format:
            kwargs["response_format"] = response_format
        
        response = await self._async_client.chat.completions.create(**kwargs)
        return response.choices[0].message.content
    
    @track(name="openai_structured_output")
    async def structured_completion(
        self,
        messages: List[Dict[str, str]],
        response_model: type[BaseModel],
        temperature: float = 0.7,
    ) -> BaseModel:
        """
        Generate a structured response parsed into a Pydantic model.
        """
        if self.mock_mode or not self._async_client:
            mock_data = self._mock_structured_response(response_model)
            return response_model.model_validate(mock_data)
        
        # Use JSON mode for structured output
        response = await self.chat_completion(
            messages=messages,
            temperature=temperature,
            response_format={"type": "json_object"}
        )
        
        # Parse JSON response
        try:
            data = json.loads(response)
            return response_model.model_validate(data)
        except (json.JSONDecodeError, Exception) as e:
            raise ValueError(f"Failed to parse structured response: {e}")
    
    def _mock_response(self, messages: List[Dict[str, str]]) -> str:
        """Generate mock response for demo mode."""
        last_message = messages[-1]["content"] if messages else ""
        
        # Basic mock responses based on context
        if "refund" in last_message.lower() or "negotiat" in last_message.lower():
            return (
                "I understand you'd like to request a refund. I've reviewed your account "
                "and I can see you've been a valued customer. Let me process this request "
                "and see what options we have available for you."
            )
        elif "opening" in last_message.lower():
            return (
                "Hello, I'm reaching out regarding a recent charge of ${amount} on my account. "
                "I've been a subscriber but haven't fully utilized the service. "
                "I would kindly request a full refund for this billing cycle."
            )
        elif "evaluate" in last_message.lower() or "offer" in last_message.lower():
            return json.dumps({
                "decision": "counter",
                "reasoning": "The retention offer is not aligned with the user's goal of a full refund. We should push for the original request."
            })
        else:
            return "Thank you for your message. I'm here to help with your request."
    
    def _mock_structured_response(self, response_model: type[BaseModel]) -> dict:
        """Generate mock structured data based on model fields."""
        # Return sensible defaults based on model name
        model_name = response_model.__name__.lower()
        
        if "decision" in model_name or "evaluate" in model_name:
            return {
                "decision": "counter",
                "reasoning": "The offer doesn't meet the user's goal.",
                "next_action": "Request full refund again"
            }
        
        return {"mock": True, "message": "Mock response"}


# Singleton instance
openai_client = OpenAIClient()
