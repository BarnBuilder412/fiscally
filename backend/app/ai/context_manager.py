"""
Fiscally Context Manager
========================
Manages user context (profile, patterns, insights, goals, memory).
This is the interface between AI agents and the database.
"""

import calendar
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.ai.prompts import get_currency_symbol
from app.services.localization import get_profile_ppp_multiplier

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
        return (
            self.db.query(User)
            .populate_existing()
            .filter(User.id == user_id)
            .first()
        )

    @staticmethod
    def _parse_amount_value(raw: Any) -> float:
        """Parse numeric amount from strings that may include currency symbols."""
        if raw is None:
            return 0.0
        text = str(raw).strip()
        cleaned = "".join(ch for ch in text if ch.isdigit() or ch in {".", ",", "-"})
        cleaned = cleaned.replace(",", "")
        try:
            return float(cleaned)
        except (TypeError, ValueError):
            return 0.0
    
    # =========================================================================
    # LOAD CONTEXT (from DB)
    # =========================================================================
    
    async def load_full_context(self, user_id: str) -> Dict[str, Any]:
        """
        Load complete user context for AI operations.
        
        Returns dict with: profile, patterns, goals, memory, insights
        """
        profile = await self.load_profile(user_id)
        financial = await self.load_financial_profile(user_id)
        if isinstance(profile, dict):
            profile["financial"] = financial
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
                    amount = self._parse_amount_value(target_amount)
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
        
        user = self._get_user(user_id)
        category_budget = None
        if user and category:
            profile = user.profile or {}
            category_budgets = profile.get("category_budgets", {}) if isinstance(profile, dict) else {}
            raw_budget = category_budgets.get(category)
            try:
                if raw_budget is not None:
                    category_budget = float(raw_budget)
            except (TypeError, ValueError):
                category_budget = None

            if category_budget is None and user.goals:
                active_goals = (user.goals or {}).get("active_goals", [])
                for goal in active_goals:
                    if goal.get("category") == category and goal.get("monthly_budget") is not None:
                        try:
                            category_budget = float(goal.get("monthly_budget"))
                            break
                        except (TypeError, ValueError):
                            continue

        if not transactions:
            return {
                "category_avg": 0,
                "category_max": 0,
                "typical_merchants": [],
                "category_budget": category_budget
            }
        
        amounts = [float(t.amount) for t in transactions]
        merchants = [t.merchant for t in transactions if t.merchant]
        
        return {
            "category_avg": sum(amounts) / len(amounts) if amounts else 0,
            "category_max": max(amounts) if amounts else 0,
            "typical_merchants": list(set(merchants))[:10],
            "category_budget": category_budget
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
        from sqlalchemy.orm.attributes import flag_modified
        
        user = self._get_user(user_id)
        if user:
            if not user.goals:
                user.goals = {}
            user.goals["active_goals"] = goals
            # Flag the JSONB field as modified so SQLAlchemy detects the change
            flag_modified(user, "goals")
            self.db.commit()
            print(f"[ContextManager] Saved {len(goals)} goals for user {user_id}")

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

    async def get_spending_total_between(
        self,
        user_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> float:
        """Get total spending for an explicit date range."""
        from app.models.user import Transaction

        transactions = (
            self.db.query(Transaction)
            .filter(
                Transaction.user_id == user_id,
                Transaction.transaction_at >= start_date,
                Transaction.transaction_at < end_date,
            )
            .all()
        )
        return sum(float(t.amount) for t in transactions)

    async def get_current_month_projection(self, user_id: str) -> Dict[str, Any]:
        """
        Estimate month-end expenses from month-to-date run rate.

        Returns:
            {
                "month_to_date_expenses": float,
                "projected_monthly_expenses": float,
                "daily_run_rate": float,
                "elapsed_days": int,
                "days_in_month": int,
                "remaining_days": int,
                "transaction_count_mtd": int,
                "by_category_mtd": {"food": 1200.0},
            }
        """
        from app.models.user import Transaction

        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        days_in_month = calendar.monthrange(now.year, now.month)[1]
        elapsed_days = max(1, now.day)
        remaining_days = max(0, days_in_month - elapsed_days)

        transactions = (
            self.db.query(Transaction)
            .filter(
                Transaction.user_id == user_id,
                Transaction.transaction_at >= month_start,
                Transaction.transaction_at <= now,
            )
            .all()
        )

        month_to_date_expenses = sum(float(t.amount) for t in transactions)
        by_category_mtd: Dict[str, float] = {}
        for transaction in transactions:
            category = transaction.category or "other"
            by_category_mtd[category] = by_category_mtd.get(category, 0.0) + float(transaction.amount)
        daily_run_rate = month_to_date_expenses / elapsed_days if elapsed_days > 0 else 0.0
        projected_monthly_expenses = daily_run_rate * days_in_month

        return {
            "month_to_date_expenses": round(month_to_date_expenses, 2),
            "projected_monthly_expenses": round(projected_monthly_expenses, 2),
            "daily_run_rate": round(daily_run_rate, 2),
            "elapsed_days": elapsed_days,
            "days_in_month": days_in_month,
            "remaining_days": remaining_days,
            "transaction_count_mtd": len(transactions),
            "by_category_mtd": {k: round(v, 2) for k, v in by_category_mtd.items()},
        }

    # =========================================================================
    # FORMAT DATA FOR LLM
    # =========================================================================

    @staticmethod
    def _format_amount(amount: Any, currency_code: str = "INR") -> str:
        """Format a numeric amount for LLM context with currency symbol."""
        symbol = get_currency_symbol(currency_code)
        if isinstance(amount, (int, float)):
            return f"{symbol}{amount:,.0f}"
        return f"{symbol}{amount}"
    
    def format_transactions_for_llm(
        self, 
        transactions: List[Dict[str, Any]],
        currency_code: str = "INR",
    ) -> str:
        """Format transactions as string for LLM context."""
        if not transactions:
            return "No transactions found."
        
        lines = []
        for t in transactions[:20]:  # Limit to avoid token overflow
            amount = t.get('amount', 0)
            line = f"- {self._format_amount(amount, currency_code=currency_code)} at {t.get('merchant', 'Unknown')}"
            line += f" ({t.get('category', 'other')})"
            if t.get('timestamp'):
                line += f" on {t['timestamp']}"
            lines.append(line)
        
        return "\n".join(lines)
    
    def format_summary_for_llm(
        self, 
        summary: Dict[str, Any],
        currency_code: str = "INR",
    ) -> str:
        """Format spending summary as string for LLM context."""
        lines = [
            f"Total spent: {self._format_amount(summary.get('total', 0), currency_code=currency_code)}",
            f"Transactions: {summary.get('transaction_count', 0)}",
            f"Average: {self._format_amount(summary.get('avg_transaction', 0), currency_code=currency_code)}",
            "",
            "By category:"
        ]
        
        for cat, amount in summary.get('by_category', {}).items():
            lines.append(f"  - {cat}: {self._format_amount(amount, currency_code=currency_code)}")
        
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
        profile = await self.load_profile(user_id)
        ppp_multiplier = get_profile_ppp_multiplier(profile)
        ppp_adjusted_budget = monthly_budget * ppp_multiplier if monthly_budget else 0
        
        # Get current month's spending
        spending = await self.get_spending_summary(user_id, "month")
        monthly_expenses = spending.get("total", 0)
        
        # Calculate savings based on BUDGET (planned spending), not actual expenses
        # This gives users their expected savings pool for goal allocation
        monthly_savings = max(0, monthly_salary - monthly_budget) if monthly_budget > 0 else monthly_salary
        
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
            "ppp_multiplier": round(ppp_multiplier, 2),
            "ppp_adjusted_budget": round(ppp_adjusted_budget, 2),
            "transaction_count": spending.get("transaction_count", 0),
            "expenses_by_category": spending.get("by_category", {}),
        }
    
    async def calculate_goal_progress(self, user_id: str) -> Dict[str, Any]:
        """
        Calculate real-time progress for all user goals.
        
        Priority-First Allocation:
        - Higher priority goals get FULL funding first
        - Lower priority goals get reduced allocation when funds are short
        - Example: If P1 needs ₹500 and P2 needs ₹300 but only ₹600 available,
          P1 gets ₹500, P2 gets remaining ₹100
        
        Returns:
            Dict with savings info, allocation matrix, and goals with progress
        """
        from datetime import datetime
        import math
        from dateutil.relativedelta import relativedelta
        
        # Get savings calculation
        savings_data = await self.calculate_monthly_savings(user_id)
        monthly_savings = savings_data.get("monthly_savings", 0)
        monthly_budget = savings_data.get("monthly_budget", 0)
        monthly_expenses = savings_data.get("monthly_expenses", 0)
        
        # Get user goals
        goals = await self.load_goals(user_id)
        
        if not goals:
            return {
                **savings_data,
                "goals": [],
                "allocation_matrix": {
                    "total_needed": 0,
                    "total_available": monthly_savings,
                    "shortfall": 0,
                    "budget_exceeded": monthly_expenses > monthly_budget if monthly_budget > 0 else False,
                },
                "total_goal_target": 0,
                "total_current_saved": 0,
            }
        
        # Sort goals by priority (lower number = higher priority)
        sorted_goals = sorted(
            goals, 
            key=lambda g: (g.get("priority", 999), goals.index(g))
        )
        
        # First pass: Calculate ideal monthly contributions for each goal
        goal_data = []
        total_ideal_needed = 0
        
        for goal in sorted_goals:
            goal_id = goal.get("id", "")
            label = goal.get("label", goal_id)
            
            # Parse target amount
            target_str = goal.get("target_amount", "0")
            target_amount = self._parse_amount_value(target_str)
            
            current_saved = goal.get("current_amount", goal.get("current_saved", 0))
            amount_needed = max(0, target_amount - current_saved)
            
            # Calculate ideal monthly contribution based on deadline
            target_date_str = goal.get("target_date")
            months_to_deadline = 12  # Default if no deadline
            
            if target_date_str:
                try:
                    target_date = datetime.strptime(target_date_str, "%Y-%m-%d")
                    now = datetime.now()
                    months_to_deadline = max(1, (target_date.year - now.year) * 12 + (target_date.month - now.month))
                except ValueError:
                    pass
            
            ideal_monthly = amount_needed / months_to_deadline if amount_needed > 0 else 0
            total_ideal_needed += ideal_monthly
            
            goal_data.append({
                "goal": goal,
                "goal_id": goal_id,
                "label": label,
                "target_amount": target_amount,
                "current_saved": current_saved,
                "current_amount": current_saved,
                "amount_needed": amount_needed,
                "ideal_monthly": ideal_monthly,
                "months_to_deadline": months_to_deadline,
                "target_date_str": target_date_str,
            })
        
        # Calculate allocation matrix
        shortfall = max(0, total_ideal_needed - monthly_savings)
        budget_exceeded = monthly_expenses > monthly_budget if monthly_budget > 0 else False
        
        # Second pass: Priority-first allocation
        # Higher priority goals get full funding, lower priority gets what's left
        remaining_savings = monthly_savings
        goal_progress = []
        total_target = 0
        total_saved = 0
        
        for gd in goal_data:
            goal = gd["goal"]
            ideal_monthly = gd["ideal_monthly"]
            amount_needed = gd["amount_needed"]
            target_amount = gd["target_amount"]
            current_saved = gd["current_saved"]
            months_to_deadline = gd["months_to_deadline"]
            target_date_str = gd["target_date_str"]
            
            total_target += target_amount
            total_saved += current_saved
            
            # Allocate: give this goal as much as possible up to its ideal
            allocated_monthly = min(remaining_savings, ideal_monthly)
            remaining_savings = max(0, remaining_savings - allocated_monthly)
            
            # Calculate progress percentage
            progress_percentage = 0
            if target_amount > 0:
                progress_percentage = min(100, (current_saved / target_amount) * 100)
            
            # Determine if underfunded
            is_underfunded = allocated_monthly < ideal_monthly and ideal_monthly > 0
            
            # Calculate if deadline is at risk
            deadline_at_risk = False
            projected_completion_date = None
            months_to_complete = None
            
            if amount_needed > 0 and allocated_monthly > 0:
                months_to_complete = math.ceil(amount_needed / allocated_monthly)
                projected_date = datetime.now() + relativedelta(months=months_to_complete)
                projected_completion_date = projected_date.strftime("%Y-%m-%d")
                
                if target_date_str:
                    try:
                        target_date = datetime.strptime(target_date_str, "%Y-%m-%d")
                        deadline_at_risk = projected_date > target_date
                    except ValueError:
                        pass
            elif amount_needed > 0:
                # No allocation at all - definitely at risk
                deadline_at_risk = True if target_date_str else False
            
            goal_progress.append({
                "id": gd["goal_id"],
                "label": gd["label"],
                "icon": goal.get("icon"),
                "color": goal.get("color"),
                "priority": goal.get("priority", 999),
                "target_amount": target_amount,
                "target_date": target_date_str,
                "current": current_saved,
                "current_saved": current_saved,
                "amount_needed": amount_needed,
                "ideal_monthly": round(ideal_monthly, 2),
                "allocated_monthly": round(allocated_monthly, 2),
                "monthly_contribution": round(allocated_monthly, 2),  # Legacy field
                "is_underfunded": is_underfunded,
                "deadline_at_risk": deadline_at_risk,
                "progress_percentage": round(progress_percentage, 1),
                "months_to_complete": months_to_complete,
                "projected_completion_date": projected_completion_date,
                "on_track": not deadline_at_risk,
            })
        
        return {
            **savings_data,
            "allocation_matrix": {
                "total_needed": round(total_ideal_needed, 2),
                "total_available": round(monthly_savings, 2),
                "shortfall": round(shortfall, 2),
                "budget_exceeded": budget_exceeded,
                "budget_overage": round(monthly_expenses - monthly_budget, 2) if budget_exceeded else 0,
            },
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
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(user, "goals")
            self.db.commit()
