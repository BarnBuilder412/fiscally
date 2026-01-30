# Fiscally MVP Specification
**Version:** 0.1.0  
**Last Updated:** January 29, 2026  
**Status:** Hackathon MVP

---

# PART 1: AI, Context Management & Agentic Capabilities

## 1.1 Context Architecture

### Philosophy
Inspired by Moltbot's approach: The app maintains a "living" understanding of each user through structured context files that the AI can both read and update.

### Context Structure (Stored in Cloud)

```
User Context (per user)
├── PROFILE          # Who the user is
├── PATTERNS         # Learned spending behavior  
├── INSIGHTS         # AI-generated observations
├── GOALS            # Financial targets
└── MEMORY           # Conversation history & facts
```

### 1.1.1 PROFILE Context

```json
{
  "identity": {
    "name": "Kaushal",
    "joined": "2026-01-29",
    "currency": "INR",
    "income_range": "75k-1L",
    "payday": 1
  },
  "preferences": {
    "notification_style": "actionable",
    "digest_day": "sunday",
    "voice_enabled": true,
    "language": "en"
  },
  "financial_personality": {
    "type": "mindful_spender",
    "confidence": 0.85,
    "detected_at": "2026-02-01"
  }
}
```

### 1.1.2 PATTERNS Context (AI-Updated)

```json
{
  "spending_patterns": {
    "high_spend_window": {
      "days": ["friday", "saturday"],
      "hours": [18, 23],
      "multiplier": 2.3
    },
    "category_distribution": {
      "food_delivery": 0.35,
      "shopping": 0.25,
      "transport": 0.15,
      "entertainment": 0.10,
      "bills": 0.15
    },
    "triggers": ["late_night", "weekend", "post_payday"]
  },
  "behavioral_flags": {
    "payday_spike": true,
    "late_night_ordering": true,
    "subscription_creep": false
  },
  "anomaly_thresholds": {
    "unusual_amount": 5000,
    "unusual_category_spike": 2.0
  }
}
```

### 1.1.3 INSIGHTS Context

```json
{
  "active_insights": [
    {
      "id": "ins_001",
      "type": "pattern",
      "message": "You spend 3x more on weekends",
      "confidence": 0.92,
      "actionable": true,
      "created_at": "2026-01-28"
    },
    {
      "id": "ins_002", 
      "type": "prediction",
      "message": "At current rate, you'll hit emergency fund goal by April",
      "confidence": 0.78,
      "created_at": "2026-01-29"
    }
  ],
  "delivered_insights": [...],
  "dismissed_insights": [...]
}
```

### 1.1.4 MEMORY Context

```json
{
  "facts": [
    {"text": "Saving for Europe trip in December 2026", "added": "2026-01-20"},
    {"text": "Trying to reduce Swiggy orders", "added": "2026-01-25"},
    {"text": "HDFC credit card bill due on 15th", "added": "2026-01-22"}
  ],
  "conversation_summary": "User is focused on building emergency fund. Has mentioned stress eating tendency. Prefers direct, non-preachy advice.",
  "last_updated": "2026-01-29"
}
```

---

## 1.2 AI Personality (SOUL)

### System Prompt Template

```markdown
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
"Warning: On track to exceed food budget by ₹5,000"

**Know when to shut up.**
Don't notify for every transaction.
Only interrupt for: anomalies, goal milestones, urgent alerts.

## Tone
- Casual, like a smart friend who's good with money
- Use specific numbers (more powerful than adjectives)
- Light humor okay, never about financial stress
- Never condescending or judgmental

## Boundaries
- Never give investment advice
- Never predict market movements  
- Never access data you weren't given
- Always explain your reasoning when asked

## Context Usage
You have access to:
- User's PROFILE (who they are)
- User's PATTERNS (learned behavior)
- User's INSIGHTS (previous observations)
- User's GOALS (what they're working toward)
- User's MEMORY (facts they've shared)
- Recent transactions (last 30 days)

Update MEMORY when user shares new facts.
Update PATTERNS when you detect new behaviors.
Generate INSIGHTS proactively based on data.
```

---

## 1.3 Agentic Capabilities

### 1.3.1 Transaction Processing Agent

**Trigger:** New transaction detected (SMS/manual/notification)

```python
async def process_transaction(transaction: Transaction, user_context: UserContext):
    """
    Agent workflow for each new transaction.
    """
    # Step 1: Categorize
    category = await categorize_transaction(transaction, user_context.patterns)
    
    # Step 2: Check for anomalies
    anomalies = detect_anomalies(transaction, user_context)
    
    # Step 3: Update patterns if needed
    if should_update_patterns(transaction, user_context):
        await update_user_patterns(user_context, transaction)
    
    # Step 4: Check goal impact
    goal_impact = calculate_goal_impact(transaction, user_context.goals)
    
    # Step 5: Generate notification
    notification = generate_smart_notification(
        transaction, 
        anomalies, 
        goal_impact,
        user_context
    )
    
    return ProcessedTransaction(
        transaction=transaction,
        category=category,
        anomalies=anomalies,
        notification=notification
    )
```

### 1.3.2 Insight Generation Agent

**Trigger:** Weekly cron job (Sunday 9am) + On-demand

```python
async def generate_weekly_insights(user_id: str):
    """
    Analyze user's week and generate insights.
    """
    # Load context
    context = await load_user_context(user_id)
    transactions = await get_transactions(user_id, days=7)
    
    # Build analysis prompt
    prompt = f"""
    Analyze this user's spending for the past week.
    
    USER PROFILE:
    {context.profile}
    
    KNOWN PATTERNS:
    {context.patterns}
    
    ACTIVE GOALS:
    {context.goals}
    
    THIS WEEK'S TRANSACTIONS:
    {format_transactions(transactions)}
    
    Generate:
    1. One key observation (what happened)
    2. One pattern update (if any new pattern detected)
    3. One actionable suggestion
    4. Goal progress update
    
    Be specific with numbers. Keep total response under 100 words.
    """
    
    insights = await llm.generate(prompt)
    
    # Parse and store insights
    await store_insights(user_id, insights)
    
    # Send weekly digest notification
    await send_weekly_digest(user_id, insights)
```

### 1.3.3 Chat Agent (Conversational Queries)

**Trigger:** User asks a question via chat

```python
async def handle_chat(user_id: str, message: str):
    """
    Handle natural language queries about finances.
    """
    context = await load_user_context(user_id)
    
    system_prompt = build_system_prompt(context)  # Includes SOUL + context
    
    # Determine if we need to query data
    needs_data = await classify_intent(message)
    
    if needs_data.query_transactions:
        transactions = await query_transactions(
            user_id, 
            filters=needs_data.filters
        )
        context_addition = f"\n\nRELEVANT TRANSACTIONS:\n{format_transactions(transactions)}"
    else:
        context_addition = ""
    
    response = await llm.chat(
        system=system_prompt + context_addition,
        user=message,
        tools=[
            update_memory_tool,      # "Remember that I'm saving for X"
            set_goal_tool,           # "I want to save 50k by March"
            query_transactions_tool, # "How much did I spend on food?"
        ]
    )
    
    return response
```

### 1.3.4 Proactive Alert Agent

**Trigger:** Real-time transaction analysis

```python
async def check_proactive_alerts(user_id: str, transaction: Transaction):
    """
    Check if transaction warrants a proactive alert.
    """
    context = await load_user_context(user_id)
    
    alerts = []
    
    # Check 1: Unusual amount
    if transaction.amount > context.patterns.anomaly_thresholds.unusual_amount:
        alerts.append({
            "type": "unusual_amount",
            "message": f"₹{transaction.amount} at {transaction.merchant} — that's higher than usual"
        })
    
    # Check 2: Budget breach
    category_spent = await get_category_total(user_id, transaction.category, month=current_month)
    budget = context.profile.budgets.get(transaction.category)
    if budget and category_spent > budget * 0.9:
        alerts.append({
            "type": "budget_warning",
            "message": f"You've used 90% of your {transaction.category} budget"
        })
    
    # Check 3: Pattern violation (e.g., late night order when trying to stop)
    if is_pattern_violation(transaction, context):
        alerts.append({
            "type": "pattern_alert",
            "message": f"Late night {transaction.merchant} order — you mentioned trying to cut these"
        })
    
    # Check 4: Goal milestone
    goal_progress = check_goal_milestone(user_id)
    if goal_progress:
        alerts.append({
            "type": "goal_milestone",
            "message": goal_progress.message
        })
    
    return alerts
```

---

## 1.4 Context Update Flows

### When User Adds Transaction Manually
```
Transaction Added
       ↓
Categorize (LLM if ambiguous)
       ↓
Store in DB
       ↓
Check anomalies
       ↓
Update PATTERNS (if significant)
       ↓
Send notification (if warranted)
```

### When User Chats
```
User Message
       ↓
Load full context (PROFILE + PATTERNS + INSIGHTS + GOALS + MEMORY)
       ↓
Inject into system prompt
       ↓
LLM generates response
       ↓
If LLM calls update_memory → persist to MEMORY
       ↓
If LLM detects pattern → persist to PATTERNS
       ↓
Return response to user
```

### Weekly Digest Flow
```
Sunday 9am Cron
       ↓
Load user context + last 7 days transactions
       ↓
Generate insights via LLM
       ↓
Update INSIGHTS in DB
       ↓
Compose digest notification
       ↓
Send push notification
```

---

## 1.5 LLM Prompts Library

### Transaction Categorization Prompt
```
Categorize this transaction into exactly one category.

Transaction: {amount} at {merchant}
Time: {timestamp}
User's common categories: {user_categories}

Categories: food_delivery, restaurant, groceries, transport, shopping, 
            entertainment, bills, subscriptions, health, education, other

Return JSON: {"category": "...", "confidence": 0.0-1.0}
```

### Anomaly Detection Prompt
```
Is this transaction unusual for this user?

Transaction: ₹{amount} at {merchant} ({category})
User's average for {category}: ₹{avg_amount}
User's typical {category} merchants: {typical_merchants}
Time: {timestamp}
User's typical transaction times: {typical_times}

Return JSON: {
  "is_anomaly": true/false,
  "reason": "..." or null,
  "severity": "low/medium/high" or null
}
```

### Weekly Summary Prompt
```
Generate a friendly weekly spending summary.

User: {name}
This week's spending: ₹{total}
Last week's spending: ₹{last_week_total}
Top categories: {categories_breakdown}
Active goal: {goal_name} - {goal_progress}% complete

Rules:
- Start with the most important insight
- Use specific numbers
- End with one actionable tip
- Keep under 80 words
- Tone: friendly, not preachy
```

### Voice Input Parsing Prompt
```
Parse this voice note into a transaction.

Voice transcript: "{transcript}"
Current time: {timestamp}
User's common merchants: {common_merchants}
User's common categories: {common_categories}

Return JSON: {
  "amount": number,
  "merchant": "string" or null,
  "category": "string",
  "confidence": 0.0-1.0,
  "needs_clarification": true/false,
  "clarification_question": "string" or null
}

Examples:
- "spent 200 on coffee" → {"amount": 200, "category": "food", "merchant": null}
- "450 swiggy lunch" → {"amount": 450, "category": "food_delivery", "merchant": "Swiggy"}
- "auto 80 rupees" → {"amount": 80, "category": "transport", "merchant": null}
```

---

# PART 2: UI/UX Specification

## 2.1 Design Principles

1. **< 3 taps to add expense** - Core action must be instant
2. **Works offline** - Never block user due to network
3. **Big, friendly buttons** - Accessible to all ages
4. **Voice-first option** - For non-typers
5. **Actionable notifications** - Complete tasks without opening app
6. **Widget for instant access** - Home screen quick-add
7. **Show the power immediately** - Demo AI capabilities from day 1

---

## 2.2 Core Screens

### 2.2.1 Home Dashboard
```
┌─────────────────────────────────────────┐
│ ≡  Fiscally                    🔔  👤   │
├─────────────────────────────────────────┤
│                                         │
│        January 2026                     │
│                                         │
│     ┌─────────────────────────┐         │
│     │    ₹ 32,450            │         │
│     │    spent this month     │         │
│     │    ━━━━━━━━━━░░░░ 65%   │         │
│     │    of ₹50k budget       │         │
│     └─────────────────────────┘         │
│                                         │
│  📊 Top Categories                      │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │ 🍕     │ │ 🛒     │ │ 🚗     │      │
│  │ Food   │ │ Shop   │ │ Travel │      │
│  │ ₹12.4k │ │ ₹8.2k  │ │ ₹4.1k  │      │
│  └────────┘ └────────┘ └────────┘      │
│                                         │
│  💡 Insight                             │
│  ┌─────────────────────────────────┐   │
│  │ You've spent 20% less on food    │   │
│  │ delivery this week! Keep it up 🎉│   │
│  └─────────────────────────────────┘   │
│                                         │
│  Recent Transactions                    │
│  ┌─────────────────────────────────┐   │
│  │ 🍕 Swiggy          -₹450        │   │
│  │    Today, 8:30 PM   Food        │   │
│  ├─────────────────────────────────┤   │
│  │ 🚗 Uber            -₹180        │   │
│  │    Today, 6:15 PM   Transport   │   │
│  ├─────────────────────────────────┤   │
│  │ ☕ Starbucks       -₹350        │   │
│  │    Today, 10:00 AM  Food        │   │
│  └─────────────────────────────────┘   │
│                                         │
│          [ See All Transactions ]       │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│    ┌─────────────────────────────┐     │
│    │     ＋  Add Expense         │     │
│    │         (hold for voice)    │     │
│    └─────────────────────────────┘     │
│                                         │
│  🏠    📊    💬    ⚙️                   │
│  Home  Stats  Chat  Settings            │
└─────────────────────────────────────────┘
```

### 2.2.2 Quick Add Modal
```
┌─────────────────────────────────────────┐
│                              ✕ Close    │
│                                         │
│              Add Expense                │
│                                         │
│     ┌─────────────────────────┐         │
│     │        ₹ |              │         │
│     │     (enter amount)      │         │
│     └─────────────────────────┘         │
│                                         │
│  Category:                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ 🍕  │ │ 🚗  │ │ 🛒  │ │ 📱  │       │
│  │Food │ │Trans│ │Shop │ │Bills│       │
│  └─────┘ └─────┘ └─────┘ └─────┘       │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ 🎮  │ │ 💊  │ │ 📚  │ │ ➕  │       │
│  │Fun  │ │Health│ │Edu │ │Other│       │
│  └─────┘ └─────┘ └─────┘ └─────┘       │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Add note (optional)...          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │           💾 Save               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ─────────── or ───────────            │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     🎤 Hold to speak            │   │
│  │     "spent 200 on coffee"       │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### 2.2.3 Voice Input Flow
```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│           ┌───────────────┐             │
│           │               │             │
│           │      🎤       │             │
│           │   Recording   │             │
│           │               │             │
│           │  ○ ○ ○ ○ ○    │             │
│           │  (waveform)   │             │
│           └───────────────┘             │
│                                         │
│         "spent 450 on swiggy"           │
│                                         │
│              [ Release to send ]        │
│                                         │
└─────────────────────────────────────────┘

         ↓ After processing ↓

┌─────────────────────────────────────────┐
│                                         │
│           ✓ Got it!                     │
│                                         │
│     ┌─────────────────────────┐         │
│     │  ₹450                   │         │
│     │  Swiggy                 │         │
│     │  🍕 Food Delivery       │         │
│     └─────────────────────────┘         │
│                                         │
│     [ ✓ Looks good ]  [ ✏️ Edit ]       │
│                                         │
└─────────────────────────────────────────┘
```

### 2.2.4 Chat Interface
```
┌─────────────────────────────────────────┐
│  ←  Chat with Fiscally                  │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Try asking:                      │   │
│  │ • "How much did I spend on food?"│   │
│  │ • "What's my biggest expense?"   │   │
│  │ • "Am I on track for my goal?"   │   │
│  └─────────────────────────────────┘   │
│                                         │
│      ┌──────────────────────────┐      │
│      │ How much did I spend     │      │
│      │ on Swiggy this month?    │  You │
│      └──────────────────────────┘      │
│                                         │
│  ┌──────────────────────────┐          │
│  │ You've spent ₹4,850 on   │          │
│  │ Swiggy this month across │          │
│  │ 12 orders.               │          │
│  │                          │ Fiscally │
│  │ That's ₹400 per order    │          │
│  │ avg, and 15% of your     │          │
│  │ total spending.          │          │
│  │                          │          │
│  │ 💡 Your late-night       │          │
│  │ orders (after 10pm)      │          │
│  │ average ₹520 vs ₹340     │          │
│  │ during the day.          │          │
│  └──────────────────────────┘          │
│                                         │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────┐    │
│ │ Ask anything about your money...│ 🎤 │
│ └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## 2.3 Actionable Notifications

### 2.3.1 New Transaction Detected (SMS)
```
┌─────────────────────────────────────────┐
│ 📱 Fiscally                        now  │
├─────────────────────────────────────────┤
│                                         │
│ 💳 New expense detected                 │
│                                         │
│ ₹450 at SWIGGY                          │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🍕 Food  │ 🛒 Shop │ ✏️ Edit       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Tap a category or swipe to dismiss      │
│                                         │
└─────────────────────────────────────────┘
```

**Behavior:**
- User taps category → Transaction saved with that category
- User taps "Edit" → Opens app to quick-add screen with pre-filled data
- User swipes away → Transaction saved with auto-detected category
- User ignores → Transaction saved with auto-detected category after 5 min

### 2.3.2 Expanded Notification (Long Press)
```
┌─────────────────────────────────────────┐
│ 📱 Fiscally                        now  │
├─────────────────────────────────────────┤
│                                         │
│ 💳 New expense detected                 │
│                                         │
│ ₹450 at SWIGGY                          │
│ Jan 29, 8:30 PM                         │
│                                         │
│ Category:                               │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│ │ 🍕  │ │ 🛒  │ │ 🚗  │ │ ➕  │       │
│ │Food │ │Shop │ │Trans│ │Other│       │
│ └─────┘ └─────┘ └─────┘ └─────┘       │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Add note...                         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│       [ Save ]         [ Open App ]     │
│                                         │
└─────────────────────────────────────────┘
```

### 2.3.3 Insight Notification
```
┌─────────────────────────────────────────┐
│ 📱 Fiscally                     2h ago  │
├─────────────────────────────────────────┤
│                                         │
│ 💡 Weekly Insight                       │
│                                         │
│ You spent 20% less this week! 🎉        │
│ Food delivery down by ₹1,200.           │
│                                         │
│        [ View Details ]                 │
│                                         │
└─────────────────────────────────────────┘
```

### 2.3.4 Alert Notification
```
┌─────────────────────────────────────────┐
│ 📱 Fiscally                        now  │
├─────────────────────────────────────────┤
│                                         │
│ ⚠️ Budget Alert                         │
│                                         │
│ You've used 90% of your Food budget     │
│ ₹13,500 of ₹15,000                      │
│ 3 days left in January                  │
│                                         │
│        [ See Breakdown ]                │
│                                         │
└─────────────────────────────────────────┘
```

---

## 2.4 Home Screen Widget

### 2.4.1 Small Widget (2x2)
```
┌─────────────────────┐
│ Fiscally      ₹32k  │
│ this month          │
│                     │
│    [ 🎤 + Add ]     │
└─────────────────────┘
```

**Tap behavior:** Opens quick-add modal
**Long press on mic:** Starts voice recording directly

### 2.4.2 Medium Widget (4x2)
```
┌─────────────────────────────────────────┐
│ Fiscally                                │
│                                         │
│ ₹32,450 spent        ━━━━━━━░░░ 65%    │
│ this month           of ₹50k budget     │
│                                         │
│ 🍕 ₹12.4k  🛒 ₹8.2k  🚗 ₹4.1k          │
│                                         │
│          [ 🎤 Tap to add ]              │
└─────────────────────────────────────────┘
```

### 2.4.3 Large Widget (4x4)
```
┌─────────────────────────────────────────┐
│ Fiscally                        January │
├─────────────────────────────────────────┤
│                                         │
│     ₹32,450                             │
│     ━━━━━━━━━━━━░░░░░░ 65%             │
│     of ₹50,000 budget                   │
│                                         │
│ ┌────────┐ ┌────────┐ ┌────────┐       │
│ │ 🍕     │ │ 🛒     │ │ 🚗     │       │
│ │ ₹12.4k │ │ ₹8.2k  │ │ ₹4.1k  │       │
│ └────────┘ └────────┘ └────────┘       │
│                                         │
│ Recent:                                 │
│ • Swiggy -₹450 (8:30 PM)               │
│ • Uber -₹180 (6:15 PM)                 │
│                                         │
├─────────────────────────────────────────┤
│          [ 🎤 Hold to add ]             │
└─────────────────────────────────────────┘
```

**Widget Interactions:**
- Tap anywhere: Open app
- Tap "+ Add": Open quick-add modal
- Long press mic: Voice input (records, processes, shows confirmation toast)
- Tap category: Open app filtered to that category

---

## 2.5 Onboarding Flow

### Screen 1: Welcome
```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│              💰                         │
│                                         │
│         Welcome to                      │
│         Fiscally                        │
│                                         │
│   Your AI-powered expense companion     │
│                                         │
│                                         │
│                                         │
│     ┌─────────────────────────────┐    │
│     │       Get Started           │    │
│     └─────────────────────────────┘    │
│                                         │
│         Already have account?           │
│              Sign In                    │
│                                         │
└─────────────────────────────────────────┘
```

### Screen 2: Quick Setup (1 of 2)
```
┌─────────────────────────────────────────┐
│                                    Skip │
│                                         │
│    What's your monthly income?          │
│    (helps us give better insights)      │
│                                         │
│    ┌─────────────────────────────┐     │
│    │        < ₹30,000            │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │       ₹30k - ₹75k           │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │       ₹75k - ₹1.5L          │     │  
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │         > ₹1.5L             │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │    Prefer not to say        │     │
│    └─────────────────────────────┘     │
│                                         │
│    ○ ● ○                               │
└─────────────────────────────────────────┘
```

### Screen 3: SMS Permission
```
┌─────────────────────────────────────────┐
│                                    Skip │
│                                         │
│              📱                         │
│                                         │
│    Auto-track your expenses?            │
│                                         │
│    We can read your bank SMS alerts     │
│    to automatically log transactions.   │
│                                         │
│    ┌─────────────────────────────────┐ │
│    │ ✓ Only reads transaction SMS    │ │
│    │ ✓ Never reads personal messages │ │
│    │ ✓ Processed on-device           │ │
│    │ ✓ You can disable anytime       │ │
│    └─────────────────────────────────┘ │
│                                         │
│    ┌─────────────────────────────────┐ │
│    │      Enable Auto-Tracking       │ │
│    └─────────────────────────────────┘ │
│                                         │
│          I'll add manually              │
│                                         │
│    ○ ○ ●                               │
└─────────────────────────────────────────┘
```

### Screen 4: Done
```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│              ✨                         │
│                                         │
│         You're all set!                 │
│                                         │
│    Add your first expense to start      │
│    or we'll capture it automatically    │
│                                         │
│                                         │
│    ┌─────────────────────────────────┐ │
│    │        + Add First Expense      │ │
│    └─────────────────────────────────┘ │
│                                         │
│    ┌─────────────────────────────────┐ │
│    │        🎤 Or speak it           │ │
│    └─────────────────────────────────┘ │
│                                         │
│             Go to Dashboard →           │
│                                         │
└─────────────────────────────────────────┘
```

---

## 2.6 UX Priorities (Ordered)

1. **< 3 taps to add expense** - Core action must be instant
2. **Actionable notifications** - Complete tasks without opening app  
3. **Widget for instant access** - Home screen voice quick-add
4. **Works offline** - Never block user due to network
5. **Voice-first option** - For non-typers
6. **Big, friendly buttons** - Accessible to all ages
7. **Show AI power immediately** - Smart insights from first transaction

---

# PART 3: Technical Architecture

## 3.1 Data Storage

- **Cloud Primary:** PostgreSQL for all user data
- **Local Cache:** SQLite for offline access + pending sync queue
- **Context Storage:** JSONB columns for flexible AI context

## 3.2 API Stack

- **Backend:** FastAPI (Python)
- **Mobile:** React Native (Expo)
- **AI:** OpenAI GPT-4o-mini for LLM tasks
- **Push Notifications:** Firebase Cloud Messaging
- **Observability:** Opik for LLM evaluation

## 3.3 SMS Tracking (Android Only)

### Approach: On-Device Parsing
- Request `READ_SMS` + `RECEIVE_SMS` permissions
- Filter for bank sender IDs (HDFCBK, SBIINB, ICICIB, etc.)
- Parse transaction details on-device
- Send only structured data to server (never raw SMS)

### Bank SMS Parser
```typescript
// Patterns for Indian bank SMS
const AMOUNT_PATTERNS = [
  /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
  /debited for (?:Rs\.?|INR)?\s*([\d,]+(?:\.\d{2})?)/i,
];

const MERCHANT_PATTERNS = [
  /(?:at|to|VPA)\s+([A-Za-z][A-Za-z0-9\s]+?)(?:\.|,|$)/i,
  /\(([A-Z][A-Za-z0-9\s]+?)\)/,
];
```

## 3.4 Opik Integration

### Tracked Operations
- Transaction categorization
- Voice input parsing
- Chat responses
- Insight generation

### Custom Metrics
- `categorization_accuracy` - % correct categories
- `insight_specificity` - Contains numbers/percentages
- `response_helpfulness` - LLM-judged quality

---

# PART 4: Development Plan

## 4.1 Team Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  PERSON A: Mobile App (React Native / Expo)                     │
│  • All screens & UI                                              │
│  • SMS reading & parsing                                         │
│  • Notifications (actionable)                                    │
│  • Widget                                                        │
│  • Voice input                                                   │
│  • Local storage & offline                                       │
├─────────────────────────────────────────────────────────────────┤
│  PERSON B: Backend + AI (FastAPI + LLM)                         │
│  • API endpoints                                                 │
│  • Database schema                                               │
│  • LLM integration (categorization, insights, chat)              │
│  • Opik evaluation                                               │
│  • Context management                                            │
│  • Push notification service                                     │
└─────────────────────────────────────────────────────────────────┘
```

## 4.2 Development Phases

### PHASE 1: Foundation
**Goal:** Both can work independently

| Person A (Mobile) | Person B (Backend) |
|-------------------|--------------------|
| Setup Expo project | Setup FastAPI project |
| Navigation structure (4 tabs) | PostgreSQL + schema |
| Basic UI components | API structure |
| Auth screens | Auth endpoints |
| API client setup | JWT implementation |

**Sync Point:** User can sign up, login, see empty dashboard

---

### PHASE 2: Core Transaction Flow
**Goal:** User can add and see expenses

| Person A (Mobile) | Person B (Backend) |
|-------------------|--------------------|
| Home dashboard UI | POST /transactions |
| Quick-add modal | GET /transactions |
| Transaction list | LLM categorization |
| Category selection | Opik tracking setup |
| Voice input (record + send) | Voice transcript parser |

**Sync Point:** Manual expense add works end-to-end

---

### PHASE 3: SMS Auto-Tracking
**Goal:** Automatic expense capture

| Person A (Mobile) | Person B (Backend) |
|-------------------|--------------------|
| SMS permission flow | Improve categorization |
| SMS BroadcastReceiver | Merchant normalization |
| Bank SMS parser | Anomaly detection |
| Background service | Pattern detection |
| FCM integration | FCM push service |
| Actionable notification | |

**Sync Point:** Bank SMS triggers notification, user categorizes

---

### PHASE 4: AI Chat + Insights
**Goal:** "Talk to your money"

| Person A (Mobile) | Person B (Backend) |
|-------------------|--------------------|
| Chat screen UI | POST /chat endpoint |
| Message bubbles | Context loading |
| Typing indicator | LLM chat + tools |
| Suggested questions | GET /insights |
| Insights card on home | Weekly insight cron |
| | Opik evaluation metrics |

**Sync Point:** User can ask "How much on food?" and get answer

---

### PHASE 5: Widget + Polish
**Goal:** Demo-ready

| Person A (Mobile) | Person B (Backend) |
|-------------------|--------------------|
| Home screen widget | Performance optimization |
| Widget voice quick-add | Opik dashboard |
| Expanded notifications | Pre-populate demo data |
| Offline mode + sync | Error handling |
| UI polish & animations | Rate limiting |

**Sync Point:** Full flow works smoothly

---

### PHASE 6: Demo Prep
**Goal:** Pitch-ready

| Both Together |
|---------------|
| Create demo account with realistic data |
| Test full flow multiple times |
| Record backup demo video |
| Prepare pitch script |
| Setup Opik dashboard for judges |
| Feature freeze - bug fixes only |

---

## 4.3 API Contract

### Authentication
```
POST /api/v1/auth/signup    { email, password }
POST /api/v1/auth/login     { email, password } → { access_token }
POST /api/v1/auth/refresh   { refresh_token } → { access_token }
```

### Profile
```
GET  /api/v1/profile        → { user profile + context }
PATCH /api/v1/profile       { updates }
```

### Transactions
```
GET  /api/v1/transactions   ?limit=50&offset=0&category=food
POST /api/v1/transactions   { amount, merchant?, category?, note?, source }
POST /api/v1/transactions/voice  { audio_base64 } → { parsed transaction }
```

### Chat
```
POST /api/v1/chat           { message } → { response, insights? }
```

### Insights
```
GET  /api/v1/insights       → { weekly_summary, patterns, alerts }
```

---

# PART 5: Detailed Wireframes

## 5.1 App Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        APP FLOW                                  │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────┐     ┌──────────┐
  │  Splash  │ ──► │ Onboard  │ ──► │   Home   │
  └──────────┘     └──────────┘     └────┬─────┘
                                         │
        ┌────────────────────────────────┼────────────────────────┐
        │                                │                        │
        ▼                                ▼                        ▼
  ┌──────────┐                    ┌──────────┐              ┌──────────┐
  │   Add    │                    │   Chat   │              │ Settings │
  │ Expense  │                    │          │              │          │
  └──────────┘                    └──────────┘              └──────────┘
        │
        ▼
  ┌──────────┐
  │  Voice   │
  │  Input   │
  └──────────┘
```

## 5.2 Splash & Onboarding

### 5.2.1 Splash Screen
```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│                                         │
│                                         │
│                                         │
│                 ╭───╮                   │
│                 │ ₹ │                   │
│                 ╰───╯                   │
│              FISCALLY                   │
│                                         │
│                                         │
│                                         │
│                                         │
│              ◐ Loading...               │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

### 5.2.2 Onboarding - Welcome
```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│           ┌─────────────────┐           │
│           │                 │           │
│           │    [ILLUSTRATION]│          │
│           │   Person with    │          │
│           │   phone + money  │          │
│           │                 │           │
│           └─────────────────┘           │
│                                         │
│         Track expenses with             │
│         the power of AI                 │
│                                         │
│    • Auto-capture from bank SMS         │
│    • Smart insights on spending         │
│    • Voice-powered quick add            │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │         Get Started             │   │
│   └─────────────────────────────────┘   │
│                                         │
│          Already have account?          │
│               Sign in                   │
│                                         │
│               ○ ○ ○                     │
└─────────────────────────────────────────┘
```

### 5.2.3 Onboarding - Income Range
```
┌─────────────────────────────────────────┐
│                                    Skip │
│                                         │
│                                         │
│    What's your monthly income?          │
│                                         │
│    This helps us give better insights   │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │  ○  Less than ₹30,000           │  │
│    └─────────────────────────────────┘  │
│    ┌─────────────────────────────────┐  │
│    │  ○  ₹30,000 - ₹75,000           │  │
│    └─────────────────────────────────┘  │
│    ┌─────────────────────────────────┐  │
│    │  ●  ₹75,000 - ₹1,50,000         │  │
│    └─────────────────────────────────┘  │
│    ┌─────────────────────────────────┐  │
│    │  ○  More than ₹1,50,000         │  │
│    └─────────────────────────────────┘  │
│    ┌─────────────────────────────────┐  │
│    │  ○  Prefer not to say           │  │
│    └─────────────────────────────────┘  │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │            Continue              │   │
│   └─────────────────────────────────┘   │
│                                         │
│               ● ○ ○                     │
└─────────────────────────────────────────┘
```

### 5.2.4 Onboarding - SMS Permission
```
┌─────────────────────────────────────────┐
│                                    Skip │
│                                         │
│                  📱                     │
│                                         │
│      Auto-track your expenses?          │
│                                         │
│   We can read your bank SMS to          │
│   automatically log transactions        │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │                                 │   │
│   │  ✓ Only reads bank SMS          │   │
│   │  ✓ Never personal messages      │   │
│   │  ✓ Processed on your device     │   │
│   │  ✓ Disable anytime              │   │
│   │                                 │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │   ✓  Enable Auto-Tracking       │   │
│   └─────────────────────────────────┘   │
│                                         │
│       I'll add expenses manually        │
│                                         │
│               ○ ● ○                     │
└─────────────────────────────────────────┘
```

### 5.2.5 Onboarding - Complete
```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│                  ✨                     │
│                                         │
│           You're all set!               │
│                                         │
│                                         │
│    Add your first expense, or we'll     │
│    capture it automatically from SMS    │
│                                         │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │       + Add First Expense       │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │    🎤  Or speak: "200 coffee"   │   │
│   └─────────────────────────────────┘   │
│                                         │
│          Skip to Dashboard →            │
│                                         │
│               ○ ○ ●                     │
└─────────────────────────────────────────┘
```

## 5.3 Main App Screens

### 5.3.1 Home Dashboard
```
┌─────────────────────────────────────────┐
│ ≡                              🔔    👤 │
│   FISCALLY        ● AI Active           │
├─────────────────────────────────────────┤
│                                         │
│              January 2026               │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │                                 │   │
│   │         ₹ 32,450                │   │
│   │       spent this month          │   │
│   │                                 │   │
│   │   ━━━━━━━━━━━━━━━░░░░░░ 65%    │   │
│   │   of ₹50,000 budget             │   │
│   │                                 │   │
│   └─────────────────────────────────┘   │
│                                         │
│   Top Categories                        │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│   │   🍕    │ │   🛒    │ │   🚗    │  │
│   │  Food   │ │  Shop   │ │ Travel  │  │
│   │ ₹12.4k  │ │ ₹8.2k   │ │ ₹4.1k   │  │
│   │ ━━━━━━  │ │ ━━━━    │ │ ━━      │  │
│   └─────────┘ └─────────┘ └─────────┘  │
│                                         │
│   💡 AI Insight                         │
│   ┌─────────────────────────────────┐   │
│   │ You spent 23% less on food      │   │
│   │ delivery this week! That's      │   │
│   │ ₹1,840 saved. Keep it up! 🎉    │   │
│   └─────────────────────────────────┘   │
│                                         │
│   Recent Transactions                   │
│   ┌─────────────────────────────────┐   │
│   │ 🍕 Swiggy              -₹450    │   │
│   │    Today, 8:30 PM               │   │
│   ├─────────────────────────────────┤   │
│   │ 🚗 Uber                -₹180    │   │
│   │    Today, 6:15 PM               │   │
│   ├─────────────────────────────────┤   │
│   │ ☕ Starbucks           -₹350    │   │
│   │    Today, 10:00 AM              │   │
│   └─────────────────────────────────┘   │
│           See All Transactions →        │
│                                         │
├─────────────────────────────────────────┤
│   ┌─────────────────────────────────┐   │
│   │      ＋  Add Expense            │   │
│   │        hold for 🎤 voice        │   │
│   └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│   🏠       📊        💬        ⚙️      │
│  Home    Stats      Chat    Settings    │
└─────────────────────────────────────────┘
```

### 5.3.2 Quick Add Modal
```
┌─────────────────────────────────────────┐
│                                    ✕    │
│                                         │
│            Add Expense                  │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │                                 │   │
│   │           ₹ 450|                │   │
│   │                                 │   │
│   └─────────────────────────────────┘   │
│                                         │
│   Category                              │
│   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│   │  🍕  │ │  🚗  │ │  🛒  │ │  📱  │  │
│   │ Food │ │Trans │ │ Shop │ │Bills │  │
│   └──────┘ └──────┘ └──────┘ └──────┘  │
│   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│   │  🎮  │ │  💊  │ │  📚  │ │  ➕  │  │
│   │ Fun  │ │Health│ │ Edu  │ │Other │  │
│   └──────┘ └──────┘ └──────┘ └──────┘  │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │ Note (optional)                 │   │
│   │ Dinner with friends             │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │          💾  Save               │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ─────────────  or  ─────────────      │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │                                 │   │
│   │    🎤  Hold to speak            │   │
│   │    "450 swiggy dinner"          │   │
│   │                                 │   │
│   └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### 5.3.3 Voice Input States
```
┌─────────────────────────────────────────┐
│                                         │
│             Voice Input                 │
│                                         │
│                                         │
│                                         │
│           ┌───────────────┐             │
│           │               │             │
│           │      🎤       │             │
│           │   Recording   │             │
│           │               │             │
│           │  ∿∿∿∿∿∿∿∿∿∿   │             │
│           │  (waveform)   │             │
│           └───────────────┘             │
│                                         │
│                                         │
│       "spent 450 on swiggy"             │
│           (live transcript)             │
│                                         │
│                                         │
│         [ Release to send ]             │
│                                         │
│                                         │
└─────────────────────────────────────────┘

          ↓ After processing ↓

┌─────────────────────────────────────────┐
│                                         │
│           ✓ Got it!                     │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │                                 │   │
│   │           ₹450                  │   │
│   │           Swiggy                │   │
│   │           🍕 Food Delivery      │   │
│   │                                 │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ┌───────────────┐ ┌───────────────┐   │
│   │  ✓ Confirm    │ │   ✏️ Edit     │   │
│   └───────────────┘ └───────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### 5.3.4 All Transactions Screen
```
┌─────────────────────────────────────────┐
│ ←  Transactions                    🔍   │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ All  │ │ Food │ │ Shop │ │ More │   │
│  │  ●   │ │      │ │      │ │  ▼   │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│                                         │
│  January 2026                           │
│  ─────────────────────────────────────  │
│                                         │
│  TODAY                                  │
│  ┌─────────────────────────────────┐   │
│  │ 🍕 Swiggy              -₹450    │   │
│  │    8:30 PM • Food Delivery      │   │
│  ├─────────────────────────────────┤   │
│  │ 🚗 Uber                -₹180    │   │
│  │    6:15 PM • Transport          │   │
│  ├─────────────────────────────────┤   │
│  │ ☕ Starbucks           -₹350    │   │
│  │    10:00 AM • Food              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  YESTERDAY                              │
│  ┌─────────────────────────────────┐   │
│  │ 🛒 Amazon             -₹2,499   │   │
│  │    3:45 PM • Shopping           │   │
│  ├─────────────────────────────────┤   │
│  │ 📱 Airtel              -₹599    │   │
│  │    Auto-debit • Bills           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  MONDAY, JAN 27                         │
│  ┌─────────────────────────────────┐   │
│  │ 🍕 Zomato              -₹380    │   │
│  │    9:15 PM • Food Delivery      │   │
│  ├─────────────────────────────────┤   │
│  │ ⛽ HP Petrol          -₹1,500   │   │
│  │    7:30 AM • Transport          │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│   🏠       📊        💬        ⚙️      │
└─────────────────────────────────────────┘
```

### 5.3.5 Chat Screen
```
┌─────────────────────────────────────────┐
│ ←  Chat with Fiscally                   │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 💡 Try asking:                  │   │
│  │                                 │   │
│  │ "How much did I spend on food?" │   │
│  │ "What's my biggest expense?"    │   │
│  │ "Am I on track for my goal?"    │   │
│  └─────────────────────────────────┘   │
│                                         │
│                                         │
│          ┌────────────────────────┐    │
│          │ How much did I spend   │    │
│          │ on Swiggy this month?  │ 👤 │
│          └────────────────────────┘    │
│                                         │
│  ┌────────────────────────┐            │
│  │ You've spent ₹4,850    │            │
│  │ on Swiggy this month   │            │
│  │ across 12 orders.      │            │
│  │                        │ 🤖         │
│  │ That's ₹404 per order  │            │
│  │ on average.            │            │
│  │                        │            │
│  │ 💡 Your late-night     │            │
│  │ orders (after 10pm)    │            │
│  │ average ₹520 vs ₹340   │            │
│  │ during the day.        │            │
│  └────────────────────────┘            │
│                                         │
│          ┌────────────────────────┐    │
│          │ What about Zomato?     │ 👤 │
│          └────────────────────────┘    │
│                                         │
│  ┌────────────────────────┐            │
│  │ Zomato: ₹2,280 across  │            │
│  │ 6 orders this month.   │            │
│  │                        │ 🤖         │
│  │ Combined food delivery │            │
│  │ total: ₹7,130 (22% of  │            │
│  │ your total spending).  │            │
│  └────────────────────────┘            │
│                                         │
├─────────────────────────────────────────┤
│ ┌───────────────────────────────────┐  │
│ │ Ask about your spending...     🎤 │  │
│ └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│   🏠       📊        💬        ⚙️      │
└─────────────────────────────────────────┘
```

### 5.3.6 Stats Screen
```
┌─────────────────────────────────────────┐
│ ←  Statistics                           │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐            │
│  │ Week │ │Month │ │ Year │            │
│  │      │ │  ●   │ │      │            │
│  └──────┘ └──────┘ └──────┘            │
│                                         │
│  January 2026                           │
│  ┌─────────────────────────────────┐   │
│  │       Spending Trend            │   │
│  │                                 │   │
│  │    ₹50k ┤           ╭──╮       │   │
│  │         │      ╭────╯  │       │   │
│  │    ₹25k ┤  ╭───╯       ╰──     │   │
│  │         │──╯                    │   │
│  │      ₹0 ┼───┬───┬───┬───┬───   │   │
│  │         W1  W2  W3  W4  W5     │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Category Breakdown                     │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │  🍕 Food         ████████ 38%  │   │
│  │  🛒 Shopping     █████    25%  │   │
│  │  🚗 Transport    ███      15%  │   │
│  │  📱 Bills        ███      12%  │   │
│  │  🎮 Fun          ██       10%  │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Insights                               │
│  ┌─────────────────────────────────┐   │
│  │ 📈 Spending up 12% from last    │   │
│  │    month                        │   │
│  ├─────────────────────────────────┤   │
│  │ ⚠️ Food delivery 23% over      │   │
│  │    typical                      │   │
│  ├─────────────────────────────────┤   │
│  │ ✅ Transport costs stable       │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│   🏠       📊        💬        ⚙️      │
└─────────────────────────────────────────┘
```

### 5.3.7 Settings Screen
```
┌─────────────────────────────────────────┐
│ ←  Settings                             │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  👤  Kaushal                    │   │
│  │      kaushal@email.com          │   │
│  │      Edit Profile →             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  TRACKING                               │
│  ┌─────────────────────────────────┐   │
│  │  📱 SMS Auto-Tracking    [ON]   │   │
│  ├─────────────────────────────────┤   │
│  │  🔔 Notifications        [ON]   │   │
│  ├─────────────────────────────────┤   │
│  │  📊 Weekly Digest        [ON]   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  PREFERENCES                            │
│  ┌─────────────────────────────────┐   │
│  │  💰 Monthly Budget              │   │
│  │     ₹50,000                  →  │   │
│  ├─────────────────────────────────┤   │
│  │  📅 Payday                      │   │
│  │     1st of month             →  │   │
│  ├─────────────────────────────────┤   │
│  │  🌙 Dark Mode            [OFF]  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  DATA                                   │
│  ┌─────────────────────────────────┐   │
│  │  📤 Export Data              →  │   │
│  ├─────────────────────────────────┤   │
│  │  🗑️ Clear All Data           →  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │        🚪 Log Out               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  v1.0.0 • Made with ❤️                 │
│                                         │
├─────────────────────────────────────────┤
│   🏠       📊        💬        ⚙️      │
└─────────────────────────────────────────┘
```

## 5.4 Notifications

### 5.4.1 Transaction Detected (Collapsed)
```
┌─────────────────────────────────────────┐
│  💰 Fiscally                       now  │
├─────────────────────────────────────────┤
│                                         │
│  New expense: ₹450 at SWIGGY            │
│                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │🍕 Food │ │🛒 Shop │ │✏️ Edit │      │
│  └────────┘ └────────┘ └────────┘      │
│                                         │
└─────────────────────────────────────────┘
```

### 5.4.2 Transaction Detected (Expanded - Long Press)
```
┌─────────────────────────────────────────┐
│  💰 Fiscally                       now  │
├─────────────────────────────────────────┤
│                                         │
│  💳 New expense detected                │
│                                         │
│     ₹450 at SWIGGY                      │
│     Jan 29, 2026 • 8:30 PM              │
│                                         │
│  Category:                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │  🍕  │ │  🛒  │ │  🚗  │ │  ➕  │  │
│  │ Food │ │ Shop │ │Trans │ │Other │  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Add note...                     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌───────────────┐ ┌───────────────┐   │
│  │     Save      │ │   Open App    │   │
│  └───────────────┘ └───────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### 5.4.3 Weekly Digest
```
┌─────────────────────────────────────────┐
│  📊 Fiscally                   Sunday   │
├─────────────────────────────────────────┤
│                                         │
│  Your Week in Review                    │
│                                         │
│  Spent: ₹8,450                          │
│  You're ₹1,550 under budget! 🎉         │
│                                         │
│  Top: Food (₹3,200) • Transport (₹1,800)│
│                                         │
│           [ View Full Report ]          │
│                                         │
└─────────────────────────────────────────┘
```

### 5.4.4 Budget Alert
```
┌─────────────────────────────────────────┐
│  ⚠️ Fiscally                       now  │
├─────────────────────────────────────────┤
│                                         │
│  Budget Alert: Food                     │
│                                         │
│  You've used 90% of your food budget    │
│  ₹13,500 of ₹15,000 • 3 days left       │
│                                         │
│           [ See Breakdown ]             │
│                                         │
└─────────────────────────────────────────┘
```

## 5.5 Widgets

### 5.5.1 Small Widget (2x2)
```
┌───────────────────────┐
│ Fiscally              │
│                       │
│      ₹32,450          │
│    this month         │
│                       │
│   [ 🎤 + Add ]        │
└───────────────────────┘
```

### 5.5.2 Medium Widget (4x2)
```
┌─────────────────────────────────────────┐
│ Fiscally                        January │
│                                         │
│ ₹32,450 spent      ━━━━━━━━━░░░░ 65%   │
│                    of ₹50k budget       │
│                                         │
│ 🍕 ₹12.4k   🛒 ₹8.2k   🚗 ₹4.1k        │
│                                         │
│          [ 🎤 Hold to add ]             │
└─────────────────────────────────────────┘
```

### 5.5.3 Large Widget (4x4)
```
┌─────────────────────────────────────────┐
│ Fiscally                        January │
├─────────────────────────────────────────┤
│                                         │
│         ₹32,450                         │
│    spent this month                     │
│                                         │
│    ━━━━━━━━━━━━━━━░░░░░░░ 65%          │
│    of ₹50,000 budget                    │
│                                         │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │   🍕    │ │   🛒    │ │   🚗    │    │
│ │ ₹12.4k  │ │  ₹8.2k  │ │  ₹4.1k  │    │
│ └─────────┘ └─────────┘ └─────────┘    │
│                                         │
│ Recent:                                 │
│ • Swiggy -₹450 (8:30 PM)               │
│ • Uber -₹180 (6:15 PM)                 │
│                                         │
├─────────────────────────────────────────┤
│          [ 🎤 Hold to add ]             │
└─────────────────────────────────────────┘
```

---

## 5.6 Color Palette & Design Tokens

```
Primary Colors
─────────────────────────────────────────
Primary:        #6366F1  (Indigo - main actions)
Primary Dark:   #4F46E5  (Pressed state)
Primary Light:  #A5B4FC  (Backgrounds)

Semantic Colors
─────────────────────────────────────────
Success:        #10B981  (Green - positive)
Warning:        #F59E0B  (Amber - alerts)
Error:          #EF4444  (Red - negative)
Info:           #3B82F6  (Blue - info)

Neutral Colors
─────────────────────────────────────────
Background:     #F8FAFC  (Light gray bg)
Card:           #FFFFFF  (White cards)
Text Primary:   #1E293B  (Dark text)
Text Secondary: #64748B  (Gray text)
Text Muted:     #94A3B8  (Light gray)
Border:         #E2E8F0  (Subtle borders)

Category Colors
─────────────────────────────────────────
Food:           #F97316  (Orange)
Transport:      #3B82F6  (Blue)
Shopping:       #EC4899  (Pink)
Bills:          #8B5CF6  (Purple)
Entertainment:  #10B981  (Green)
Health:         #EF4444  (Red)
Education:      #06B6D4  (Cyan)
Other:          #6B7280  (Gray)
```

---

*End of Specification Document*
