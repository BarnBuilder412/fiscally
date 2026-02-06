"""
Fiscally Context Manager
========================
Manages user context (profile, patterns, insights, goals, memory).
This is the interface between AI agents and the database.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from decimal import Decimal
import json
import uuid as uuid_module

from sqlalchemy import desc, func
from sqlalchemy.orm import Session


@dataclass
class UserProfile:
    """User identity and preferences."""
    user_id: str
    name: str = ""
    currency: str = "INR"
    income_range: Optional[str] = None
    payday: int = 1  # Day of month
    monthly_budget: Optional[float] = None
    notification_style: str = "actionable"
    voice_enabled: bool = True
    created_at: Optional[datetime] = None


@dataclass
class SpendingPatterns:
    """AI-learned spending behavior."""
    high_spend_days: List[str] = field(default_factory=list)  # ["friday", "saturday"]
    high_spend_hours: List[int] = field(default_factory=list)  # [18, 19, 20, 21, 22]
    category_distribution: Dict[str, float] = field(default_factory=dict)
    triggers: List[str] = field(default_factory=list)  # ["late_night", "weekend"]
    behavioral_flags: Dict[str, bool] = field(default_factory=dict)
    anomaly_thresholds: Dict[str, float] = field(default_factory=lambda: {
        "unusual_amount": 5000,
        "unusual_category_spike": 2.0
    })


@dataclass  
class UserGoal:
    """Financial goal."""
    id: str
    name: str
    target_amount: float
    current_amount: float = 0
    deadline: Optional[datetime] = None
    category: Optional[str] = None  # e.g., "savings", "debt_payoff"
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class UserMemory:
    """Facts and conversation context."""
    facts: List[Dict[str, Any]] = field(default_factory=list)
    conversation_summary: str = ""
    last_updated: datetime = field(default_factory=datetime.now)


@dataclass
class UserInsight:
    """AI-generated insight."""
    id: str
    type: str  # "pattern", "prediction", "alert", "tip"
    message: str
    confidence: float
    actionable: bool = False
    created_at: datetime = field(default_factory=datetime.now)
    delivered: bool = False
    dismissed: bool = False


class ContextManager:
    """
    Manages loading and updating user context.
    
    This class connects to the database layer via SQLAlchemy session.
    """
    
    def __init__(self, db_session: Optional[Session] = None):
        """
        Initialize with database session.
        
        Args:
            db_session: SQLAlchemy session (injected by FastAPI)
        """
        self.db = db_session
    
    def _get_user(self, user_id: str):
        """Get user from DB by ID."""
        from app.models.user import User
        return self.db.query(User).filter(User.id == user_id).first()
    
    # =========================================================================
    # LOAD CONTEXT (from DB)
    # =========================================================================
    
    async def load_full_context(self, user_id: str) -> Dict[str, Any]:
        """
        Load complete user context for AI operations.
        
        Returns dict with: profile, patterns, goals, memory, insights
        """
        profile = await self.load_profile(user_id)
        patterns = await self.load_patterns(user_id)
        goals = await self.load_goals(user_id)
        memory = await self.load_memory(user_id)
        insights = await self.load_active_insights(user_id)
        
        return {
            "profile": profile,
            "patterns": patterns,
            "goals": goals,
            "memory": memory,
            "insights": insights
        }
    
    async def load_profile(self, user_id: str) -> Dict[str, Any]:
        """Load user profile from JSONB."""
        user = self._get_user(user_id)
        if user:
            return user.profile or {}
        return {}
    
    async def load_patterns(self, user_id: str) -> Dict[str, Any]:
        """Load spending patterns from JSONB."""
        user = self._get_user(user_id)
        if user:
            return user.patterns or {}
        return {}
    
    async def load_goals(self, user_id: str) -> List[Dict[str, Any]]:
        """Load active goals from JSONB with calculated monthly savings."""
        from datetime import datetime
        
        user = self._get_user(user_id)
        if not user or not user.goals:
            return []
        
        active_goals = user.goals.get("active_goals", [])
        enriched_goals = []
        
        for goal in active_goals:
            enriched = goal.copy()
            
            # Calculate monthly savings needed if target amount and date exist
            target_amount = goal.get("target_amount")
            target_date = goal.get("target_date")
            
            if target_amount and target_date:
                try:
                    target = datetime.strptime(target_date, "%Y-%m-%d")
                    months_remaining = max(1, (target.year - datetime.now().year) * 12 + 
                                          (target.month - datetime.now().month))
                    amount = float(str(target_amount).replace(",", ""))
                    enriched["monthly_savings_needed"] = round(amount / months_remaining)
                    enriched["months_remaining"] = months_remaining
                except (ValueError, TypeError):
                    pass
            
            enriched_goals.append(enriched)
        
        return enriched_goals
    
    async def load_memory(self, user_id: str) -> Dict[str, Any]:
        """Load user memory (facts, conversation summary)."""
        user = self._get_user(user_id)
        if user and user.memory:
            return {
                "facts": user.memory.get("facts", []),
                "conversation_summary": user.memory.get("conversation_summary", "")
            }
        return {"facts": [], "conversation_summary": ""}
    
    async def load_active_insights(self, user_id: str) -> List[Dict[str, Any]]:
        """Load active (undelivered/undismissed) insights."""
        user = self._get_user(user_id)
        if user and user.insights:
            active = user.insights.get("active_insights", [])
            # Filter out dismissed ones
            return [i for i in active if not i.get("dismissed", False)]
        return []

    # =========================================================================
    # LOAD USER STATS (for anomaly detection)
    # =========================================================================
    
    async def load_user_stats(
        self, 
        user_id: str, 
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Load user spending statistics for anomaly detection.
        
        Returns:
            Dict with category_avg, category_max, typical_merchants, etc.
        """
        from app.models.user import Transaction
        
        query = self.db.query(Transaction).filter(Transaction.user_id == user_id)
        
        if category:
            query = query.filter(Transaction.category == category)
        
        transactions = query.all()
        
        if not transactions:
            return {
                "category_avg": 0,
                "category_max": 0,
                "typical_merchants": [],
                "category_budget": None
            }
        
        amounts = [float(t.amount) for t in transactions]
        merchants = [t.merchant for t in transactions if t.merchant]
        
        return {
            "category_avg": sum(amounts) / len(amounts) if amounts else 0,
            "category_max": max(amounts) if amounts else 0,
            "typical_merchants": list(set(merchants))[:10],
            "category_budget": None  # TODO: Get from user goals
        }
    
    async def get_category_total(
        self,
        user_id: str,
        category: str,
        period: str = "month"  # "week", "month", "year"
    ) -> float:
        """Get total spending in category for period."""
        from app.models.user import Transaction
        
        # Calculate start date based on period
        now = datetime.utcnow()
        if period == "week":
            start_date = now - timedelta(days=7)
        elif period == "month":
            start_date = now - timedelta(days=30)
        elif period == "year":
            start_date = now - timedelta(days=365)
        else:
            start_date = now - timedelta(days=30)
        
        from sqlalchemy import Numeric
        result = (
            self.db.query(func.sum(func.cast(Transaction.amount, Numeric)))
            .filter(
                Transaction.user_id == user_id,
                Transaction.category == category,
                Transaction.transaction_at >= start_date
            )
            .scalar()
        )
        
        return float(result) if result else 0.0

    # =========================================================================
    # UPDATE CONTEXT (to DB)
    # =========================================================================
    
    async def update_patterns(
        self, 
        user_id: str, 
        patterns: Dict[str, Any]
    ) -> None:
        """Update user spending patterns."""
        user = self._get_user(user_id)
        if user:
            existing = user.patterns or {}
            existing.update(patterns)
            user.patterns = existing
            self.db.commit()
    
    async def add_memory_fact(
        self, 
        user_id: str, 
        fact: str, 
        category: str
    ) -> None:
        """Add a fact to user memory."""
        user = self._get_user(user_id)
        if user:
            memory = user.memory or {"facts": [], "conversation_summary": ""}
            facts = memory.get("facts", [])
            facts.append({
                "text": fact,
                "category": category,
                "added": datetime.utcnow().isoformat()
            })
            memory["facts"] = facts[-50:]  # Keep last 50 facts
            memory["last_updated"] = datetime.utcnow().isoformat()
            user.memory = memory
            self.db.commit()
    
    async def add_insight(
        self, 
        user_id: str, 
        insight: UserInsight
    ) -> None:
        """Store a new insight."""
        user = self._get_user(user_id)
        if user:
            insights = user.insights or {"active_insights": [], "delivered_insights": [], "dismissed_insights": []}
            active = insights.get("active_insights", [])
            active.append({
                "id": insight.id,
                "type": insight.type,
                "message": insight.message,
                "confidence": insight.confidence,
                "actionable": insight.actionable,
                "created_at": insight.created_at.isoformat() if isinstance(insight.created_at, datetime) else insight.created_at,
                "delivered": insight.delivered,
                "dismissed": insight.dismissed
            })
            insights["active_insights"] = active
            user.insights = insights
            self.db.commit()
    
    async def mark_insight_delivered(
        self, 
        user_id: str, 
        insight_id: str
    ) -> None:
        """Mark insight as delivered."""
        user = self._get_user(user_id)
        if user and user.insights:
            active = user.insights.get("active_insights", [])
            for insight in active:
                if insight.get("id") == insight_id:
                    insight["delivered"] = True
                    break
            user.insights["active_insights"] = active
            self.db.commit()
    
    async def dismiss_insight(
        self, 
        user_id: str, 
        insight_id: str
    ) -> None:
        """Mark insight as dismissed."""
        user = self._get_user(user_id)
        if user and user.insights:
            active = user.insights.get("active_insights", [])
            dismissed = user.insights.get("dismissed_insights", [])
            
            for i, insight in enumerate(active):
                if insight.get("id") == insight_id:
                    insight["dismissed"] = True
                    dismissed.append(active.pop(i))
                    break
            
            user.insights["active_insights"] = active
            user.insights["dismissed_insights"] = dismissed
            self.db.commit()
    
    async def update_goal_progress(
        self, 
        user_id: str, 
        goal_id: str, 
        current_amount: float
    ) -> None:
        """Update goal progress."""
        user = self._get_user(user_id)
        if user and user.goals:
            active = user.goals.get("active_goals", [])
            for goal in active:
                if goal.get("id") == goal_id:
                    goal["current_amount"] = current_amount
                    break
            user.goals["active_goals"] = active
            self.db.commit()
    
    async def save_goals(self, user_id: str, goals: List[Dict[str, Any]]) -> None:
        """Save/replace all active goals from mobile sync."""
        user = self._get_user(user_id)
        if user:
            if not user.goals:
                user.goals = {}
            user.goals["active_goals"] = goals
            self.db.commit()

    # =========================================================================
    # TRANSACTION QUERIES (for chat)
    # =========================================================================
    
    async def get_transactions(
        self,
        user_id: str,
        days: int = 30,
        category: Optional[str] = None,
        merchant: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get user transactions with filters.
        Used to provide context for chat queries.
        """
        from app.models.user import Transaction
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        query = (
            self.db.query(Transaction)
            .filter(
                Transaction.user_id == user_id,
                Transaction.transaction_at >= start_date
            )
        )
        
        if category:
            query = query.filter(Transaction.category == category)
        
        if merchant:
            query = query.filter(Transaction.merchant.ilike(f"%{merchant}%"))
        
        transactions = (
            query
            .order_by(desc(Transaction.transaction_at))
            .limit(limit)
            .all()
        )
        
        return [
            {
                "id": str(t.id),
                "amount": float(t.amount),
                "merchant": t.merchant,
                "category": t.category,
                "note": t.note,
                "source": t.source,
                "timestamp": t.transaction_at.isoformat() if t.transaction_at else None,
                "is_anomaly": t.is_anomaly
            }
            for t in transactions
        ]
    
    async def get_spending_summary(
        self,
        user_id: str,
        period: str = "month"
    ) -> Dict[str, Any]:
        """
        Get spending summary for period.
        
        Returns:
            {
                "total": float,
                "by_category": {"food": 1000, "transport": 500},
                "transaction_count": int,
                "avg_transaction": float
            }
        """
        from app.models.user import Transaction
        
        # Calculate start date
        now = datetime.utcnow()
        if period == "week":
            start_date = now - timedelta(days=7)
        elif period == "month":
            start_date = now - timedelta(days=30)
        elif period == "year":
            start_date = now - timedelta(days=365)
        else:
            start_date = now - timedelta(days=30)
        
        transactions = (
            self.db.query(Transaction)
            .filter(
                Transaction.user_id == user_id,
                Transaction.transaction_at >= start_date
            )
            .all()
        )
        
        if not transactions:
            return {
                "total": 0,
                "by_category": {},
                "transaction_count": 0,
                "avg_transaction": 0
            }
        
        total = sum(float(t.amount) for t in transactions)
        count = len(transactions)
        
        # Group by category
        by_category = {}
        for t in transactions:
            cat = t.category or "other"
            by_category[cat] = by_category.get(cat, 0) + float(t.amount)
        
        return {
            "total": total,
            "by_category": by_category,
            "transaction_count": count,
            "avg_transaction": total / count if count > 0 else 0
        }

    # =========================================================================
    # FORMAT DATA FOR LLM
    # =========================================================================
    
    def format_transactions_for_llm(
        self, 
        transactions: List[Dict[str, Any]]
    ) -> str:
        """Format transactions as string for LLM context."""
        if not transactions:
            return "No transactions found."
        
        lines = []
        for t in transactions[:20]:  # Limit to avoid token overflow
            amount = t.get('amount', 0)
            if isinstance(amount, (int, float)):
                line = f"- ₹{amount:,} at {t.get('merchant', 'Unknown')}"
            else:
                line = f"- ₹{amount} at {t.get('merchant', 'Unknown')}"
            line += f" ({t.get('category', 'other')})"
            if t.get('timestamp'):
                line += f" on {t['timestamp']}"
            lines.append(line)
        
        return "\n".join(lines)
    
    def format_summary_for_llm(
        self, 
        summary: Dict[str, Any]
    ) -> str:
        """Format spending summary as string for LLM context."""
        lines = [
            f"Total spent: ₹{summary.get('total', 0):,}",
            f"Transactions: {summary.get('transaction_count', 0)}",
            f"Average: ₹{summary.get('avg_transaction', 0):,.0f}",
            "",
            "By category:"
        ]
        
        for cat, amount in summary.get('by_category', {}).items():
            lines.append(f"  - {cat}: ₹{amount:,}")
        
        return "\n".join(lines)

    # =========================================================================
    # GOAL PROGRESS TRACKING (Salary + Budget + Goals Integration)
    # =========================================================================
    
    # Salary range ID to approximate monthly salary amount mapping
    SALARY_RANGES = {
        "below_30k": 25000,
        "30k_75k": 52500,
        "75k_150k": 112500,
        "above_150k": 200000,
        "prefer_not": None,
    }
    
    # Budget range ID to approximate budget amount mapping
    BUDGET_RANGES = {
        "below_20k": 15000,
        "20k_40k": 30000,
        "40k_70k": 55000,
        "70k_100k": 85000,
        "above_100k": 120000,
    }
    
    async def load_financial_profile(self, user_id: str) -> Dict[str, Any]:
        """
        Load user's financial profile including salary and budget.
        
        Returns:
            Dict with monthly_salary, monthly_budget, salary_range_id, budget_range_id
        """
        user = self._get_user(user_id)
        if not user or not user.profile:
            return {
                "monthly_salary": None,
                "monthly_budget": None,
                "salary_range_id": None,
                "budget_range_id": None,
            }
        
        profile = user.profile
        financial = profile.get("financial", {})
        
        # Get explicit amounts or derive from range IDs
        salary_range_id = financial.get("salary_range_id")
        budget_range_id = financial.get("budget_range_id")
        
        monthly_salary = financial.get("monthly_salary")
        if monthly_salary is None and salary_range_id:
            monthly_salary = self.SALARY_RANGES.get(salary_range_id)
        
        monthly_budget = financial.get("monthly_budget")
        if monthly_budget is None and budget_range_id:
            monthly_budget = self.BUDGET_RANGES.get(budget_range_id)
        
        return {
            "monthly_salary": monthly_salary,
            "monthly_budget": monthly_budget,
            "salary_range_id": salary_range_id,
            "budget_range_id": budget_range_id,
        }
    
    async def calculate_monthly_savings(self, user_id: str) -> Dict[str, Any]:
        """
        Calculate monthly savings based on salary and actual expenses.
        
        Returns:
            Dict with:
                - monthly_salary: user's monthly income
                - monthly_budget: target spending limit
                - monthly_expenses: actual spending this month
                - monthly_savings: salary - expenses (available for goals)
                - budget_used_percentage: expenses / budget * 100
                - savings_vs_target: comparison with expected savings (salary - budget)
        """
        # Get financial profile
        financial = await self.load_financial_profile(user_id)
        monthly_salary = financial.get("monthly_salary") or 0
        monthly_budget = financial.get("monthly_budget") or 0
        
        # Get current month's spending
        spending = await self.get_spending_summary(user_id, "month")
        monthly_expenses = spending.get("total", 0)
        
        # Calculate savings
        monthly_savings = max(0, monthly_salary - monthly_expenses)
        
        # Calculate budget usage
        budget_used_percentage = 0
        if monthly_budget > 0:
            budget_used_percentage = (monthly_expenses / monthly_budget) * 100
        
        # Expected savings if user stuck to budget
        expected_savings = max(0, monthly_salary - monthly_budget) if monthly_budget > 0 else 0
        
        return {
            "monthly_salary": monthly_salary,
            "monthly_budget": monthly_budget,
            "monthly_expenses": monthly_expenses,
            "monthly_savings": monthly_savings,
            "budget_used_percentage": round(budget_used_percentage, 1),
            "expected_savings": expected_savings,
            "savings_vs_expected": monthly_savings - expected_savings,
            "transaction_count": spending.get("transaction_count", 0),
            "expenses_by_category": spending.get("by_category", {}),
        }
    
    async def calculate_goal_progress(self, user_id: str) -> Dict[str, Any]:
        """
        Calculate real-time progress for all user goals.
        
        Uses:
        - Monthly savings (salary - expenses)
        - Goal priorities to distribute savings
        - Target amounts and dates
        
        Returns:
            Dict with savings info and list of goals with progress details
        """
        # Get savings calculation
        savings_data = await self.calculate_monthly_savings(user_id)
        monthly_savings = savings_data.get("monthly_savings", 0)
        
        # Get user goals
        goals = await self.load_goals(user_id)
        
        if not goals:
            return {
                **savings_data,
                "goals": [],
                "total_goal_target": 0,
                "total_current_saved": 0,
            }
        
        # Sort goals by priority (lower number = higher priority)
        # If no priority set, use order in list
        sorted_goals = sorted(
            goals, 
            key=lambda g: (g.get("priority", 999), goals.index(g))
        )
        
        # Distribute monthly savings across goals by priority
        remaining_savings = monthly_savings
        goal_progress = []
        total_target = 0
        total_saved = 0
        
        for goal in sorted_goals:
            goal_id = goal.get("id", "")
            label = goal.get("label", goal_id)
            
            # Parse target amount
            target_str = goal.get("target_amount", "0")
            try:
                target_amount = float(str(target_str).replace(",", "").replace("₹", ""))
            except (ValueError, TypeError):
                target_amount = 0
            
            total_target += target_amount
            
            # Current saved amount (starts at 0, updated as user tracks)
            current_saved = goal.get("current_saved", 0)
            total_saved += current_saved
            
            # Amount still needed
            amount_needed = max(0, target_amount - current_saved)
            
            # Monthly contribution from available savings
            # Higher priority goals get first claim on savings
            monthly_contribution = min(remaining_savings, amount_needed / 12) if amount_needed > 0 else 0
            remaining_savings = max(0, remaining_savings - monthly_contribution)
            
            # Calculate progress percentage
            progress_percentage = 0
            if target_amount > 0:
                progress_percentage = min(100, (current_saved / target_amount) * 100)
            
            # Calculate projected completion
            projected_completion_date = None
            months_to_complete = None
            on_track = True
            
            if amount_needed > 0 and monthly_contribution > 0:
                months_to_complete = int(amount_needed / monthly_contribution)
                from datetime import datetime
                projected_date = datetime.now()
                projected_date = projected_date.replace(
                    month=(projected_date.month + months_to_complete - 1) % 12 + 1,
                    year=projected_date.year + (projected_date.month + months_to_complete - 1) // 12
                )
                projected_completion_date = projected_date.strftime("%Y-%m-%d")
                
                # Check if on track for deadline
                target_date_str = goal.get("target_date")
                if target_date_str:
                    try:
                        target_date = datetime.strptime(target_date_str, "%Y-%m-%d")
                        on_track = projected_date <= target_date
                    except ValueError:
                        pass
            
            goal_progress.append({
                "id": goal_id,
                "label": label,
                "icon": goal.get("icon"),
                "color": goal.get("color"),
                "priority": goal.get("priority", 999),
                "target_amount": target_amount,
                "target_date": goal.get("target_date"),
                "current_saved": current_saved,
                "amount_needed": amount_needed,
                "monthly_contribution": round(monthly_contribution, 2),
                "progress_percentage": round(progress_percentage, 1),
                "months_to_complete": months_to_complete,
                "projected_completion_date": projected_completion_date,
                "on_track": on_track,
            })
        
        return {
            **savings_data,
            "goals": goal_progress,
            "total_goal_target": total_target,
            "total_current_saved": total_saved,
            "unallocated_savings": round(remaining_savings, 2),
        }
    
    async def update_financial_profile(
        self, 
        user_id: str, 
        salary_range_id: Optional[str] = None,
        monthly_salary: Optional[int] = None,
        budget_range_id: Optional[str] = None,
        monthly_budget: Optional[int] = None,
    ) -> None:
        """Update user's financial profile (salary, budget)."""
        user = self._get_user(user_id)
        if user:
            profile = user.profile or {}
            financial = profile.get("financial", {})
            
            if salary_range_id is not None:
                financial["salary_range_id"] = salary_range_id
            if monthly_salary is not None:
                financial["monthly_salary"] = monthly_salary
            if budget_range_id is not None:
                financial["budget_range_id"] = budget_range_id
            if monthly_budget is not None:
                financial["monthly_budget"] = monthly_budget
            
            profile["financial"] = financial
            user.profile = profile
            self.db.commit()
    
    async def update_goal_saved_amount(
        self, 
        user_id: str, 
        goal_id: str, 
        amount_to_add: float
    ) -> None:
        """Add to a goal's current saved amount."""
        user = self._get_user(user_id)
        if user and user.goals:
            active = user.goals.get("active_goals", [])
            for goal in active:
                if goal.get("id") == goal_id:
                    current = goal.get("current_saved", 0)
                    goal["current_saved"] = current + amount_to_add
                    break
            user.goals["active_goals"] = active
            self.db.commit()
