#!/usr/bin/env python
"""
Test script to verify agentic flow and context management.

Tests:
1. Context manager loading (profile, patterns, memory)
2. Context updates (add facts, insights)
3. Transaction agent flow
4. Chat agent with memory extraction
"""

import asyncio
import json
from uuid import uuid4
from datetime import datetime
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app.models.user import User, Transaction
from app.ai.context_manager import ContextManager, UserInsight
from app.ai.agents import TransactionAgent, ChatAgent


async def test_context_manager():
    """Test 1: Context manager loading and persistence."""
    print("\n" + "=" * 80)
    print("TEST 1: Context Manager - Loading & Persistence")
    print("=" * 80)
    
    db: Session = SessionLocal()
    
    try:
        # Get the test user we created earlier
        user = db.query(User).filter(User.email == "fisally.user1@example.com").first()
        if not user:
            print("❌ Test user not found. Run manual auth tests first.")
            return
        
        print(f"\n✅ Found test user: {user.email} (ID: {user.id})")
        
        # Create context manager
        ctx = ContextManager(db)
        
        # Test 1.1: Load profile
        print("\n--- Test 1.1: Load Profile ---")
        profile = await ctx.load_profile(str(user.id))
        print(f"Profile loaded: {json.dumps(profile, indent=2)}")
        if profile:
            print(f"✅ Profile has identity: {profile.get('identity', {}).get('name')}")
        
        # Test 1.2: Load patterns (should be empty initially)
        print("\n--- Test 1.2: Load Patterns ---")
        patterns = await ctx.load_patterns(str(user.id))
        print(f"Patterns loaded: {json.dumps(patterns, indent=2) if patterns else '(empty)'}")
        
        # Test 1.3: Load memory (should be empty initially)
        print("\n--- Test 1.3: Load Memory ---")
        memory = await ctx.load_memory(str(user.id))
        print(f"Memory loaded: {json.dumps(memory, indent=2)}")
        
        # Test 1.4: Load goals (should be empty initially)
        print("\n--- Test 1.4: Load Goals ---")
        goals = await ctx.load_goals(str(user.id))
        print(f"Goals loaded: {json.dumps(goals, indent=2) if goals else '(empty)'}")
        
        # Test 1.5: Load full context
        print("\n--- Test 1.5: Load Full Context ---")
        full_ctx = await ctx.load_full_context(str(user.id))
        print(f"Full context keys: {list(full_ctx.keys())}")
        for key in full_ctx:
            item = full_ctx[key]
            if isinstance(item, dict):
                print(f"  - {key}: {len(item)} keys")
            elif isinstance(item, list):
                print(f"  - {key}: {len(item)} items")
            else:
                print(f"  - {key}: {type(item).__name__}")
        
        return user.id
        
    finally:
        db.close()


async def test_context_updates(user_id: str):
    """Test 2: Context manager updates (add facts, insights)."""
    print("\n" + "=" * 80)
    print("TEST 2: Context Manager - Updates & Persistence")
    print("=" * 80)
    
    db: Session = SessionLocal()
    
    try:
        ctx = ContextManager(db)
        
        # Test 2.1: Add memory fact
        print("\n--- Test 2.1: Add Memory Fact ---")
        fact = "Trying to reduce Swiggy orders - aiming for 2x per week max"
        await ctx.add_memory_fact(user_id, fact, "goal")
        print(f"✅ Added fact: {fact}")
        
        # Verify it was saved
        memory = await ctx.load_memory(user_id)
        facts = memory.get("facts", [])
        print(f"✅ Memory now has {len(facts)} fact(s)")
        if facts:
            print(f"   Latest fact: {facts[-1].get('text')}")
        
        # Test 2.2: Add another fact
        print("\n--- Test 2.2: Add Another Memory Fact ---")
        fact2 = "Saving for Europe trip in December 2026"
        await ctx.add_memory_fact(user_id, fact2, "goal")
        print(f"✅ Added fact: {fact2}")
        
        memory = await ctx.load_memory(user_id)
        facts = memory.get("facts", [])
        print(f"✅ Memory now has {len(facts)} fact(s)")
        for i, f in enumerate(facts[-2:], 1):
            print(f"   Fact {i}: {f.get('text')}")
        
        # Test 2.3: Update patterns
        print("\n--- Test 2.3: Update Patterns ---")
        new_patterns = {
            "high_spend_days": ["friday", "saturday"],
            "high_spend_hours": [18, 19, 20, 21, 22, 23],
            "category_distribution": {
                "food_delivery": 0.35,
                "shopping": 0.25,
                "transport": 0.15,
                "entertainment": 0.10,
                "bills": 0.15
            }
        }
        await ctx.update_patterns(user_id, new_patterns)
        print(f"✅ Updated patterns")
        
        # Verify
        patterns = await ctx.load_patterns(user_id)
        print(f"✅ Patterns now contain: {list(patterns.keys())}")
        print(f"   Category distribution: {patterns.get('category_distribution', {})}")
        
        # Test 2.4: Add insight
        print("\n--- Test 2.4: Add Insight ---")
        insight = UserInsight(
            id=str(uuid4()),
            type="pattern",
            message="You spend 3x more on weekends (₹2,100 avg) vs weekdays (₹700 avg)",
            confidence=0.92,
            actionable=True
        )
        await ctx.add_insight(user_id, insight)
        print(f"✅ Added insight: {insight.message}")
        
        # Verify
        insights = await ctx.load_active_insights(user_id)
        print(f"✅ Active insights: {len(insights)}")
        if insights:
            print(f"   Insight: {insights[-1].get('message')}")
        
    finally:
        db.close()


async def test_transaction_stats(user_id: str):
    """Test 3: Transaction agent - load user stats for anomaly detection."""
    print("\n" + "=" * 80)
    print("TEST 3: Transaction Stats & Anomaly Context")
    print("=" * 80)
    
    db: Session = SessionLocal()
    
    try:
        ctx = ContextManager(db)
        
        # Test 3.1: Get category stats
        print("\n--- Test 3.1: Get Category Stats (food_delivery) ---")
        stats = await ctx.load_user_stats(user_id, "food_delivery")
        print(f"Category stats:")
        print(f"  - Average: ₹{stats['category_avg']:.2f}")
        print(f"  - Maximum: ₹{stats['category_max']:.2f}")
        print(f"  - Typical merchants: {stats['typical_merchants']}")
        
        # Test 3.2: Get category total for period
        print("\n--- Test 3.2: Get Category Total (last 30 days) ---")
        total = await ctx.get_category_total(user_id, "food_delivery", "month")
        print(f"✅ Food delivery total (30 days): ₹{total:.2f}")
        
        # Test 3.3: Get spending summary
        print("\n--- Test 3.3: Get Spending Summary ---")
        summary = await ctx.get_spending_summary(user_id, "month")
        print(f"Total spent: ₹{summary['total']:.2f}")
        print(f"Transaction count: {summary['transaction_count']}")
        print(f"Average transaction: ₹{summary['avg_transaction']:.2f}")
        print(f"By category:")
        for cat, amount in summary['by_category'].items():
            print(f"  - {cat}: ₹{amount:.2f}")
        
        # Test 3.4: Get transactions for chat
        print("\n--- Test 3.4: Get Transactions (for chat context) ---")
        transactions = await ctx.get_transactions(user_id, days=30, limit=5)
        print(f"✅ Retrieved {len(transactions)} recent transactions")
        for t in transactions[:3]:
            print(f"  - ₹{t['amount']:>6.2f} at {t['merchant']:<15} ({t['category']})")
        
    finally:
        db.close()


async def test_transaction_agent(user_id: str):
    """Test 4: Transaction agent flow."""
    print("\n" + "=" * 80)
    print("TEST 4: Transaction Agent Flow")
    print("=" * 80)
    
    db: Session = SessionLocal()
    
    try:
        ctx = ContextManager(db)
        agent = TransactionAgent(ctx)
        
        # Create a test transaction
        test_transaction = {
            "id": str(uuid4()),
            "amount": 850.00,  # Higher than usual for food_delivery
            "merchant": "Swiggy",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        print(f"\nProcessing transaction: ₹{test_transaction['amount']} at {test_transaction['merchant']}")
        
        # Process it through the agent
        result = await agent.process(user_id, test_transaction)
        
        print(f"\n--- Agent Processing Results ---")
        print(f"Category: {result.category}")
        print(f"Confidence: {result.category_confidence:.2f}")
        print(f"Is anomaly: {result.is_anomaly}")
        if result.is_anomaly:
            print(f"Anomaly severity: {result.anomaly_severity}")
            print(f"Anomaly reason: {result.anomaly_reason}")
        print(f"Notification needed: {result.notification_needed}")
        print(f"Notification type: {result.notification_type}")
        
        print(f"\n✅ Transaction processed successfully")
        
    except Exception as e:
        print(f"❌ Error processing transaction: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


async def test_chat_agent(user_id: str):
    """Test 5: Chat agent with memory extraction."""
    print("\n" + "=" * 80)
    print("TEST 5: Chat Agent - Memory Extraction")
    print("=" * 80)
    
    db: Session = SessionLocal()
    
    try:
        ctx = ContextManager(db)
        agent = ChatAgent(ctx)
        
        # Test chat query
        test_message = "How much did I spend on food this month?"
        
        print(f"\nUser message: {test_message}")
        
        # Handle the chat
        result = await agent.handle(user_id, test_message)
        
        print(f"\n--- Chat Agent Response ---")
        print(f"Response: {result.response}")
        print(f"Memory updated: {result.memory_updated}")
        if result.new_fact:
            print(f"New fact captured: {result.new_fact}")
        
        print(f"\n✅ Chat handled successfully")
        
    except Exception as e:
        print(f"❌ Error in chat agent: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


async def main():
    """Run all tests."""
    print("\n" + "=" * 80)
    print("AGENTIC FLOW TESTING - Fiscally Backend")
    print("=" * 80)
    
    # Test 1: Context Manager Loading
    user_id = await test_context_manager()
    if not user_id:
        return
    
    # Test 2: Context Updates
    await test_context_updates(user_id)
    
    # Test 3: Transaction Stats
    await test_transaction_stats(user_id)
    
    # Test 4: Transaction Agent
    await test_transaction_agent(user_id)
    
    # Test 5: Chat Agent
    await test_chat_agent(user_id)
    
    print("\n" + "=" * 80)
    print("AGENTIC FLOW TESTING COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
