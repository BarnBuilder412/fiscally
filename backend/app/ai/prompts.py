"""
Fiscally AI Prompts Library
===========================
All LLM prompts for the Fiscally expense tracking app.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import json

# =============================================================================
# CORE PERSONALITY (SOUL)
# =============================================================================

FISCALLY_SOUL = """
# Fiscally AI - Financial Companion

## Who You Are
You are Fiscally, a personal finance companion (not advisor).
You help users understand and improve their spending habits.

## Core Principles

**Be honest, not preachy.**
If someone spends ₹2000 on Zomato, don't shame them.
Note it. Show the pattern. Let them decide.

**Celebrate wins, don't just flag problems.**
"You spent 20% less this week" > "You overspent on dining"

**Be specific, not generic.**
Bad: "You should save more"
Good: "Skipping 3 Swiggy orders/week = ₹3,600/month saved"

**Predict, don't just report.**
"At this rate, you'll hit your goal in 4 months"

**Know when to shut up.**
Only interrupt for: anomalies, goal milestones, urgent alerts.

## Tone
- Casual, like a smart friend who's good with money
- Use specific numbers (more powerful than adjectives)
- Light humor okay, never about financial stress
- Never condescending or judgmental
- Use Indian Rupee symbol (₹) always

## Boundaries
- Never give investment advice
- Never predict market movements  
- Never access data you weren't given
"""

# =============================================================================
# CATEGORIES & MERCHANT MAPPING
# =============================================================================

CATEGORIES = [
    "food_delivery",
    "restaurant", 
    "groceries",
    "transport",
    "shopping",
    "entertainment",
    "bills",
    "subscriptions",
    "health",
    "education",
    "transfer",
    "other"
]

# Known merchants - no search needed for these
MERCHANT_CATEGORY_MAP = {
    # Food Delivery
    "swiggy": "food_delivery",
    "zomato": "food_delivery",
    "dunzo": "food_delivery",
    "eatsure": "food_delivery",
    
    # Transport
    "uber": "transport",
    "ola": "transport",
    "rapido": "transport",
    "metro": "transport",
    "irctc": "transport",
    "redbus": "transport",
    "bmtc": "transport",
    "ksrtc": "transport",
    
    # Shopping
    "amazon": "shopping",
    "flipkart": "shopping",
    "myntra": "shopping",
    "ajio": "shopping",
    "nykaa": "shopping",
    "meesho": "shopping",
    
    # Groceries
    "bigbasket": "groceries",
    "blinkit": "groceries",
    "zepto": "groceries",
    "instamart": "groceries",
    "dmart": "groceries",
    "jiomart": "groceries",
    
    # Entertainment/Subscriptions
    "netflix": "subscriptions",
    "spotify": "subscriptions",
    "hotstar": "subscriptions",
    "prime": "subscriptions",
    "youtube": "subscriptions",
    "bookmyshow": "entertainment",
    "pvr": "entertainment",
    "inox": "entertainment",
    
    # Bills/Telecom
    "airtel": "bills",
    "jio": "bills",
    "vodafone": "bills",
    "vi": "bills",
    "bsnl": "bills",
    "bescom": "bills",
    "tata power": "bills",
    
    # Health
    "apollo": "health",
    "pharmeasy": "health",
    "netmeds": "health",
    "practo": "health",
    "cult.fit": "health",
    
    # Food/Cafe chains
    "starbucks": "restaurant",
    "ccd": "restaurant",
    "mcdonald": "restaurant",
    "dominos": "restaurant",
    "kfc": "restaurant",
    "burger king": "restaurant",
    "haldiram": "restaurant",
    "chaayos": "restaurant",
    "blue tokai": "restaurant",
    "third wave": "restaurant",
}


def lookup_merchant(merchant_name: str) -> Optional[str]:
    """
    Quick lookup for known merchants. Returns category or None.
    """
    if not merchant_name:
        return None
    
    merchant_lower = merchant_name.lower().strip()
    
    # Direct match
    if merchant_lower in MERCHANT_CATEGORY_MAP:
        return MERCHANT_CATEGORY_MAP[merchant_lower]
    
    # Partial match (e.g., "Swiggy Order" matches "swiggy")
    for known_merchant, category in MERCHANT_CATEGORY_MAP.items():
        if known_merchant in merchant_lower or merchant_lower in known_merchant:
            return category
    
    return None


# =============================================================================
# TRANSACTION CATEGORIZATION
# =============================================================================

def build_categorization_prompt(
    transaction: Dict[str, Any], 
    user_context: Optional[Dict[str, Any]] = None,
    search_context: Optional[str] = None  # Added: search results for unknown merchants
) -> str:
    """
    Generate prompt for transaction categorization.
    
    Args:
        transaction: Dict with amount, merchant, timestamp
        user_context: Optional dict with user's common categories
        search_context: Optional web search results about unknown merchant
    """
    user_context = user_context or {}
    
    # Build search context section if provided
    search_section = ""
    if search_context:
        search_section = f"""
## Search Results (for unknown merchant)
{search_context}

Use this information to determine the merchant type.
"""

    return f"""Categorize this transaction into exactly one category.

## Transaction
- Amount: ₹{transaction.get('amount', 0)}
- Merchant/Description: {transaction.get('merchant', 'Unknown')}
- Time: {transaction.get('timestamp', 'Unknown')}
{search_section}
## Categories
{', '.join(CATEGORIES)}

## Rules
1. If merchant is clearly identifiable (Swiggy, Amazon, etc.), use obvious category
2. Consider time of day (late night food = likely delivery)
3. Consider amount patterns (₹50-500 at unknown = likely food/transport)
4. If truly uncertain, set confidence low

Respond ONLY with valid JSON:
{{"category": "category_name", "confidence": 0.0-1.0}}
"""


def build_search_query_prompt(merchant_name: str, transaction_context: str) -> str:
    """
    Generate a search query to identify unknown merchant.
    Only used when merchant not in known list AND LLM confidence < 0.7
    """
    return f"""I need to search the web to identify what type of business this is.

Merchant name: "{merchant_name}"
Transaction context: {transaction_context}

Generate a simple search query to find what this business sells/does.
Focus on India-specific results.

Respond with JSON: {{"search_query": "query string", "search_needed": true/false}}

If the merchant name is clearly a category (like "ATM", "Petrol", "Grocery"), set search_needed: false.
"""


# =============================================================================
# ANOMALY DETECTION
# =============================================================================

def build_anomaly_detection_prompt(
    transaction: Dict[str, Any],
    user_stats: Dict[str, Any]
) -> str:
    """Detect if transaction is unusual for this user."""
    return f"""Is this transaction unusual?

## Transaction
- Amount: ₹{transaction.get('amount', 0)}
- Category: {transaction.get('category', 'unknown')}
- Merchant: {transaction.get('merchant', 'Unknown')}

## User's History
- Average for {transaction.get('category', 'this category')}: ₹{user_stats.get('category_avg', 0)}
- Max for this category: ₹{user_stats.get('category_max', 0)}
- Budget for this category: ₹{user_stats.get('category_budget', 'Not set')}

## Check For
1. Amount > 2x average
2. Would breach budget
3. First time at this merchant

Respond ONLY with valid JSON:
{{
    "is_anomaly": true/false,
    "severity": "low" | "medium" | "high" | null,
    "reason": "brief reason" | null
}}
"""


# =============================================================================
# VOICE INPUT PARSING
# =============================================================================

def build_voice_parsing_prompt(
    transcript: str,
    user_context: Optional[Dict[str, Any]] = None
) -> str:
    """Parse voice transcript into structured transaction."""
    user_context = user_context or {}
    
    return f"""Parse this voice note into a transaction.

Voice: "{transcript}"

## Rules
1. Extract amount (handle "2.5k" = 2500, "1.5 lakh" = 150000)
2. Identify merchant if mentioned
3. Infer category from context
4. If unclear, set needs_clarification: true

## Examples
- "spent 200 on coffee" → amount: 200, category: "restaurant"
- "450 swiggy" → amount: 450, category: "food_delivery", merchant: "Swiggy"
- "auto 80" → amount: 80, category: "transport"
- "amazon 2.5k" → amount: 2500, category: "shopping", merchant: "Amazon"

Respond ONLY with valid JSON:
{{
    "amount": number,
    "merchant": "string" | null,
    "category": "string",
    "confidence": 0.0-1.0,
    "needs_clarification": true/false,
    "clarification_question": "string" | null
}}
"""


# =============================================================================
# CHAT
# =============================================================================

def build_chat_system_prompt(user_context: Dict[str, Any]) -> str:
    """Build system prompt for chat with user context."""
    profile = user_context.get("profile", {})
    patterns = user_context.get("patterns", {})
    goals = user_context.get("goals", [])
    memory = user_context.get("memory", {})
    
    return f"""{FISCALLY_SOUL}

## User Context

PROFILE: {json.dumps(profile, indent=2) if profile else "New user"}

PATTERNS: {json.dumps(patterns, indent=2) if patterns else "No patterns yet"}

GOALS: {json.dumps(goals, indent=2) if goals else "No goals set"}

MEMORY: {json.dumps(memory, indent=2) if memory else "No memories"}

## Response Rules
1. Use specific numbers from their data
2. Keep responses under 100 words
3. Always use ₹ for currency
4. Be helpful, not preachy
"""


# =============================================================================
# WEEKLY INSIGHTS
# =============================================================================

def build_weekly_insights_prompt(
    user_context: Dict[str, Any],
    transactions: List[Dict[str, Any]],
    last_week_total: float = 0
) -> str:
    """Generate weekly spending insights."""
    this_week_total = sum(t.get('amount', 0) for t in transactions)
    
    # Category breakdown
    categories = {}
    for t in transactions:
        cat = t.get('category', 'other')
        categories[cat] = categories.get(cat, 0) + t.get('amount', 0)
    
    top_categories = sorted(categories.items(), key=lambda x: x[1], reverse=True)[:3]
    
    return f"""Generate a weekly spending summary.

## Data
- Total: ₹{this_week_total:,}
- Last week: ₹{last_week_total:,}
- Top categories: {', '.join(f'{cat}: ₹{amt:,}' for cat, amt in top_categories)}
- Transactions: {len(transactions)}

## Rules
- Lead with the key insight
- Use specific numbers
- One actionable tip
- Under 80 words
- Friendly, not preachy

Respond ONLY with valid JSON:
{{
    "headline": "short catchy line",
    "summary": "2-3 sentences",
    "tip": "one specific suggestion"
}}
"""


# =============================================================================
# MEMORY EXTRACTION (from chat)
# =============================================================================

def build_memory_extraction_prompt(message: str) -> str:
    """Extract facts worth remembering from user message."""
    return f"""Does this message contain facts to remember?

Message: "{message}"

## What to extract
- Financial goals ("saving for Europe trip")
- Preferences ("trying to reduce food delivery") 
- Important dates ("rent due on 5th")
- Life changes ("got a raise")

## What to ignore
- Questions
- Temporary states
- Complaints

Respond ONLY with valid JSON:
{{
    "has_fact": true/false,
    "fact": "fact to remember" | null,
    "category": "goal" | "preference" | "date" | "event" | null
}}
"""
