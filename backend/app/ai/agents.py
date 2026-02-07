"""
Fiscally AI Agents
==================
Orchestrates AI workflows for transaction processing, chat, insights, and alerts.
Instrumented with Opik for observability.
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import uuid
import opik
from datetime import datetime, timedelta

from .llm_client import llm_client
from .context_manager import ContextManager, UserInsight
from .prompts import get_currency_symbol


@dataclass
class ProcessedTransaction:
    """Result of transaction processing."""
    transaction_id: str
    amount: float
    merchant: Optional[str]
    category: str
    category_confidence: float
    spend_class: Optional[str]
    spend_class_confidence: Optional[float]
    spend_class_reason: Optional[str]
    is_anomaly: bool
    anomaly_severity: Optional[str]
    anomaly_reason: Optional[str]
    notification_needed: bool
    notification_type: Optional[str]  # "new_transaction", "anomaly", "budget_warning"
    opik_trace_id: Optional[str] = None


@dataclass
class ChatResponse:
    """Result of chat processing."""
    response: str
    memory_updated: bool
    new_fact: Optional[str]
    trace_id: Optional[str] = None
    reasoning_steps: Optional[List[Dict[str, Any]]] = None  # Chain-of-thought steps


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
    
    @opik.track(name="transaction_agent_process", tags=["agent", "transaction", "pipeline"])
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
            "merchant": transaction.get("merchant"),
            "timestamp": transaction.get("timestamp"),
            "pipeline_step": "start"
        })
        # Load user context for categorization
        user_context = await self.context.load_full_context(user_id)
        
        # Step 1: Categorize (only if user did not provide category)
        if transaction.get("category"):
            category = str(transaction["category"])
            confidence = 1.0
        else:
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
        anomaly = await self.llm.detect_anomaly(transaction, user_stats, user_context=user_context)

        # Step 3: Classify spending style (need/want/luxury)
        spend_class = None
        spend_class_confidence = None
        spend_class_reason = None
        try:
            spend_classification = await self.llm.classify_spending_class(transaction, user_context)
            spend_class = spend_classification.get("spend_class")
            spend_class_confidence = spend_classification.get("confidence")
            spend_class_reason = spend_classification.get("reason")
        except Exception as exc:
            print(f"Spending class classification failed: {exc}")
        
        # Step 4: Check budget impact
        budget_warning = await self._check_budget_impact(
            user_id, 
            category, 
            transaction["amount"],
            user_context
        )
        
        # Step 5: Determine if notification needed
        notification_needed, notification_type = self._should_notify(
            anomaly, 
            budget_warning, 
            confidence
        )

        from .feedback import get_current_trace_id
        trace_id = get_current_trace_id()
        
        result = ProcessedTransaction(
            transaction_id=transaction.get("id", str(uuid.uuid4())),
            amount=transaction["amount"],
            merchant=transaction.get("merchant"),
            category=category,
            category_confidence=confidence,
            spend_class=spend_class,
            spend_class_confidence=spend_class_confidence,
            spend_class_reason=spend_class_reason,
            is_anomaly=anomaly["is_anomaly"],
            anomaly_severity=anomaly.get("severity"),
            anomaly_reason=anomaly.get("reason"),
            notification_needed=notification_needed,
            notification_type=notification_type,
            opik_trace_id=trace_id,
        )
        
        # Log final output metadata
        opik_context.update_current_span(metadata={
            "pipeline_step": "complete",
            "final_category": category,
            "category_confidence": confidence,
            "spend_class": spend_class,
            "spend_class_confidence": spend_class_confidence,
            "is_anomaly": anomaly["is_anomaly"],
            "notification_type": notification_type,
            "trace_id": trace_id,
        })
        
        return result
    
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
        """Determine if user should be notified (critical-only policy)."""
        # Always notify for high-severity anomalies
        if anomaly["is_anomaly"] and anomaly.get("severity") in ["medium", "high"]:
            return True, "anomaly"
        
        # Notify for budget warnings
        if budget_warning and budget_warning.get("percentage", 0) >= 90:
            return True, "budget_warning"

        # Low-confidence categorization should be surfaced in UI, not pushed as a notification.
        if confidence < 0.7:
            return False, "verify_category"

        return False, None


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
    
    @opik.track(name="chat_agent_handle", tags=["agent", "chat", "conversation"])
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
        from opik import opik_context
        
        # Initialize reasoning steps list to track chain-of-thought
        reasoning_steps = []
        
        # Log input metadata
        opik_context.update_current_span(metadata={
            "user_id": user_id,
            "message_length": len(message),
            "has_history": conversation_history is not None,
            "history_length": len(conversation_history) if conversation_history else 0
        })
        
        # Step 1: Load full user context
        reasoning_steps.append({
            "step_type": "analyzing",
            "content": "Loading your financial profile and preferences"
        })
        user_context = await self.context.load_full_context(user_id)
        
        # Add context insights to reasoning
        profile = user_context.get("profile", {})
        goals = user_context.get("goals", [])
        patterns = user_context.get("patterns", {})
        
        if goals:
            goal_names = [g.get("name", g.get("label", "goal")) for g in goals[:3]]
            reasoning_steps.append({
                "step_type": "context",
                "content": f"Found {len(goals)} active goals: {', '.join(goal_names)}"
            })
        
        if patterns:
            reasoning_steps.append({
                "step_type": "pattern",
                "content": "Detected spending patterns in your transaction history"
            })
        
        # Step 2: Query relevant transaction data based on message
        reasoning_steps.append({
            "step_type": "querying",
            "content": "Searching your transactions for relevant data"
        })
        currency_code = (
            profile.get("identity", {}).get("currency")
            or profile.get("currency")
            or "INR"
        )

        transaction_data, query_info = await self._get_relevant_data_with_info(
            user_id,
            message,
            currency_code=currency_code,
        )
        
        if query_info:
            reasoning_steps.append({
                "step_type": "data",
                "content": query_info,
                "data": {"has_results": transaction_data is not None}
            })
        
        # Step 3: Generate response
        reasoning_steps.append({
            "step_type": "calculating",
            "content": "Generating personalized insight based on your data"
        })
        response = await self.llm.chat(
            message=message,
            user_context=user_context,
            transaction_data=transaction_data,
            conversation_history=conversation_history
        )
        
        # Step 4: Check if user shared a fact to remember
        memory_result = await self.llm.extract_memory(message)
        memory_updated = False
        new_fact = None
        
        if memory_result.get("has_fact"):
            new_fact = memory_result.get("fact")
            category = memory_result.get("category", "general")
            await self.context.add_memory_fact(user_id, new_fact, category)
            memory_updated = True
            reasoning_steps.append({
                "step_type": "memory",
                "content": f"Remembered: {new_fact}"
            })
        
        # Final insight step
        reasoning_steps.append({
            "step_type": "insight",
            "content": "Generated response with specific numbers and actionable advice"
        })
        
        from .feedback import get_current_trace_id
        trace_id = get_current_trace_id()

        result = ChatResponse(
            response=response,
            memory_updated=memory_updated,
            new_fact=new_fact,
            trace_id=trace_id,
            reasoning_steps=reasoning_steps
        )
        
        # Log output metadata
        opik_context.update_current_span(metadata={
            "response_length": len(response) if response else 0,
            "memory_updated": memory_updated,
            "has_new_fact": new_fact is not None,
            "reasoning_step_count": len(reasoning_steps),
            "trace_id": trace_id,
        })
        
        return result
    
    async def _get_relevant_data_with_info(
        self,
        user_id: str,
        message: str,
        currency_code: str = "INR",
    ) -> tuple[Optional[str], Optional[str]]:
        """
        Query DB for data relevant to user's question.
        Returns (data, human-readable description of what was queried).
        """
        message_lower = message.lower()
        
        symbol = get_currency_symbol(currency_code)

        # Detect what data to fetch based on keywords
        if any(word in message_lower for word in ["spent", "spend", "spending", "how much"]):
            summary = await self.context.get_spending_summary(user_id, "month")
            total = sum(summary.get("by_category", {}).values()) if summary else 0
            txn_count = summary.get("transaction_count", 0) if summary else 0
            return (
                self.context.format_summary_for_llm(summary, currency_code=currency_code),
                f"Analyzed {txn_count} transactions totaling {symbol}{total:,.0f}"
            )
        
        if any(word in message_lower for word in ["transaction", "recent", "last", "history"]):
            transactions = await self.context.get_transactions(user_id, days=30)
            return (
                self.context.format_transactions_for_llm(transactions, currency_code=currency_code),
                f"Retrieved {len(transactions)} recent transactions"
            )
        
        # Check for specific category mentions
        categories = ["food", "transport", "shopping", "bills", "entertainment", "groceries"]
        for cat in categories:
            if cat in message_lower:
                transactions = await self.context.get_transactions(
                    user_id, 
                    days=30, 
                    category=cat
                )
                total = sum(t.get("amount", 0) for t in transactions)
                return (
                    self.context.format_transactions_for_llm(transactions, currency_code=currency_code),
                    f"Found {len(transactions)} {cat} transactions ({symbol}{total:,.0f} total)"
                )
        
        # Check for merchant mentions
        merchants = ["swiggy", "zomato", "amazon", "uber", "ola", "flipkart"]
        for merchant in merchants:
            if merchant in message_lower:
                transactions = await self.context.get_transactions(
                    user_id, 
                    days=30, 
                    merchant=merchant
                )
                total = sum(t.get("amount", 0) for t in transactions)
                return (
                    self.context.format_transactions_for_llm(transactions, currency_code=currency_code),
                    f"Found {len(transactions)} {merchant.title()} orders ({symbol}{total:,.0f})"
                )
        
        # Default: get recent summary
        summary = await self.context.get_spending_summary(user_id, "month")
        txn_count = summary.get("transaction_count", 0) if summary else 0
        return (
            self.context.format_summary_for_llm(summary, currency_code=currency_code),
            f"Loaded your monthly spending summary ({txn_count} transactions)"
        )
    
    async def _get_relevant_data(
        self,
        user_id: str,
        message: str,
        currency_code: str = "INR",
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
            return self.context.format_summary_for_llm(summary, currency_code=currency_code)
        
        if any(word in message_lower for word in ["transaction", "recent", "last", "history"]):
            # Get recent transactions
            transactions = await self.context.get_transactions(user_id, days=30)
            return self.context.format_transactions_for_llm(transactions, currency_code=currency_code)
        
        # Check for specific category mentions
        categories = ["food", "transport", "shopping", "bills", "entertainment", "groceries"]
        for cat in categories:
            if cat in message_lower:
                    transactions = await self.context.get_transactions(
                        user_id, 
                        days=30, 
                        category=cat
                    )
                    return self.context.format_transactions_for_llm(transactions, currency_code=currency_code)
        
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
                    return self.context.format_transactions_for_llm(transactions, currency_code=currency_code)
        
        # Default: get recent summary
        summary = await self.context.get_spending_summary(user_id, "month")
        return self.context.format_summary_for_llm(summary, currency_code=currency_code)


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
    
    @opik.track(name="insight_agent_weekly_digest", tags=["agent", "insights", "weekly"])
    async def generate_weekly_digest(
        self, 
        user_id: str
    ) -> Dict[str, Any]:
        """Generate weekly spending insights."""
        from opik import opik_context
        
        # Log input metadata
        opik_context.update_current_span(metadata={
            "user_id": user_id,
            "digest_type": "weekly"
        })
        
        # Load context
        user_context = await self.context.load_full_context(user_id)
        
        # Get this week's transactions
        transactions = await self.context.get_transactions(user_id, days=7)
        
        # Get last week's total for comparison
        now = datetime.utcnow()
        start_this_week = now - timedelta(days=7)
        start_last_week = now - timedelta(days=14)
        last_week_total = await self.context.get_spending_total_between(
            user_id,
            start_last_week,
            start_this_week,
        )
        
        this_week_total = sum(t.get('amount', 0) for t in transactions)
        
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
        
        # Log output metadata
        opik_context.update_current_span(metadata={
            "transaction_count": len(transactions),
            "this_week_total": this_week_total,
            "headline": insights.get("headline", "")[:50]
        })
        
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
    
    @opik.track(name="alert_agent_check", tags=["agent", "alerts", "monitoring"])
    async def check_alerts(
        self,
        user_id: str,
        transaction: ProcessedTransaction
    ) -> List[Dict[str, Any]]:
        """Check if transaction warrants any alerts."""
        from opik import opik_context
        
        # Log input metadata
        opik_context.update_current_span(metadata={
            "user_id": user_id,
            "transaction_amount": transaction.amount,
            "transaction_category": transaction.category,
            "is_anomaly": transaction.is_anomaly
        })
        
        alerts = []
        
        user_context = await self.context.load_full_context(user_id)
        profile = user_context.get("profile", {}) if user_context else {}
        currency_code = (
            profile.get("identity", {}).get("currency")
            or profile.get("currency")
            or "INR"
        )
        symbol = get_currency_symbol(currency_code)
        
        # Check 1: Anomaly alert
        if transaction.is_anomaly:
            alerts.append({
                "type": "anomaly",
                "severity": transaction.anomaly_severity,
                "message": f"{symbol}{transaction.amount:,} at {transaction.merchant or 'Unknown'} — {transaction.anomaly_reason}"
            })
        
        # Check 2: Budget warning
        category_total = await self.context.get_category_total(
            user_id,
            transaction.category,
            "month"
        )
        
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
                    "message": f"You've exceeded your {transaction.category} budget by {symbol}{category_total - budget:,.0f}"
                })
        
        # Check 3: Goal milestone
        try:
            goal_progress_data = await self.context.calculate_goal_progress(user_id)
            goals = goal_progress_data.get("goals", [])
            milestone_alerts: List[Dict[str, Any]] = []
            for goal in goals:
                label = goal.get("label") or "goal"
                progress = float(goal.get("progress_percentage") or 0)
                if progress >= 100:
                    milestone_alerts.append({
                        "type": "goal_completed",
                        "goal": label,
                        "message": f"Milestone reached: {label} is fully funded.",
                    })
                    continue
                if progress >= 75:
                    milestone_alerts.append({
                        "type": "goal_milestone",
                        "goal": label,
                        "message": f"You're {progress:.0f}% of the way to {label}.",
                    })
                    continue
                if not goal.get("on_track", True) and goal.get("target_date"):
                    milestone_alerts.append({
                        "type": "goal_at_risk",
                        "goal": label,
                        "message": f"{label} is at risk for {goal.get('target_date')}. Consider increasing monthly savings.",
                    })
            if milestone_alerts:
                alerts.append(milestone_alerts[0])
        except Exception as exc:
            print(f"Goal milestone alert check failed: {exc}")
        
        # Check 4: Pattern violation (e.g., late night ordering when trying to stop)
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
        
        # Log output metadata
        opik_context.update_current_span(metadata={
            "alert_count": len(alerts),
            "alert_types": [a["type"] for a in alerts]
        })
        
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
