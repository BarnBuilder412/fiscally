import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class User(Base):
    """
    User model for authentication and profile management.
    
    The context fields (profile, patterns, insights, goals, memory) use JSONB
    for flexible, schema-less storage that the AI agents can read and update.
    """
    __tablename__ = "users"

    # Primary key - UUID for security (non-guessable IDs)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Authentication fields
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    
    # Account status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    
    # AI Context - JSONB columns for flexible schema
    # These are the "living understanding" of each user that AI agents read/write
    
    profile = Column(JSONB, default=dict, nullable=False)
    """
    User identity and preferences:
    {
        "identity": {"name", "currency", "income_range", "payday"},
        "preferences": {"notification_style", "digest_day", "voice_enabled", "language"},
        "financial_personality": {"type", "confidence", "detected_at"}
    }
    """
    
    patterns = Column(JSONB, default=dict, nullable=False)
    """
    AI-learned spending behavior:
    {
        "spending_patterns": {"high_spend_window", "category_distribution", "triggers"},
        "behavioral_flags": {"payday_spike", "late_night_ordering", "subscription_creep"},
        "anomaly_thresholds": {"unusual_amount", "unusual_category_spike"}
    }
    """
    
    insights = Column(JSONB, default=dict, nullable=False)
    """
    AI-generated observations:
    {
        "active_insights": [{"id", "type", "message", "confidence", "actionable", "created_at"}],
        "delivered_insights": [...],
        "dismissed_insights": [...]
    }
    """
    
    goals = Column(JSONB, default=dict, nullable=False)
    """
    Financial targets:
    {
        "active_goals": [{"id", "name", "target_amount", "current_amount", "deadline"}],
        "completed_goals": [...],
        "abandoned_goals": [...]
    }
    """
    
    memory = Column(JSONB, default=dict, nullable=False)
    """
    Conversation history and facts:
    {
        "facts": [{"text", "added"}],
        "conversation_summary": "...",
        "last_updated": "..."
    }
    """
    
    # Refresh token tracking for JWT rotation
    refresh_token_hash = Column(String(255), nullable=True)
    
    def __repr__(self):
        return f"<User {self.email}>"


class Transaction(Base):
    """
    Transaction model for expense tracking.
    
    Stores both manual entries and SMS-parsed transactions.
    """
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Transaction details
    amount = Column(String(50), nullable=False)  # Stored as string to preserve precision
    currency = Column(String(10), default="INR", nullable=False)
    merchant = Column(String(255), nullable=True)
    category = Column(String(100), nullable=True, index=True)
    note = Column(Text, nullable=True)
    
    # Source tracking
    source = Column(String(50), nullable=False)  # 'manual', 'voice', 'sms', 'receipt'
    raw_sms = Column(Text, nullable=True)  # Original SMS text (if source='sms')
    
    # AI processing metadata
    ai_category_confidence = Column(String(10), nullable=True)  # 0.0-1.0
    spend_class = Column(String(20), nullable=True, index=True)  # need | want | luxury
    spend_class_confidence = Column(String(10), nullable=True)  # 0.0-1.0
    spend_class_reason = Column(String(255), nullable=True)
    is_anomaly = Column(Boolean, default=False, nullable=False)
    anomaly_reason = Column(String(255), nullable=True)
    opik_trace_id = Column(String(100), nullable=True, index=True)
    
    # Timestamps
    transaction_at = Column(DateTime, nullable=False)  # When the transaction occurred
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<Transaction {self.amount} at {self.merchant}>"
