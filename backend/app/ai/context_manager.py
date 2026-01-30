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
        """Load active goals from JSONB."""
        user = self._get_user(user_id)
        if user and user.goals:
            return user.goals.get("active_goals", [])
        return []
    
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
        
        result = (
            self.db.query(func.sum(func.cast(Transaction.amount, Decimal)))
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
            memory["facts"] = facts[-50]  # Keep last 50 facts
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
