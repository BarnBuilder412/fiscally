"""
Fiscally LLM Client
===================
OpenAI wrapper with search-assisted categorization for unknown merchants.
Instrumented with Opik for observability.
"""

import os
import json
import base64
import httpx
from typing import Optional, Dict, Any, List
from openai import AsyncOpenAI
import opik

from .prompts import (
    lookup_merchant,
    build_categorization_prompt,
    build_anomaly_detection_prompt,
    build_voice_parsing_prompt,
    build_chat_system_prompt,
    build_weekly_insights_prompt,
    build_memory_extraction_prompt,
    build_spending_classification_prompt,
    build_receipt_text_parsing_prompt,
    build_receipt_image_parsing_prompt,
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
                        "q": f"{merchant_name} what type of business or store",
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
    
    @opik.track(name="categorize_transaction", tags=["categorization", "core", "transaction"])
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
        from opik import opik_context
        
        merchant = transaction.get("merchant", "")
        amount = transaction.get("amount", 0)
        
        # Log input metadata to Opik
        opik_context.update_current_span(metadata={
            "merchant": merchant,
            "amount": amount,
            "model": self.model,
            "has_user_context": user_context is not None
        })
        
        # Step 1: Fast path - known merchant lookup
        known_category = lookup_merchant(merchant)
        if known_category:
            result = {
                "category": known_category,
                "confidence": 0.95,
                "source": "merchant_map"
            }
            opik_context.update_current_span(metadata={
                "category": known_category,
                "confidence": 0.95,
                "source": "merchant_map"
            })
            return result
        
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
        
        result = {
            "category": category,
            "confidence": confidence,
            "source": "llm"
        }
        opik_context.update_current_span(metadata={
            "category": category,
            "confidence": confidence,
            "source": "llm"
        })
        return result

    # =========================================================================
    # ANOMALY DETECTION
    # =========================================================================
    
    @opik.track(name="detect_anomaly", tags=["anomaly", "core", "transaction"])
    async def detect_anomaly(
        self,
        transaction: Dict[str, Any],
        user_stats: Dict[str, Any],
        user_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Detect if transaction is unusual for this user."""
        from opik import opik_context
        
        # Log input metadata
        opik_context.update_current_span(metadata={
            "amount": transaction.get("amount"),
            "category": transaction.get("category"),
            "merchant": transaction.get("merchant"),
            "category_avg": user_stats.get("category_avg"),
            "model": self.model
        })
        
        prompt = build_anomaly_detection_prompt(transaction, user_stats, user_context=user_context)
        response = await self._complete(prompt, temperature=0.3)
        
        try:
            result = json.loads(response)
            output = {
                "is_anomaly": result.get("is_anomaly", False),
                "severity": result.get("severity"),
                "reason": result.get("reason")
            }
        except json.JSONDecodeError:
            output = {"is_anomaly": False, "severity": None, "reason": None}
        
        # Log output metadata
        opik_context.update_current_span(metadata={
            "is_anomaly": output["is_anomaly"],
            "severity": output.get("severity")
        })
        return output

    # =========================================================================
    # NEED/WANT/LUXURY CLASSIFICATION
    # =========================================================================

    @opik.track(name="classify_spending_class", tags=["classification", "needs-wants-luxury"])
    async def classify_spending_class(
        self,
        transaction: Dict[str, Any],
        user_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Classify transaction into need/want/luxury with confidence."""
        from opik import opik_context

        opik_context.update_current_span(metadata={
            "amount": transaction.get("amount"),
            "merchant": transaction.get("merchant"),
            "category": transaction.get("category"),
            "model": self.model,
        })

        prompt = build_spending_classification_prompt(transaction, user_context)
        response = await self._complete(prompt, temperature=0.2)

        try:
            parsed = json.loads(response)
        except json.JSONDecodeError:
            parsed = {}

        spend_class = str(parsed.get("spend_class", "")).lower()
        if spend_class not in {"need", "want", "luxury"}:
            spend_class = "want"

        confidence = parsed.get("confidence", 0.5)
        try:
            confidence = float(confidence)
        except (TypeError, ValueError):
            confidence = 0.5
        confidence = max(0.0, min(1.0, confidence))

        reason = parsed.get("reason", "Classified based on merchant/category context.")
        if not isinstance(reason, str):
            reason = "Classified based on merchant/category context."

        result = {
            "spend_class": spend_class,
            "confidence": confidence,
            "reason": reason[:240],
        }

        opik_context.update_current_span(metadata={
            "spend_class": result["spend_class"],
            "confidence": result["confidence"],
        })

        return result

    # =========================================================================
    # RECEIPT PARSING
    # =========================================================================

    @opik.track(name="parse_receipt_text", tags=["receipt", "ocr", "parsing"])
    async def parse_receipt_text(
        self,
        receipt_text: str,
        user_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Parse text extracted from a receipt/invoice into structured fields."""
        from opik import opik_context

        opik_context.update_current_span(metadata={
            "text_length": len(receipt_text or ""),
            "model": self.model,
        })

        prompt = build_receipt_text_parsing_prompt(receipt_text, user_context)
        response = await self._complete(prompt, temperature=0.1)

        try:
            parsed = json.loads(response)
        except json.JSONDecodeError:
            parsed = {}

        return self._normalize_receipt_parse(parsed)

    @opik.track(name="parse_receipt_image", tags=["receipt", "vision", "parsing"])
    async def parse_receipt_image(
        self,
        image_bytes: bytes,
        mime_type: str,
        user_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Parse receipt image directly using multimodal model."""
        from opik import opik_context

        opik_context.update_current_span(metadata={
            "image_size_bytes": len(image_bytes),
            "mime_type": mime_type,
            "model": self.model,
        })

        prompt = build_receipt_image_parsing_prompt(user_context)
        encoded = base64.b64encode(image_bytes).decode("ascii")
        data_url = f"data:{mime_type};base64,{encoded}"

        response = await self.client.chat.completions.create(
            model=self.model,
            response_format={"type": "json_object"},
            temperature=0.1,
            messages=[
                {"role": "system", "content": "Extract receipt data to strict JSON."},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                },
            ],
        )

        content = response.choices[0].message.content or "{}"
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            parsed = {}

        return self._normalize_receipt_parse(parsed)

    def _normalize_receipt_parse(self, parsed: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize receipt parser output into predictable structure."""
        amount = parsed.get("amount", 0)
        try:
            amount = float(amount)
        except (TypeError, ValueError):
            amount = 0.0

        confidence = parsed.get("confidence", 0.0)
        try:
            confidence = float(confidence)
        except (TypeError, ValueError):
            confidence = 0.0
        confidence = max(0.0, min(1.0, confidence))

        category = str(parsed.get("category", "other") or "other")
        if category not in CATEGORIES:
            category = "other"

        currency = str(parsed.get("currency", "INR") or "INR").upper()
        merchant = parsed.get("merchant")
        if merchant is not None:
            merchant = str(merchant)[:255]

        transaction_at = parsed.get("transaction_at")
        if transaction_at and not isinstance(transaction_at, str):
            transaction_at = None

        line_items = parsed.get("line_items")
        if not isinstance(line_items, list):
            line_items = []

        needs_review = parsed.get("needs_review")
        if isinstance(needs_review, str):
            needs_review = needs_review.lower() in {"true", "1", "yes"}
        needs_review = bool(needs_review) or confidence < 0.65

        reason = parsed.get("reason")
        if reason is not None:
            reason = str(reason)[:255]

        return {
            "amount": amount,
            "currency": currency,
            "merchant": merchant,
            "category": category,
            "transaction_at": transaction_at,
            "confidence": confidence,
            "needs_review": needs_review,
            "reason": reason,
            "line_items": line_items,
        }

    # =========================================================================
    # VOICE PARSING
    # =========================================================================
    
    @opik.track(name="parse_voice_input", tags=["voice", "input", "parsing"])
    async def parse_voice_input(
        self,
        transcript: str,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Parse voice transcript to structured transaction."""
        from opik import opik_context
        
        # Log input metadata
        opik_context.update_current_span(metadata={
            "transcript_length": len(transcript),
            "transcript_preview": transcript[:100],
            "model": self.model,
            "has_user_context": user_context is not None
        })
        
        prompt = build_voice_parsing_prompt(transcript, user_context)
        response = await self._complete(prompt, temperature=0.5)
        
        try:
            result = json.loads(response)
            amount_raw = result.get("amount", 0)
            try:
                amount = float(amount_raw)
            except (TypeError, ValueError):
                amount = 0.0
            if amount < 0:
                amount = 0.0

            category_raw = result.get("category")
            category = str(category_raw).strip().lower() if category_raw is not None else "other"
            if not category:
                category = "other"
            if category not in CATEGORIES:
                category = "other"

            confidence_raw = result.get("confidence", 0.5)
            try:
                confidence = float(confidence_raw)
            except (TypeError, ValueError):
                confidence = 0.5
            confidence = max(0.0, min(1.0, confidence))

            merchant = result.get("merchant")
            if merchant is not None:
                merchant = str(merchant).strip()[:255] or None

            needs_clarification = result.get("needs_clarification", False)
            if isinstance(needs_clarification, str):
                needs_clarification = needs_clarification.lower() in {"true", "1", "yes"}
            else:
                needs_clarification = bool(needs_clarification)

            clarification_question = result.get("clarification_question")
            if clarification_question is not None:
                clarification_question = str(clarification_question).strip()[:255] or None

            output = {
                "amount": amount,
                "merchant": merchant,
                "category": category,
                "confidence": confidence,
                "needs_clarification": needs_clarification,
                "clarification_question": clarification_question,
            }
        except json.JSONDecodeError:
            output = {
                "amount": 0.0,
                "merchant": None,
                "category": "other",
                "confidence": 0.0,
                "needs_clarification": True,
                "clarification_question": "Could not parse voice input. Please try again."
            }
        
        # Log output metadata
        opik_context.update_current_span(metadata={
            "parsed_amount": output["amount"],
            "parsed_category": output["category"],
            "confidence": output["confidence"],
            "needs_clarification": output["needs_clarification"]
        })
        return output

    @opik.track(name="transcribe_audio", tags=["voice", "whisper", "transcription"])
    async def transcribe_audio(self, file_path: str) -> str:
        """Transcribe audio file using Whisper."""
        from opik import opik_context
        import os
        
        # Log input metadata
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
        opik_context.update_current_span(metadata={
            "file_path": file_path,
            "file_size_bytes": file_size,
            "model": "whisper-1"
        })
        
        try:
            with open(file_path, "rb") as audio_file:
                transcript = await self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text"
                )
            
            # Log output metadata
            opik_context.update_current_span(metadata={
                "transcript_length": len(transcript),
                "success": True
            })
            return transcript
        except Exception as e:
            opik_context.update_current_span(metadata={
                "success": False,
                "error": str(e)
            })
            print(f"Transcription failed: {e}")
            raise e


    # =========================================================================
    # CHAT
    # =========================================================================
    
    @opik.track(name="chat", tags=["chat", "core", "conversation"])
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
        from opik import opik_context
        
        # Log input metadata
        opik_context.update_current_span(metadata={
            "message_length": len(message),
            "message_preview": message[:100],
            "has_transaction_data": transaction_data is not None,
            "conversation_length": len(conversation_history) if conversation_history else 0,
            "model": self.model
        })
        
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
        
        response_text = response.choices[0].message.content
        
        # Log output metadata
        opik_context.update_current_span(metadata={
            "response_length": len(response_text) if response_text else 0,
            "tokens_used": response.usage.total_tokens if response.usage else None
        })
        
        return response_text

    # =========================================================================
    # WEEKLY INSIGHTS
    # =========================================================================
    
    @opik.track(name="generate_weekly_insights", tags=["insights", "weekly", "digest"])
    async def generate_weekly_insights(
        self,
        user_context: Dict[str, Any],
        transactions: List[Dict[str, Any]],
        last_week_total: float = 0
    ) -> Dict[str, Any]:
        """Generate weekly spending insights."""
        from opik import opik_context
        
        this_week_total = sum(t.get('amount', 0) for t in transactions)
        
        # Log input metadata
        opik_context.update_current_span(metadata={
            "transaction_count": len(transactions),
            "this_week_total": this_week_total,
            "last_week_total": last_week_total,
            "model": self.model
        })
        
        prompt = build_weekly_insights_prompt(
            user_context, 
            transactions, 
            last_week_total
        )
        response = await self._complete(prompt, temperature=0.7)
        
        try:
            result = json.loads(response)
        except json.JSONDecodeError:
            result = {
                "headline": "Your week in review",
                "summary": "Unable to generate summary.",
                "tip": "Keep tracking your expenses!"
            }
        
        # Log output metadata
        opik_context.update_current_span(metadata={
            "headline": result.get("headline", "")[:50],
            "has_tip": "tip" in result
        })
        return result

    # =========================================================================
    # MEMORY EXTRACTION
    # =========================================================================
    
    @opik.track(name="extract_memory", tags=["memory", "chat", "extraction"])
    async def extract_memory(self, message: str) -> Dict[str, Any]:
        """Extract facts to remember from user message."""
        from opik import opik_context
        
        # Log input metadata
        opik_context.update_current_span(metadata={
            "message_length": len(message),
            "message_preview": message[:100],
            "model": self.model
        })
        
        prompt = build_memory_extraction_prompt(message)
        response = await self._complete(prompt, temperature=0.3)
        
        try:
            result = json.loads(response)
        except json.JSONDecodeError:
            result = {"has_fact": False, "fact": None, "category": None}
        
        # Log output metadata
        opik_context.update_current_span(metadata={
            "has_fact": result.get("has_fact", False),
            "fact_category": result.get("category")
        })
        return result


# Singleton instance
llm_client = LLMClient()
