"""
Fiscally AI Prompts Library
===========================
All LLM prompts for the Fiscally expense tracking app.
"""

from typing import Dict, List, Any, Optional
import json

# Common currency symbol map used across prompts.
CURRENCY_SYMBOLS = {
    "INR": "₹",
    "USD": "$",
    "EUR": "€",
    "GBP": "£",
    "JPY": "¥",
    "AUD": "A$",
    "CAD": "C$",
    "SGD": "S$",
    "AED": "AED ",
}


def get_currency_symbol(currency_code: Optional[str]) -> str:
    """Return symbol/prefix for a currency code."""
    if not currency_code:
        return "₹"
    return CURRENCY_SYMBOLS.get(currency_code.upper(), f"{currency_code.upper()} ")


def get_user_currency_code(user_context: Optional[Dict[str, Any]]) -> str:
    """Resolve user currency from context with INR fallback."""
    if not user_context:
        return "INR"
    profile = user_context.get("profile", {}) or {}
    return (
        profile.get("identity", {}).get("currency")
        or profile.get("currency")
        or "INR"
    )


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
If someone spends [currency amount] on food delivery, don't shame them.
Note it. Show the pattern. Let them decide.

**Celebrate wins, don't just flag problems.**
"You spent 20% less this week" > "You overspent on dining"

**Be specific, not generic.**
Bad: "You should save more"
Good: "Skipping 3 delivery orders/week = [currency amount]/month saved"

**Predict, don't just report.**
"At this rate, you'll hit your goal in 4 months"

**Know when to shut up.**
Only interrupt for: anomalies, goal milestones, urgent alerts.

## Tone
- Casual, like a smart friend who's good with money
- Use specific numbers (more powerful than adjectives)
- Light humor okay, never about financial stress
- Never condescending or judgmental
- Use the user's local currency and locale formatting

## Boundaries
- Never give investment advice
- Never predict market movements  
- Never access data you weren't given
"""

# =============================================================================
# CATEGORIES & MERCHANT MAPPING
# =============================================================================

CATEGORIES = [
    "food",
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
    currency_code = get_user_currency_code(user_context)
    currency_symbol = get_currency_symbol(currency_code)
    
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
- Amount: {currency_symbol}{transaction.get('amount', 0)} ({currency_code})
- Merchant/Description: {transaction.get('merchant', 'Unknown')}
- Time: {transaction.get('timestamp', 'Unknown')}
{search_section}
## Categories
{', '.join(CATEGORIES)}

## Rules
1. If merchant is clearly identifiable (Swiggy, Amazon, etc.), use obvious category
2. Consider time of day (late night food = likely delivery)
3. Consider amount patterns in the local market for this user
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
Focus on location-relevant results when location cues exist.

Respond with JSON: {{"search_query": "query string", "search_needed": true/false}}

If the merchant name is clearly a category (like "ATM", "Petrol", "Grocery"), set search_needed: false.
"""


# =============================================================================
# ANOMALY DETECTION
# =============================================================================

def build_anomaly_detection_prompt(
    transaction: Dict[str, Any],
    user_stats: Dict[str, Any],
    user_context: Optional[Dict[str, Any]] = None,
) -> str:
    """Detect if transaction is unusual for this user."""
    currency_code = get_user_currency_code(user_context)
    currency_symbol = get_currency_symbol(currency_code)
    return f"""Is this transaction unusual?

## Transaction
- Amount: {currency_symbol}{transaction.get('amount', 0)} ({currency_code})
- Category: {transaction.get('category', 'unknown')}
- Merchant: {transaction.get('merchant', 'Unknown')}

## User's History
- Average for {transaction.get('category', 'this category')}: {currency_symbol}{user_stats.get('category_avg', 0)}
- Max for this category: {currency_symbol}{user_stats.get('category_max', 0)}
- Budget for this category: {currency_symbol}{user_stats.get('category_budget', 'Not set')}

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
    currency_code = get_user_currency_code(user_context)
    
    return f"""Parse this voice note into a transaction.

Voice: "{transcript}"
Primary currency: {currency_code}

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
    financial = profile.get("financial", {}) if isinstance(profile, dict) else {}
    patterns = user_context.get("patterns", {})
    goals = user_context.get("goals", [])
    memory = user_context.get("memory", {})
    currency_code = get_user_currency_code(user_context)
    currency_symbol = get_currency_symbol(currency_code)
    
    # Format goals with target details for better AI recommendations
    goals_section = "No goals set"
    if goals:
        goal_lines = []
        for g in goals:
            goal_id = g.get("id", "unknown")
            target_amount = g.get("target_amount", "Not set")
            target_date = g.get("target_date", "No deadline")
            monthly_needed = g.get("monthly_savings_needed", "")
            
            line = f"- {goal_id}: Target {currency_symbol}{target_amount}"
            if target_date and target_date != "No deadline":
                line += f" by {target_date}"
            if monthly_needed:
                line += f" ({currency_symbol}{monthly_needed}/month needed)"
            goal_lines.append(line)
        goals_section = "\n".join(goal_lines)
    
    return f"""{FISCALLY_SOUL}

## User Context

PROFILE: {json.dumps(profile, indent=2) if profile else "New user"}

FINANCIAL SNAPSHOT: {json.dumps(financial, indent=2) if financial else "Not set"}

PATTERNS: {json.dumps(patterns, indent=2) if patterns else "No patterns yet"}

GOALS:
{goals_section}

MEMORY: {json.dumps(memory, indent=2) if memory else "No memories"}

## Response Rules
1. Use specific numbers from their data
2. Keep responses under 100 words
3. Always use {currency_symbol} for currency formatting unless user explicitly asks for another
4. Be helpful, not preachy
5. Use Markdown formatting (bold, bullet points) for readability
6. Do NOT use JSON or YAML formatting in the response text
7. When discussing goals, reference specific target amounts and dates
8. Proactively suggest budget adjustments if spending patterns affect goal timelines
9. If user asks about income/salary/budget, use FINANCIAL SNAPSHOT values exactly (do not infer)
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
    currency_code = get_user_currency_code(user_context)
    currency_symbol = get_currency_symbol(currency_code)
    this_week_total = sum(t.get('amount', 0) for t in transactions)
    
    # Category breakdown
    categories = {}
    for t in transactions:
        cat = t.get('category', 'other')
        categories[cat] = categories.get(cat, 0) + t.get('amount', 0)
    
    top_categories = sorted(categories.items(), key=lambda x: x[1], reverse=True)[:3]
    
    return f"""Generate a weekly spending summary.

## Data
- Total: {currency_symbol}{this_week_total:,}
- Last week: {currency_symbol}{last_week_total:,}
- Top categories: {', '.join(f'{cat}: {currency_symbol}{amt:,}' for cat, amt in top_categories)}
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
# NEED/WANT/LUXURY CLASSIFICATION
# =============================================================================

def build_spending_classification_prompt(
    transaction: Dict[str, Any],
    user_context: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Classify a transaction as need/want/luxury using user context.
    The classification is relative to the user's profile and goals.
    """
    user_context = user_context or {}
    profile = user_context.get("profile", {}) or {}
    goals = user_context.get("goals", []) or []
    patterns = user_context.get("patterns", {}) or {}
    personality = profile.get("financial_personality", {}) if isinstance(profile, dict) else {}
    location = profile.get("location", {}) if isinstance(profile, dict) else {}
    preferences = profile.get("preferences", {}) if isinstance(profile, dict) else {}
    financial = profile.get("financial", {}) if isinstance(profile, dict) else {}
    currency_code = get_user_currency_code(user_context)
    currency_symbol = get_currency_symbol(currency_code)

    return f"""Classify this expense as exactly one: need, want, or luxury.

## Transaction
- Amount: {currency_symbol}{transaction.get('amount', 0)} ({currency_code})
- Merchant: {transaction.get('merchant', 'Unknown')}
- Category: {transaction.get('category', 'other')}
- Time: {transaction.get('timestamp', 'Unknown')}

## User Context
- Profile: {json.dumps(profile, ensure_ascii=True)}
- Goals: {json.dumps(goals, ensure_ascii=True)}
- Patterns: {json.dumps(patterns, ensure_ascii=True)}
- Financial personality: {json.dumps(personality, ensure_ascii=True)}
- Location context: {json.dumps(location, ensure_ascii=True)}
- Preferences: {json.dumps(preferences, ensure_ascii=True)}
- Financial snapshot: {json.dumps(financial, ensure_ascii=True)}

## Classification Rules
- Need: essential living, health, work-critical, unavoidable obligations
- Want: improves comfort/convenience, discretionary but reasonable
- Luxury: highly discretionary/premium/indulgent spending
- Base this on this specific user's personality, obligations, current goals, and pattern history
- Expensive does not automatically mean luxury
- If category is bills/groceries/health/education/transport, default to need unless clearly premium/discretionary
- If spending pattern shows recurring discretionary overspend in this area, shift toward luxury
- If active goals are at risk, classify borderline discretionary items more strictly
- Consider local cost context from location data (what is normal in that locality)
- If monthly budget utilization is high relative to monthly salary, classify borderline items more strictly

Respond ONLY with valid JSON:
{{
  "spend_class": "need|want|luxury",
  "confidence": 0.0-1.0,
  "reason": "short specific reason"
}}
"""


# =============================================================================
# RECEIPT PARSING
# =============================================================================

def build_receipt_text_parsing_prompt(
    receipt_text: str,
    user_context: Optional[Dict[str, Any]] = None,
) -> str:
    """Parse extracted receipt/invoice text into a transaction."""
    user_context = user_context or {}
    currency_code = get_user_currency_code(user_context)

    return f"""Parse this receipt/invoice text into one transaction.

Primary user currency: {currency_code}

Receipt text:
{receipt_text[:12000]}

Rules:
1. Detect final payable amount (total/grand total/net payable)
2. Detect merchant/vendor name
3. Infer transaction category
4. Infer transaction date if present
5. Return confidence and whether manual review is needed

Respond ONLY with valid JSON:
{{
  "amount": number,
  "currency": "ISO currency code",
  "merchant": "string",
  "category": "string",
  "transaction_at": "ISO datetime or null",
  "confidence": 0.0-1.0,
  "needs_review": true/false,
  "reason": "short reason",
  "line_items": [{{"name": "string", "amount": number}}]
}}
"""


def build_receipt_image_parsing_prompt(user_context: Optional[Dict[str, Any]] = None) -> str:
    """Instructions for parsing receipt image content via multimodal model."""
    user_context = user_context or {}
    currency_code = get_user_currency_code(user_context)

    return f"""You are parsing an image of a receipt or invoice.
Extract a single transaction object from it.

Primary user currency: {currency_code}

Rules:
1. Find final payable amount (not subtotal/tax unless only total available)
2. Find merchant name
3. Infer category from merchant/items
4. Extract transaction date if visible
5. Keep output strict JSON and no extra text

JSON schema:
{{
  "amount": number,
  "currency": "ISO currency code",
  "merchant": "string",
  "category": "string",
  "transaction_at": "ISO datetime or null",
  "confidence": 0.0-1.0,
  "needs_review": true/false,
  "reason": "short reason",
  "line_items": [{{"name": "string", "amount": number}}]
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
