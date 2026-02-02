"""
Fiscally AI Agents
==================
Orchestrates AI workflows for transaction processing, chat, insights, and alerts.
Instrumented with Opik for observability.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
from dataclasses import dataclass
import uuid
import opik

from .llm_client import llm_client
from .context_manager import ContextManager, UserInsight


@dataclass
class ProcessedTransaction:
    """Result of transaction processing."""
    transaction_id: str
    amount: float
    merchant: Optional[str]
    category: str
    category_confidence: float
    is_anomaly: bool
    anomaly_severity: Optional[str]
    anomaly_reason: Optional[str]
    notification_needed: bool
    notification_type: Optional[str]  # "new_transaction", "anomaly", "budget_warning"


@dataclass
class ChatResponse:
    """Result of chat processing."""
    response: str
    memory_updated: bool
    new_fact: Optional[str]


class TransactionAgent:
    """
    Processes new transactions.
    
    Flow:
    1. Categorize transaction (with search fallback if needed)
    2. Detect anomalies
    3. Check budget impact
    4. Update patterns if significant
    5. Generate notification if warranted
    """
    
    def __init__(self, context_manager: ContextManager):
        self.context = context_manager
        self.llm = llm_client
    
    @opik.track(name="transaction_agent_process")
    async def process(
        self, 
        user_id: str, 
        transaction: Dict[str, Any]
    ) -> ProcessedTransaction:
        """
        Process a new transaction through the full pipeline.
        
        Args:
            user_id: User identifier
            transaction: Dict with amount, merchant, timestamp, etc.
        """
        # Log transaction input to Opik via span metadata
        from opik import opik_context
        opik_context.update_current_span(metadata={
            "user_id": user_id,
            "amount": transaction.get("amount"),
            "merchant": transaction.get("merchant")
        })
        # Load user context for categorization
        user_context = await self.context.load_full_context(user_id)
        
        # Step 1: Categorize (includes search fallback for unknown merchants)
        categorization = await self.llm.categorize_transaction(
            transaction, 
            user_context
        )
        
        category = categorization["category"]
        confidence = categorization["confidence"]
        
        # Add category to transaction for anomaly detection
        transaction["category"] = category
        
        # Step 2: Detect anomalies
        user_stats = await self.context.load_user_stats(user_id, category)
        anomaly = await self.llm.detect_anomaly(transaction, user_stats)
        
        # Step 3: Check budget impact
        budget_warning = await self._check_budget_impact(
            user_id, 
            category, 
            transaction["amount"],
            user_context
        )
        
        # Step 4: Determine if notification needed
        notification_needed, notification_type = self._should_notify(
            anomaly, 
            budget_warning, 
            confidence
        )
        
        return ProcessedTransaction(
            transaction_id=transaction.get("id", str(uuid.uuid4())),
            amount=transaction["amount"],
            merchant=transaction.get("merchant"),
            category=category,
            category_confidence=confidence,
            is_anomaly=anomaly["is_anomaly"],
            anomaly_severity=anomaly.get("severity"),
            anomaly_reason=anomaly.get("reason"),
            notification_needed=notification_needed,
            notification_type=notification_type
        )
    
    async def _check_budget_impact(
        self,
        user_id: str,
        category: str,
        amount: float,
        user_context: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Check if transaction impacts budget significantly."""
        # Get current category spending
        current_total = await self.context.get_category_total(
            user_id, 
            category, 
            "month"
        )
        
        # Get budget from context
        profile = user_context.get("profile", {})
        category_budgets = profile.get("category_budgets", {})
        budget = category_budgets.get(category)
        
        if not budget:
            return None
        
        new_total = current_total + amount
        percentage = (new_total / budget) * 100
        
        if percentage >= 90:
            return {
                "category": category,
                "spent": new_total,
                "budget": budget,
                "percentage": percentage,
                "over_budget": percentage > 100
            }
        
        return None
    
    def _should_notify(
        self,
        anomaly: Dict[str, Any],
        budget_warning: Optional[Dict[str, Any]],
        confidence: float
    ) -> tuple[bool, Optional[str]]:
        """Determine if user should be notified."""
        # Always notify for high-severity anomalies
        if anomaly["is_anomaly"] and anomaly.get("severity") in ["medium", "high"]:
            return True, "anomaly"
        
        # Notify for budget warnings
        if budget_warning and budget_warning.get("percentage", 0) >= 90:
            return True, "budget_warning"
        
        # Notify for low-confidence categorization (user should verify)
        if confidence < 0.7:
            return True, "verify_category"
        
        # Default: notify for new transaction (actionable notification)
        return True, "new_transaction"


class ChatAgent:
    """
    Handles conversational queries about finances.
    
    Flow:
    1. Load user context
    2. Query relevant transaction data from DB
    3. Generate response with LLM
    4. Extract and store any new facts/memories
    """
    
    def __init__(self, context_manager: ContextManager):
        self.context = context_manager
        self.llm = llm_client
    
    @opik.track(name="chat_agent_handle")
    async def handle(
        self,
        user_id: str,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> ChatResponse:
        """
        Handle a chat message.
        
        Args:
            user_id: User identifier
            message: User's message
            conversation_history: Previous messages for context
        """
        # Load full user context
        user_context = await self.context.load_full_context(user_id)
        
        # Query relevant transaction data based on message
        transaction_data = await self._get_relevant_data(user_id, message)
        
        # Generate response
        response = await self.llm.chat(
            message=message,
            user_context=user_context,
            transaction_data=transaction_data,
            conversation_history=conversation_history
        )
        
        # Check if user shared a fact to remember
        memory_result = await self.llm.extract_memory(message)
        memory_updated = False
        new_fact = None
        
        if memory_result.get("has_fact"):
            new_fact = memory_result.get("fact")
            category = memory_result.get("category", "general")
            await self.context.add_memory_fact(user_id, new_fact, category)
            memory_updated = True
        
        return ChatResponse(
            response=response,
            memory_updated=memory_updated,
            new_fact=new_fact
        )
    
    async def _get_relevant_data(
        self, 
        user_id: str, 
        message: str
    ) -> Optional[str]:
        """
        Query DB for data relevant to user's question.
        This is the "search" for chat - querying their own data, not the web.
        """
        message_lower = message.lower()
        
        # Detect what data to fetch based on keywords
        if any(word in message_lower for word in ["spent", "spend", "spending", "how much"]):
            # Get spending summary
            summary = await self.context.get_spending_summary(user_id, "month")
            return self.context.format_summary_for_llm(summary)
        
        if any(word in message_lower for word in ["transaction", "recent", "last", "history"]):
            # Get recent transactions
            transactions = await self.context.get_transactions(user_id, days=30)
            return self.context.format_transactions_for_llm(transactions)
        
        # Check for specific category mentions
        categories = ["food", "transport", "shopping", "bills", "entertainment", "groceries"]
        for cat in categories:
            if cat in message_lower:
                transactions = await self.context.get_transactions(
                    user_id, 
                    days=30, 
                    category=cat
                )
                return self.context.format_transactions_for_llm(transactions)
        
        # Check for merchant mentions
        if any(word in message_lower for word in ["swiggy", "zomato", "amazon", "uber", "ola"]):
            # Extract merchant name (simple approach)
            for merchant in ["swiggy", "zomato", "amazon", "uber", "ola", "flipkart"]:
                if merchant in message_lower:
                    transactions = await self.context.get_transactions(
                        user_id, 
                        days=30, 
                        merchant=merchant
                    )
                    return self.context.format_transactions_for_llm(transactions)
        
        # Default: get recent summary
        summary = await self.context.get_spending_summary(user_id, "month")
        return self.context.format_summary_for_llm(summary)


class InsightAgent:
    """
    Generates spending insights (weekly digest, pattern detection).
    
    Triggered by:
    - Weekly cron job (Sunday 9am)
    - On-demand via API
    """
    
    def __init__(self, context_manager: ContextManager):
        self.context = context_manager
        self.llm = llm_client
    
    @opik.track(name="insight_agent_weekly_digest")
    async def generate_weekly_digest(
        self, 
        user_id: str
    ) -> Dict[str, Any]:
        """Generate weekly spending insights."""
        # Load context
        user_context = await self.context.load_full_context(user_id)
        
        # Get this week's transactions
        transactions = await self.context.get_transactions(user_id, days=7)
        
        # Get last week's total for comparison
        # TODO: Implement proper date range query
        last_week_total = 0  # Placeholder
        
        # Generate insights
        insights = await self.llm.generate_weekly_insights(
            user_context,
            transactions,
            last_week_total
        )
        
        # Store insight
        insight = UserInsight(
            id=str(uuid.uuid4()),
            type="weekly_digest",
            message=insights.get("headline", ""),
            confidence=0.9,
            actionable=True
        )
        await self.context.add_insight(user_id, insight)
        
        return insights


class AlertAgent:
    """
    Checks for proactive alerts.
    
    Triggered after each transaction to check for:
    - Unusual spending
    - Budget breaches
    - Goal milestones
    - Pattern violations
    """
    
    def __init__(self, context_manager: ContextManager):
        self.context = context_manager
    
    @opik.track(name="alert_agent_check")
    async def check_alerts(
        self,
        user_id: str,
        transaction: ProcessedTransaction
    ) -> List[Dict[str, Any]]:
        """Check if transaction warrants any alerts."""
        alerts = []
        
        user_context = await self.context.load_full_context(user_id)
        
        # Check 1: Anomaly alert
        if transaction.is_anomaly:
            alerts.append({
                "type": "anomaly",
                "severity": transaction.anomaly_severity,
                "message": f"₹{transaction.amount:,} at {transaction.merchant or 'Unknown'} — {transaction.anomaly_reason}"
            })
        
        # Check 2: Budget warning
        category_total = await self.context.get_category_total(
            user_id,
            transaction.category,
            "month"
        )
        
        profile = user_context.get("profile", {})
        budgets = profile.get("category_budgets", {})
        budget = budgets.get(transaction.category)
        
        if budget:
            percentage = (category_total / budget) * 100
            if percentage >= 90 and percentage < 100:
                alerts.append({
                    "type": "budget_warning",
                    "category": transaction.category,
                    "message": f"You've used {percentage:.0f}% of your {transaction.category} budget"
                })
            elif percentage >= 100:
                alerts.append({
                    "type": "budget_exceeded",
                    "category": transaction.category,
                    "message": f"You've exceeded your {transaction.category} budget by ₹{category_total - budget:,.0f}"
                })
        
        # Check 3: Goal milestone
        goals = user_context.get("goals", [])
        for goal in goals:
            # This is simplified - real implementation would track savings
            pass
        
        # Check 4: Pattern violation (e.g., late night ordering when trying to stop)
        patterns = user_context.get("patterns", {})
        memory = user_context.get("memory", {})
        
        # Check if user mentioned trying to reduce something
        for fact in memory.get("facts", []):
            fact_text = fact.get("text", "").lower()
            if "reduce" in fact_text or "stop" in fact_text or "less" in fact_text:
                # Check if this transaction relates to what they're trying to reduce
                if transaction.category in fact_text or (transaction.merchant and transaction.merchant.lower() in fact_text):
                    alerts.append({
                        "type": "pattern_reminder",
                        "message": f"Heads up: You mentioned wanting to reduce {transaction.category} spending"
                    })
                    break
        
        return alerts


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

async def process_transaction(
    user_id: str,
    transaction: Dict[str, Any],
    context_manager: ContextManager
) -> ProcessedTransaction:
    """Convenience function to process a transaction."""
    agent = TransactionAgent(context_manager)
    return await agent.process(user_id, transaction)


async def handle_chat(
    user_id: str,
    message: str,
    context_manager: ContextManager,
    history: Optional[List[Dict[str, str]]] = None
) -> ChatResponse:
    """Convenience function to handle chat."""
    agent = ChatAgent(context_manager)
    return await agent.handle(user_id, message, history)


async def generate_weekly_insights(
    user_id: str,
    context_manager: ContextManager
) -> Dict[str, Any]:
    """Convenience function to generate weekly insights."""
    agent = InsightAgent(context_manager)
    return await agent.generate_weekly_digest(user_id)
