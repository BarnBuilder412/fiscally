#!/usr/bin/env python3
"""
Test context manager and memory persistence without LLM calls.
"""

import asyncio
import json
from uuid import uuid4
from datetime import datetime
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User, Transaction
from app.ai.context_manager import ContextManager, UserInsight


async def main():
    """Run context manager tests."""
    print("\n" + "=" * 80)
    print("TESTING CONTEXT MANAGER - Memory & Pattern Persistence")
    print("=" * 80)
    
    db: Session = SessionLocal()
    
    try:
        # Get the test user
        user = db.query(User).filter(User.email == "fisally.user1@example.com").first()
        if not user:
            print("❌ Test user not found. Run manual auth tests first.")
            return
        
        user_id = str(user.id)
        print(f"\n✅ Found test user: {user.email} (ID: {user_id})")
        
        # Create context manager
        ctx = ContextManager(db)
        
        # TEST 1: Load Full Context (should have existing profile)
        print("\n" + "-" * 80)
        print("TEST 1: Load Full Context")
        print("-" * 80)
        
        full_ctx = await ctx.load_full_context(user_id)
        print(f"\nFull Context Structure:")
        print(f"  profile: {type(full_ctx['profile']).__name__} with {len(full_ctx['profile'])} keys")
        if full_ctx['profile']:
            print(f"    ├─ identity.name: {full_ctx['profile'].get('identity', {}).get('name')}")
            print(f"    └─ preferences: {list(full_ctx['profile'].get('preferences', {}).keys())}")
        print(f"  patterns: {type(full_ctx['patterns']).__name__} (empty: {len(full_ctx['patterns']) == 0})")
        print(f"  goals: {type(full_ctx['goals']).__name__} (items: {len(full_ctx['goals'])})")
        print(f"  memory: {type(full_ctx['memory']).__name__}")
        print(f"    ├─ facts: {len(full_ctx['memory'].get('facts', []))} items")
        print(f"    └─ conversation_summary: {len(full_ctx['memory'].get('conversation_summary', ''))} chars")
        print(f"  insights: {type(full_ctx['insights']).__name__} (items: {len(full_ctx['insights'])})")
        
        # TEST 2: Add Memory Facts
        print("\n" + "-" * 80)
        print("TEST 2: Add Memory Facts & Verify Persistence")
        print("-" * 80)
        
        fact1 = "Trying to reduce Swiggy orders - aiming for 2x per week max"
        print(f"\nAdding fact 1: '{fact1}'")
        await ctx.add_memory_fact(user_id, fact1, "goal")
        print("✅ Fact added")
        
        # Verify immediately
        memory = await ctx.load_memory(user_id)
        print(f"✅ Memory now has {len(memory.get('facts', []))} fact(s)")
        if memory.get('facts'):
            latest = memory['facts'][-1]
            print(f"   Latest fact: {latest.get('text')}")
            print(f"   Category: {latest.get('category')}")
            print(f"   Timestamp: {latest.get('added')}")
        
        # Add second fact
        fact2 = "Saving for Europe trip in December 2026"
        print(f"\nAdding fact 2: '{fact2}'")
        await ctx.add_memory_fact(user_id, fact2, "goal")
        print("✅ Fact added")
        
        memory = await ctx.load_memory(user_id)
        print(f"✅ Memory now has {len(memory.get('facts', []))} fact(s)")
        for i, f in enumerate(memory.get('facts', [])[-2:], 1):
            print(f"   Fact {i}: {f.get('text')[:50]}...")
        
        # TEST 3: Update Patterns
        print("\n" + "-" * 80)
        print("TEST 3: Update Spending Patterns")
        print("-" * 80)
        
        new_patterns = {
            "high_spend_days": ["friday", "saturday"],
            "high_spend_hours": [18, 19, 20, 21, 22, 23],
            "category_distribution": {
                "food_delivery": 0.35,
                "shopping": 0.25,
                "transport": 0.15,
                "entertainment": 0.10,
                "bills": 0.15
            },
            "behavioral_flags": {
                "payday_spike": True,
                "late_night_ordering": True,
                "subscription_creep": False
            }
        }
        
        print(f"\nUpdating patterns with:")
        for key in new_patterns:
            print(f"  - {key}")
        
        await ctx.update_patterns(user_id, new_patterns)
        print("✅ Patterns updated")
        
        # Verify
        patterns = await ctx.load_patterns(user_id)
        print(f"\n✅ Patterns now contain: {list(patterns.keys())}")
        print(f"   High spend days: {patterns.get('high_spend_days')}")
        print(f"   Behavioral flags: {patterns.get('behavioral_flags')}")
        print(f"   Category distribution:")
        for cat, pct in patterns.get('category_distribution', {}).items():
            print(f"      - {cat}: {pct*100:.0f}%")
        
        # TEST 4: Add Insights
        print("\n" + "-" * 80)
        print("TEST 4: Add Insights & Manage Lifecycle")
        print("-" * 80)
        
        insight1 = UserInsight(
            id=str(uuid4()),
            type="pattern",
            message="You spend 3x more on weekends (₹2,100 avg) vs weekdays (₹700 avg)",
            confidence=0.92,
            actionable=True
        )
        
        print(f"\nAdding insight 1: {insight1.message[:60]}...")
        await ctx.add_insight(user_id, insight1)
        print("✅ Insight added")
        
        insight2 = UserInsight(
            id=str(uuid4()),
            type="prediction",
            message="At current rate, you'll hit emergency fund goal by March 31, 2026",
            confidence=0.78,
            actionable=False
        )
        
        print(f"\nAdding insight 2: {insight2.message[:60]}...")
        await ctx.add_insight(user_id, insight2)
        print("✅ Insight added")
        
        # Load active insights
        insights = await ctx.load_active_insights(user_id)
        print(f"\n✅ Active insights: {len(insights)}")
        for i, ins in enumerate(insights, 1):
            print(f"   {i}. [{ins.get('type')}] {ins.get('message')[:50]}... (confidence: {ins.get('confidence')})")
        
        # TEST 5: Query Transaction Data
        print("\n" + "-" * 80)
        print("TEST 5: Query Transactions for Chat Context")
        print("-" * 80)
        
        transactions = await ctx.get_transactions(user_id, days=30, limit=5)
        print(f"\n✅ Retrieved {len(transactions)} recent transactions")
        for t in transactions[:3]:
            print(f"   - ₹{t['amount']:>7.2f} at {t['merchant']:<15} ({t['category']:<18}) on {t['timestamp'][:10]}")
        
        # Get spending summary
        summary = await ctx.get_spending_summary(user_id, "month")
        print(f"\n✅ Spending Summary (30 days):")
        print(f"   Total: ₹{summary['total']:.2f}")
        print(f"   Transactions: {summary['transaction_count']}")
        print(f"   Average: ₹{summary['avg_transaction']:.2f}")
        print(f"   By category:")
        for cat, amount in sorted(summary['by_category'].items(), key=lambda x: x[1], reverse=True):
            pct = (amount / summary['total'] * 100) if summary['total'] > 0 else 0
            print(f"      - {cat:<18}: ₹{amount:>7.2f} ({pct:>5.1f}%)")
        
        # TEST 6: Category Stats for Anomaly Detection
        print("\n" + "-" * 80)
        print("TEST 6: Category Stats for Anomaly Detection")
        print("-" * 80)
        
        for cat in ["food_delivery", "shopping", "transport"]:
            stats = await ctx.load_user_stats(user_id, cat)
            total = await ctx.get_category_total(user_id, cat, "month")
            print(f"\n{cat}:")
            print(f"   Average transaction: ₹{stats['category_avg']:.2f}")
            print(f"   Max transaction: ₹{stats['category_max']:.2f}")
            print(f"   Typical merchants: {', '.join(stats['typical_merchants'][:3])}")
            print(f"   Month total: ₹{total:.2f}")
        
        # TEST 7: Full Context Persistence (reload everything)
        print("\n" + "-" * 80)
        print("TEST 7: Full Context Persistence Check")
        print("-" * 80)
        
        final_ctx = await ctx.load_full_context(user_id)
        
        print(f"\n✅ Reloaded Full Context:")
        print(f"   Profile identity.name: {final_ctx['profile'].get('identity', {}).get('name')}")
        print(f"   Memory facts: {len(final_ctx['memory'].get('facts', []))}")
        print(f"   Patterns keys: {list(final_ctx['patterns'].keys())}")
        print(f"   Active insights: {len(final_ctx['insights'])}")
        
        # TEST 8: Verify All Data is Coherent
        print("\n" + "-" * 80)
        print("TEST 8: Data Coherence Check")
        print("-" * 80)
        
        checks = [
            ("Profile exists", bool(final_ctx['profile'])),
            ("Profile has identity", bool(final_ctx['profile'].get('identity'))),
            ("Memory has facts", len(final_ctx['memory'].get('facts', [])) > 0),
            ("Patterns updated", len(final_ctx['patterns']) > 0),
            ("Insights generated", len(final_ctx['insights']) > 0),
            ("Transactions queryable", len(transactions) > 0),
        ]
        
        all_passed = True
        for check_name, result in checks:
            status = "✅" if result else "❌"
            print(f"   {status} {check_name}")
            if not result:
                all_passed = False
        
        print("\n" + "=" * 80)
        if all_passed:
            print("✅ ALL TESTS PASSED - Context Manager is working correctly")
            print("   ✓ Memory facts are persisted")
            print("   ✓ Patterns are updated and stored")
            print("   ✓ Insights are created and tracked")
            print("   ✓ Transaction data is queryable")
            print("   ✓ Full context loads correctly")
        else:
            print("⚠️  SOME TESTS FAILED - Check results above")
        print("=" * 80)
        
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
