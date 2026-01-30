"""
Test script for Fiscally AI components.

Usage:
    1. Copy .env.example to .env and add your OPENAI_API_KEY
    2. pip install openai python-dotenv httpx
    3. python test_ai.py
"""

import asyncio
import os
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Verify API key
if not os.getenv("OPENAI_API_KEY"):
    print("❌ Error: OPENAI_API_KEY not set in .env")
    print("   Copy .env.example to .env and add your OpenAI API key")
    exit(1)

from app.ai.llm_client import llm_client
from app.ai.prompts import lookup_merchant, CATEGORIES


async def test_merchant_lookup():
    """Test known merchant lookup (no API call)."""
    print("\n🔍 Testing merchant lookup...")
    
    test_cases = [
        ("Swiggy", "food_delivery"),
        ("SWIGGY ORDER", "food_delivery"),
        ("amazon", "shopping"),
        ("Uber Trip", "transport"),
        ("Unknown Store", None),
    ]
    
    for merchant, expected in test_cases:
        result = lookup_merchant(merchant)
        status = "✅" if result == expected else "❌"
        print(f"  {status} '{merchant}' → {result} (expected: {expected})")


async def test_categorization():
    """Test transaction categorization."""
    print("\n🏷️ Testing categorization...")
    
    test_transactions = [
        {"amount": 450, "merchant": "Swiggy", "timestamp": "2026-01-30T20:30:00Z"},
        {"amount": 180, "merchant": "Uber", "timestamp": "2026-01-30T18:00:00Z"},
        {"amount": 2500, "merchant": "Amazon", "timestamp": "2026-01-30T14:00:00Z"},
        {"amount": 350, "merchant": "Blue Tokai Coffee", "timestamp": "2026-01-30T10:00:00Z"},
        {"amount": 500, "merchant": "Random Local Shop", "timestamp": "2026-01-30T16:00:00Z"},
    ]
    
    for tx in test_transactions:
        result = await llm_client.categorize_transaction(tx)
        source = result.get("source", "unknown")
        search_used = "🔍" if result.get("search_used") else ""
        print(f"  → ₹{tx['amount']} at {tx['merchant']}")
        print(f"    Category: {result['category']} (conf: {result['confidence']:.2f}) [{source}] {search_used}")


async def test_voice_parsing():
    """Test voice input parsing."""
    print("\n🎤 Testing voice parsing...")
    
    test_inputs = [
        "spent 200 on coffee",
        "450 swiggy dinner",
        "auto 80 rupees",
        "amazon 2.5k headphones",
        "paid rent 15000",
    ]
    
    for transcript in test_inputs:
        result = await llm_client.parse_voice_input(transcript)
        print(f"  '{transcript}'")
        print(f"    → ₹{result['amount']} | {result['category']} | merchant: {result['merchant']} | conf: {result['confidence']:.2f}")
        if result.get("needs_clarification"):
            print(f"    ⚠️ Needs clarification: {result['clarification_question']}")


async def test_anomaly_detection():
    """Test anomaly detection."""
    print("\n⚠️ Testing anomaly detection...")
    
    transaction = {
        "amount": 5000,
        "merchant": "Swiggy",
        "category": "food_delivery",
        "timestamp": "2026-01-30T23:30:00Z"
    }
    
    user_stats = {
        "category_avg": 400,
        "category_max": 800,
        "typical_merchants": ["Swiggy", "Zomato"],
        "category_budget": 5000
    }
    
    result = await llm_client.detect_anomaly(transaction, user_stats)
    print(f"  Transaction: ₹{transaction['amount']} at {transaction['merchant']}")
    print(f"  User avg: ₹{user_stats['category_avg']}, max: ₹{user_stats['category_max']}")
    print(f"  Is anomaly: {result['is_anomaly']}")
    if result['is_anomaly']:
        print(f"  Severity: {result['severity']}")
        print(f"  Reason: {result['reason']}")


async def test_chat():
    """Test chat functionality."""
    print("\n💬 Testing chat...")
    
    user_context = {
        "profile": {
            "name": "Kaushal",
            "monthly_budget": 50000
        },
        "patterns": {
            "high_spend_days": ["friday", "saturday"],
            "category_distribution": {
                "food_delivery": 0.35,
                "shopping": 0.25,
                "transport": 0.15
            }
        },
        "goals": [
            {"name": "Emergency Fund", "target": 100000, "current": 45000}
        ],
        "memory": {
            "facts": [
                {"text": "Trying to reduce food delivery spending"}
            ]
        }
    }
    
    # Provide mock transaction data (in real app, this comes from DB)
    transaction_data = """
Total spent: ₹32,450
Transactions: 45
Average: ₹721

By category:
  - food_delivery: ₹12,400
  - shopping: ₹8,200
  - transport: ₹4,100
  - bills: ₹3,750
  - other: ₹4,000
"""
    
    message = "How much have I spent on food delivery this month?"
    
    response = await llm_client.chat(
        message=message,
        user_context=user_context,
        transaction_data=transaction_data
    )
    
    print(f"  User: {message}")
    print(f"  Fiscally: {response}")


async def test_weekly_insights():
    """Test weekly insights generation."""
    print("\n📊 Testing weekly insights...")
    
    user_context = {
        "profile": {"name": "Kaushal", "monthly_budget": 50000},
        "patterns": {},
        "goals": []
    }
    
    transactions = [
        {"amount": 450, "category": "food_delivery", "merchant": "Swiggy"},
        {"amount": 180, "category": "transport", "merchant": "Uber"},
        {"amount": 350, "category": "restaurant", "merchant": "Starbucks"},
        {"amount": 2500, "category": "shopping", "merchant": "Amazon"},
        {"amount": 380, "category": "food_delivery", "merchant": "Zomato"},
        {"amount": 150, "category": "transport", "merchant": "Ola"},
        {"amount": 600, "category": "groceries", "merchant": "BigBasket"},
    ]
    
    result = await llm_client.generate_weekly_insights(
        user_context, 
        transactions,
        last_week_total=5000
    )
    
    print(f"  Headline: {result.get('headline')}")
    print(f"  Summary: {result.get('summary')}")
    print(f"  Tip: {result.get('tip')}")


async def test_memory_extraction():
    """Test memory extraction from chat."""
    print("\n🧠 Testing memory extraction...")
    
    test_messages = [
        "I'm saving for a Europe trip next December",
        "How much did I spend on food?",
        "Trying to cut down on Swiggy orders",
        "What's the weather today?",
        "My rent is due on the 5th of every month",
    ]
    
    for message in test_messages:
        result = await llm_client.extract_memory(message)
        if result.get("has_fact"):
            print(f"  ✅ '{message}'")
            print(f"     → Fact: {result['fact']} (category: {result['category']})")
        else:
            print(f"  ⏭️ '{message}' → No fact to remember")


async def main():
    """Run all tests."""
    print("=" * 60)
    print("🧪 Fiscally AI Component Tests")
    print("=" * 60)
    
    # Test without API calls first
    await test_merchant_lookup()
    
    # Tests that require API calls
    print("\n📡 Running tests that require OpenAI API...")
    
    await test_categorization()
    await test_voice_parsing()
    await test_anomaly_detection()
    await test_chat()
    await test_weekly_insights()
    await test_memory_extraction()
    
    print("\n" + "=" * 60)
    print("✅ All tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
