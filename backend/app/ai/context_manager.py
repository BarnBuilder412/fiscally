"""
Fiscally Context Manager
========================
Manages user context (profile, patterns, insights, goals, memory).
This is the interface between AI agents and the database.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
import json


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
    
    This class will be connected to the database layer.
    For now, it defines the interface that the DB layer needs to implement.
    """
    
    def __init__(self, db_session=None):
        """
        Initialize with database session.
        
        Args:
            db_session: SQLAlchemy async session (injected by FastAPI)
        """
        self.db = db_session
    
    # =========================================================================
    # LOAD CONTEXT (from DB)
    # =========================================================================
    
    async def load_full_context(self, user_id: str) -> Dict[str, Any]:
        """
        Load complete user context for AI operations.
        
        Returns dict with: profile, patterns, goals, memory, insights
        """
        # TODO: Replace with actual DB queries once schema is ready
        # For now, return structure for integration
        
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
        """Load user profile."""
        # TODO: DB query
        # SELECT * FROM user_profiles WHERE user_id = ?
        return {}
    
    async def load_patterns(self, user_id: str) -> Dict[str, Any]:
        """Load spending patterns."""
        # TODO: DB query  
        # SELECT patterns FROM user_context WHERE user_id = ?
        return {}
    
    async def load_goals(self, user_id: str) -> List[Dict[str, Any]]:
        """Load active goals."""
        # TODO: DB query
        # SELECT * FROM user_goals WHERE user_id = ? AND status = 'active'
        return []
    
    async def load_memory(self, user_id: str) -> Dict[str, Any]:
        """Load user memory (facts, conversation summary)."""
        # TODO: DB query
        # SELECT memory FROM user_context WHERE user_id = ?
        return {"facts": [], "conversation_summary": ""}
    
    async def load_active_insights(self, user_id: str) -> List[Dict[str, Any]]:
        """Load active (undelivered/undismissed) insights."""
        # TODO: DB query
        # SELECT * FROM user_insights WHERE user_id = ? AND dismissed = false
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
        # TODO: DB aggregation queries
        # This will need:
        # - AVG(amount) WHERE category = ?
        # - MAX(amount) WHERE category = ?
        # - Distinct merchants for category
        # - Budget for category
        
        return {
            "category_avg": 0,
            "category_max": 0,
            "typical_merchants": [],
            "category_budget": None
        }
    
    async def get_category_total(
        self,
        user_id: str,
        category: str,
        period: str = "month"  # "week", "month", "year"
    ) -> float:
        """Get total spending in category for period."""
        # TODO: DB query
        # SELECT SUM(amount) FROM transactions 
        # WHERE user_id = ? AND category = ? AND timestamp > ?
        return 0.0

    # =========================================================================
    # UPDATE CONTEXT (to DB)
    # =========================================================================
    
    async def update_patterns(
        self, 
        user_id: str, 
        patterns: Dict[str, Any]
    ) -> None:
        """Update user spending patterns."""
        # TODO: DB update
        # UPDATE user_context SET patterns = ? WHERE user_id = ?
        pass
    
    async def add_memory_fact(
        self, 
        user_id: str, 
        fact: str, 
        category: str
    ) -> None:
        """Add a fact to user memory."""
        # TODO: DB update (JSONB append)
        # UPDATE user_context 
        # SET memory = jsonb_set(memory, '{facts}', memory->'facts' || ?)
        # WHERE user_id = ?
        pass
    
    async def add_insight(
        self, 
        user_id: str, 
        insight: UserInsight
    ) -> None:
        """Store a new insight."""
        # TODO: DB insert
        # INSERT INTO user_insights (user_id, type, message, ...) VALUES (...)
        pass
    
    async def mark_insight_delivered(
        self, 
        user_id: str, 
        insight_id: str
    ) -> None:
        """Mark insight as delivered."""
        # TODO: DB update
        # UPDATE user_insights SET delivered = true WHERE id = ?
        pass
    
    async def dismiss_insight(
        self, 
        user_id: str, 
        insight_id: str
    ) -> None:
        """Mark insight as dismissed."""
        # TODO: DB update
        # UPDATE user_insights SET dismissed = true WHERE id = ?
        pass
    
    async def update_goal_progress(
        self, 
        user_id: str, 
        goal_id: str, 
        current_amount: float
    ) -> None:
        """Update goal progress."""
        # TODO: DB update
        # UPDATE user_goals SET current_amount = ? WHERE id = ?
        pass

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
        # TODO: DB query with filters
        # SELECT * FROM transactions WHERE user_id = ? 
        # AND timestamp > NOW() - INTERVAL '? days'
        # AND (category = ? OR ? IS NULL)
        # ORDER BY timestamp DESC LIMIT ?
        return []
    
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
        # TODO: DB aggregation
        return {
            "total": 0,
            "by_category": {},
            "transaction_count": 0,
            "avg_transaction": 0
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
            line = f"- ₹{t.get('amount', 0):,} at {t.get('merchant', 'Unknown')}"
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
