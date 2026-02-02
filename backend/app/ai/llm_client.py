"""
Fiscally LLM Client
===================
OpenAI wrapper with search-assisted categorization for unknown merchants.
Instrumented with Opik for observability.
"""

import os
import json
import httpx
from typing import Optional, Dict, Any, List
from openai import AsyncOpenAI
import opik

from .prompts import (
    lookup_merchant,
    build_categorization_prompt,
    build_search_query_prompt,
    build_anomaly_detection_prompt,
    build_voice_parsing_prompt,
    build_chat_system_prompt,
    build_weekly_insights_prompt,
    build_memory_extraction_prompt,
    CATEGORIES,
)

# Initialize Opik (optional - graceful degradation if not configured)
_opik_enabled = False
try:
    api_key = os.getenv("OPIK_API_KEY")
    workspace = os.getenv("OPIK_WORKSPACE")
    if api_key and workspace:
        opik.configure(api_key=api_key, workspace=workspace, force=False)
        _opik_enabled = True
        print(f"Opik observability enabled for workspace: {workspace}")
except Exception as e:
    print(f"Opik not configured (observability disabled): {e}")


class LLMClient:
    """
    Async OpenAI client wrapper for Fiscally.
    Includes search-assisted categorization for unknown merchants.
    """
    
    # Confidence threshold below which we search for merchant info
    SEARCH_CONFIDENCE_THRESHOLD = 0.7
    
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.search_api_key = os.getenv("SERPER_API_KEY")  # For web search
    
    async def _complete(
        self,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.3,
        json_mode: bool = True
    ) -> str:
        """Base completion method."""
        messages = []
        
        if system:
            messages.append({"role": "system", "content": system})
        
        messages.append({"role": "user", "content": prompt})
        
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        
        response = await self.client.chat.completions.create(**kwargs)
        return response.choices[0].message.content
    
    async def _search_merchant(self, merchant_name: str) -> Optional[str]:
        """
        Search web for unknown merchant info.
        Only called when categorization confidence is low.
        
        Uses Serper API (Google Search API alternative).
        """
        if not self.search_api_key:
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://google.serper.dev/search",
                    headers={"X-API-KEY": self.search_api_key},
                    json={
                        "q": f"{merchant_name} India what type of store business",
                        "num": 3
                    },
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    # Extract snippets from search results
                    snippets = []
                    for result in data.get("organic", [])[:3]:
                        snippet = result.get("snippet", "")
                        if snippet:
                            snippets.append(snippet)
                    
                    return " | ".join(snippets) if snippets else None
        except Exception as e:
            print(f"Search failed for {merchant_name}: {e}")
            return None
        
        return None

    # =========================================================================
    # TRANSACTION CATEGORIZATION (with search fallback)
    # =========================================================================
    
    @opik.track(name="categorize_transaction")
    async def categorize_transaction(
        self,
        transaction: Dict[str, Any],
        user_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Categorize a transaction.
        
        Flow:
        1. Check known merchant map (fast path)
        2. LLM categorization
        3. If confidence < 0.7 AND unknown merchant → search → re-categorize
        """
        merchant = transaction.get("merchant", "")
        
        # Step 1: Fast path - known merchant lookup
        known_category = lookup_merchant(merchant)
        if known_category:
            return {
                "category": known_category,
                "confidence": 0.95,
                "source": "merchant_map"
            }
        
        # Step 2: LLM categorization (first attempt)
        prompt = build_categorization_prompt(transaction, user_context)
        response = await self._complete(prompt, temperature=0.3)
        
        try:
            result = json.loads(response)
        except json.JSONDecodeError:
            return {"category": "other", "confidence": 0.5, "source": "fallback"}
        
        category = result.get("category", "other")
        confidence = result.get("confidence", 0.5)
        
        # Validate category
        if category not in CATEGORIES:
            category = "other"
            confidence = 0.5
        
        # Step 3: If low confidence + unknown merchant → search for info
        if confidence < self.SEARCH_CONFIDENCE_THRESHOLD and merchant:
            search_context = await self._search_merchant(merchant)
            
            if search_context:
                # Re-categorize with search context
                prompt_with_search = build_categorization_prompt(
                    transaction, 
                    user_context,
                    search_context=search_context
                )
                response = await self._complete(prompt_with_search, temperature=0.2)
                
                try:
                    result = json.loads(response)
                    category = result.get("category", category)
                    confidence = result.get("confidence", confidence)
                    
                    if category not in CATEGORIES:
                        category = "other"
                    
                    return {
                        "category": category,
                        "confidence": confidence,
                        "source": "llm_with_search",
                        "search_used": True
                    }
                except json.JSONDecodeError:
                    pass
        
        return {
            "category": category,
            "confidence": confidence,
            "source": "llm"
        }

    # =========================================================================
    # ANOMALY DETECTION
    # =========================================================================
    
    @opik.track(name="detect_anomaly")
    async def detect_anomaly(
        self,
        transaction: Dict[str, Any],
        user_stats: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Detect if transaction is unusual for this user."""
        prompt = build_anomaly_detection_prompt(transaction, user_stats)
        response = await self._complete(prompt, temperature=0.3)
        
        try:
            result = json.loads(response)
            return {
                "is_anomaly": result.get("is_anomaly", False),
                "severity": result.get("severity"),
                "reason": result.get("reason")
            }
        except json.JSONDecodeError:
            return {"is_anomaly": False, "severity": None, "reason": None}

    # =========================================================================
    # VOICE PARSING
    # =========================================================================
    
    @opik.track(name="parse_voice_input")
    async def parse_voice_input(
        self,
        transcript: str,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Parse voice transcript to structured transaction."""
        prompt = build_voice_parsing_prompt(transcript, user_context)
        response = await self._complete(prompt, temperature=0.5)
        
        try:
            result = json.loads(response)
            
            # Validate and clean
            return {
                "amount": result.get("amount", 0),
                "merchant": result.get("merchant"),
                "category": result.get("category", "other"),
                "confidence": result.get("confidence", 0.5),
                "needs_clarification": result.get("needs_clarification", False),
                "clarification_question": result.get("clarification_question")
            }
        except json.JSONDecodeError:
            return {
                "amount": 0,
                "merchant": None,
                "category": "other",
                "confidence": 0.0,
                "needs_clarification": True,
                "clarification_question": "Could not parse voice input. Please try again."
            }

    # =========================================================================
    # CHAT
    # =========================================================================
    
    @opik.track(name="chat")
    async def chat(
        self,
        message: str,
        user_context: Dict[str, Any],
        transaction_data: Optional[str] = None,  # Formatted transaction data from DB
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Chat with user about their finances.
        
        Args:
            message: User's message
            user_context: Full user context (profile, patterns, goals, memory)
            transaction_data: Pre-formatted transaction data relevant to query
            conversation_history: Previous messages in conversation
        """
        system_prompt = build_chat_system_prompt(user_context)
        
        # Add transaction data if provided (from DB query, not search)
        if transaction_data:
            system_prompt += f"\n\n## Relevant Transaction Data\n{transaction_data}"
        
        messages = [{"role": "system", "content": system_prompt}]
        
        if conversation_history:
            messages.extend(conversation_history)
        
        messages.append({"role": "user", "content": message})
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
        )
        
        return response.choices[0].message.content

    # =========================================================================
    # WEEKLY INSIGHTS
    # =========================================================================
    
    @opik.track(name="generate_weekly_insights")
    async def generate_weekly_insights(
        self,
        user_context: Dict[str, Any],
        transactions: List[Dict[str, Any]],
        last_week_total: float = 0
    ) -> Dict[str, Any]:
        """Generate weekly spending insights."""
        prompt = build_weekly_insights_prompt(
            user_context, 
            transactions, 
            last_week_total
        )
        response = await self._complete(prompt, temperature=0.7)
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {
                "headline": "Your week in review",
                "summary": "Unable to generate summary.",
                "tip": "Keep tracking your expenses!"
            }

    # =========================================================================
    # MEMORY EXTRACTION
    # =========================================================================
    
    @opik.track(name="extract_memory")
    async def extract_memory(self, message: str) -> Dict[str, Any]:
        """Extract facts to remember from user message."""
        prompt = build_memory_extraction_prompt(message)
        response = await self._complete(prompt, temperature=0.3)
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {"has_fact": False, "fact": None, "category": None}


# Singleton instance
llm_client = LLMClient()
