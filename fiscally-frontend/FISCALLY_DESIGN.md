# FISCALLY — Finance App Design Spec

## 1. SCREEN LIST

### Bottom Tab Navigation (4 Tabs)
- **Dashboard** (Home)
- **SubZero** (Refund Negotiations)
- **DopamineAudit** (Spending Insights)
- **ThesisFlow** (Investments)

---

### DASHBOARD TAB Stack
```
Dashboard (Root)
├── Notification Center
├── Settings
└── Profile
```

**Dashboard Screen** (Always visible)
- Header: "FISCALLY" logo + "AI ACTIVE" badge + light/dark toggle + notifications bell
- KPI Cards (horizontal scroll):
- Agent Savings: $1,240.50 (+12.4%)
- Net Worth: $84.2k (+3.4%)
- Engine Status Cards (scrollable vertical):
- SubZero card (3 ACTIVE TASKS, LIVE UPDATE button, 70% progress ring)
- DopamineAudit card (HIGH VOLATILITY alert, spending correlation chart)
- ThesisFlow card (preview: DASH / ASSETS / TRENDS / CONFIG tabs)
- Demo Mode: "Tap logo 5x to unlock demo shortcuts"

---

### SUBZERO TAB Stack
```
SubZero Hub (Root)
├── Negotiation Chat (Modal Stack)
│   ├── Merchant Selection
│   ├── Chat Interface
│   ├── Refund Status Detail
│   └── Success Confirmation
├── Active Disputes List
└── History
```

**SubZero Hub** (Tab root)
- Header: "SubZero" + "3 ACTIVE" badge
- Quick actions: "New Negotiation" (large button)
- Active Disputes List:
- Card per merchant with status badge (Negotiating, Won, Pending)
- Last message preview
- Expected refund amount
- Tap to open chat

**Merchant Selection Sheet**
- Search/filter (popular: Amazon, Apple, Uber, Spotify)
- Category tabs (Shopping, Services, Subscriptions)
- Each shows: merchant logo, name, default claim amount

**Chat Interface**
- Agent name + status dot (AI Negotiating)
- Message thread (AI on left, user actions on right)
- Input field: "Message AI agent..."
- Quick action buttons below input:
- "Accept Offer" (primary)
- "Counter Offer" (secondary)
- "Request Details" (tertiary)
- Status bar at top: "Negotiating... 67% confidence"

**Refund Status Detail** (Modal)
- Original charge amount
- Negotiated refund
- Timeline (Requested → Under Review → Approved)
- Expected refund date
- Merchant response quotes

---

### DOPAMINEAUDIT TAB Stack
```
DopamineAudit Hub (Root)
├── Emotional Spending Report (Modal/Sheet)
└── Category Deep Dive
```

**DopamineAudit Hub** (Tab root)
- Header: "DopamineAudit" + "HIGH VOLATILITY" badge
- Summary card:
- "Spikes correlate with 'Low Energy' periods"
- Emotional trigger: "Stress-driven impulse buys"
- Amount at risk: "$340/week"
- Bar chart (spending by emotion state):
- Gray (Neutral) vs Purple (Stressed) vs Blue (Happy)
- Category breakdown:
- Shopping (Clothes, Electronics, etc.)
- Food Delivery
- Entertainment
- Subscriptions

**Category Deep Dive** (Modal/Sheet)
- Category name + total spend + trend arrow
- Timeline toggle (Last 7 days / 30 days / 90 days)
- Heatmap: days of week × emotional state
- Top merchants in category
- "Set Spending Alert" button
- Copy: "You tend to spend 3.5x more on [Category] after 11 PM. Try using 'Wind Down' mode."

---

### THESISFLOW TAB Stack
```
ThesisFlow Hub (Root) — with sub-tabs
├── DASH (Portfolio Dashboard)
├── ASSETS (Holdings List)
├── TRENDS (Analysis)
├── CONFIG (Settings)
└── Investment Detail (Modal)
```

**ThesisFlow Hub** — Tab with internal sub-navigation
- Center-circle icon (Thesis gem)
- Bottom nav bar within tab: DASH | ASSETS | TRENDS | CONFIG

**DASH Sub-tab**
- Portfolio value + % change
- Asset allocation pie chart (colors: Tech, Finance, Healthcare, etc.)
- "Rebalance Recommendation" alert if needed
- Recent transactions list

**ASSETS Sub-tab**
- Holdings list with name, quantity, value, % gain/loss
- Tap to see detail modal

**TRENDS Sub-tab**
- Performance chart (1D, 1W, 1M, 1Y, ALL)
- Correlation matrix heatmap
- Market sentiment (bullish/bearish indicators)

**CONFIG Sub-tab**
- Risk profile (Conservative / Moderate / Aggressive)
- Rebalance frequency
- Alert thresholds
- Connected accounts

**Investment Detail Modal**
- Stock/fund name + symbol
- Current price + 24h change
- Holdings: quantity, cost basis, current value
- Performance chart
- Actions: "Buy More" / "Sell" / "Set Alert"

---

## 2. NAVIGATION STRUCTURE

```
RootNavigator
├── Bottom Tab Navigator
│   ├── DashboardStack
│   │   ├── Dashboard
│   │   ├── NotificationCenter
│   │   ├── Settings
│   │   └── Profile
│   │
│   ├── SubZeroStack
│   │   ├── SubZeroHub
│   │   ├── NegotiationChat (Modal)
│   │   ├── MerchantSelection (Sheet)
│   │   └── History
│   │
│   ├── DopamineAuditStack
│   │   ├── DopamineAuditHub
│   │   └── CategoryDeepDive (Sheet)
│   │
│   └── ThesisFlowStack
│       └── ThesisFlowHub (with internal tabs)
│           ├── Dash
│           ├── Assets
│           ├── Trends
│           └── Config
│
└── GlobalModals
├── Demo Mode Selector
├── Alert Dialogs
└── Confirm Actions
```

---

## 3. USER FLOWS

### A. SubZero Refund Negotiation Flow

**Trigger:** User taps "New Negotiation" or sees "3 ACTIVE TASKS" badge (late night, stressed)

1. **Merchant Selection Sheet**
- Slides up from bottom
- Shows popular merchants first (Amazon, Uber, etc.)
- User searches or taps merchant
- Copy: "Which merchant should we negotiate with?"

2. **Claim Details**
- Merchant logo
- Transaction amount displayed
- Description auto-filled or user edits
- Claim reason dropdown:
- "Defective product"
- "Service never rendered"
- "Duplicate charge"
- "Price discrepancy"
- Copy: "Why did this charge go wrong?"

3. **AI Negotiation Chat Opens**
- Modal slides in
- AI agent introduces itself: "Hi! I'm SubZero. Let me handle your refund."
- Agent asks: "What went wrong with this $47.99 charge from Uber?"
- User types response
- Agent analyzes and responds with strategy
- Copy examples:
- AI: "I found similar cases where merchants refunded 85% without dispute. Want me to try that first?"
- AI: "This looks like a duplicate charge. Filing dispute now... confidence: 89%"

4. **Negotiation Progress**
- Messages stream in
- Status bar updates: "Requesting refund... 45% → 67% confidence"
- Quick action buttons:
- "Accept Offer ($40 refund)"
- "Counter: $47.99 full refund"
- "Request escalation"

5. **Resolution**
- Success modal appears
- "Refund Approved: $47.99"
- Copy: "Your refund will land in 3-5 business days. SubZero saved you $47.99."
- Action: "View Details" or "New Negotiation"

**Late-night UX:**
- Minimal copy, maximum clarity
- Tap-to-confirm (no double-reading)
- Dark mode by default
- Agent handles the thinking; user just approves

---

### B. DopamineAudit Emotional Spending Flow

**Trigger:** Dashboard shows "HIGH VOLATILITY" badge, or user opens tab at 11 PM

1. **Hub View (Discovery)**
- User sees bar chart: spending by emotion
- Purple bars (stressed) are taller
- Copy: "You spent $340 this week. Stress drove $240 of it."
- Tap anywhere to drill down

2. **Category Selection**
- User taps "Shopping" (or category with highest stress-correlation)
- Sheet slides up
- Copy: "Let's look at your Shopping category"

3. **Heatmap Deep Dive**
- Day × Emotion grid
- Tuesday, 11:30 PM (low energy): $89 spent on Fashion
- Thursday, 1:15 AM (stressed): $156 spent on Electronics
- Each cell shows merchant + amount
- Copy: "You spent 3.5x more after 11 PM. This time of day is risky for you."

4. **Pattern Recognition Alert**
- Modal shows correlation
- Copy: "This week, every late-night session ended in a purchase. We're seeing a pattern."
- Actions: "Set Time Block" / "Set Spending Limit" / "Enable Wind Down Mode"

5. **Wind Down Mode (Intervention)**
- User taps "Enable Wind Down Mode"
- Midnight-6 AM: purchase confirmations require 30-second delay
- Copy: "Purchases after midnight will have a 30-second approval delay. This helps break the impulse cycle."
- Toggle: ON / OFF
- User confirms

**Late-night UX:**
- Acknowledge the late-night user is vulnerable
- Show them the data that proves it
- Offer friction (not guilt)
- One primary action per screen

---

### C. ThesisFlow Investment Analysis Flow

**Trigger:** User opens ThesisFlow tab or taps "Rebalance Recommendation"

1. **Dashboard View (DASH)**
- Portfolio value: $84,200 (+3.4%)
- Allocation pie: Tech 45%, Finance 25%, Healthcare 20%, Other 10%
- Copy: "Your portfolio is balanced. No rebalancing needed."
- If imbalanced: "Alert: Tech is 60% of portfolio. Consider rebalancing."

2. **Holdings View (ASSETS)**
- List of stocks/funds with current values
- User scrolls and taps a holding (e.g., TSLA)
- Modal opens with detail

3. **Investment Detail**
- Stock name + symbol + price + 24h change
- Holdings: "100 shares @ $156.20 = $15,620"
- Cost basis: $14,200
- Current gain: $1,420 (+10%)
- Performance chart (1Y): shows uptrend
- Actions at bottom:
- "Buy More" (primary)
- "Sell" (secondary)
- "Set Alert" (tertiary)

4. **Trend Analysis (TRENDS)**
- User swipes to TRENDS tab within ThesisFlow
- Market chart: scrollable timeframes (1D, 1W, 1M, 1Y, ALL)
- Correlation heatmap (shows how holdings move together)
- Sentiment indicators: "Market is 67% bullish"
- Copy: "Your Tech holdings are moving together. Consider diversifying."

5. **Rebalancing Flow**
- Alert modal: "Your portfolio is 60% Tech. Market volatility could hit harder."
- Recommendation: "Move 5% into Healthcare"
- User taps "Rebalance"
- Confirmation: "Sell $4,210 of TSLA. Buy $4,210 of VHT?"
- Post-confirmation: "Rebalancing scheduled. Orders execute Monday morning."

**Investment UX:**
- Show thesis before numbers
- One metric per card
- Tap for depth, not clutter on primary view
- Recommendations are actionable (not theoretical)

---

## 4. ONE-TAP DEMO SHORTCUTS (For Judges)

**Access:** Tap Fiscally logo 5 times on Dashboard to unlock

**Demo Mode Selector Modal:**
```
DEMO SCENARIOS
┌─────────────────────┐
│ 1. SubZero in Action│
│ (Live negotiation)  │
└─────────────────────┘
┌─────────────────────┐
│ 2. Late Night Spree │
│ (DopamineAudit)     │
└─────────────────────┘
┌─────────────────────┐
│ 3. Rebalance Alert  │
│ (ThesisFlow)        │
└─────────────────────┘
┌─────────────────────┐
│ 4. Full Walkthrough │
│ (All 3 engines)     │
└─────────────────────┘
```

**Each demo:**
- Pre-loads sample data
- Animates agent actions
- Includes narration (optional toggle)
- Can pause/skip forward
- Resets on modal dismiss

**Demo 1: SubZero**
- Shows Amazon refund negotiation mid-stream
- AI message: "I found merchant precedent. 85% refunds approved for your case type."
- User action: Tap "Counter: Full Refund"
- AI responds: "Escalating to merchant disputes team... approved in 2 minutes"
- Success screen

**Demo 2: DopamineAudit**
- Shows heatmap with red spikes at 11 PM
- Copy: "You spend 3.5x more late at night"
- User action: Tap "Enable Wind Down Mode"
- Confirmation animation

**Demo 3: ThesisFlow**
- Portfolio dashboard with rebalance alert
- User action: Tap "Rebalance" → sees order preview → taps "Confirm"
- Execution animation

**Demo 4: Full Walkthrough**
- 90-second guided tour through all three engines
- Text overlays explain each feature
- Loops back to Dashboard

---

## 5. UX PATTERNS

### Modals
- **Chat Modal** (SubZero): Slides up full-screen, header with close + merchant info
- **Detail Modal** (Investment, Refund Status): Centered, rounded top + bottom sheet behavior
- **Confirmation Modal** (Destructive actions): Title + description + cancel/confirm buttons
- **Alert Modal** (System messages): Icon + headline + description + dismiss button

### Bottom Sheets
- **Merchant Selection** (SubZero): 60% of screen height, drag handle, search bar, list
- **Category Deep Dive** (DopamineAudit): 70% of screen, sticky category header, scrollable content
- **Wind Down Mode** (DopamineAudit): Confirmation sheet with toggle + explanatory copy

### Alerts (Toast-style)
- **Inline success**: "Refund approved! ✓" (fade in, 3s auto-dismiss)
- **Persistent warning**: "Wind Down Mode active" (stays until dismissed)
- **Error**: "Network error. Retry?" (with action button)

### Gestures
- **Swipe down** to dismiss sheets/modals
- **Swipe left/right** within ThesisFlow tabs
- **Long press** on transaction → "Report" option
- **Double tap** on KPI card → toggle detail view
- **Swipe right** on negotiation message → "Helpful" reaction

### Animations
- **Page transitions**: Slide up (new selection) / fade (detail)
- **Agent typing**: Three dots that bounce (SubZero AI)
- **Progress ring** (SubZero): Incremental fill as confidence increases
- **Chart updates**: Smooth redraw when timeframe changes

---

## 6. COPY TEXT FOR KEY SCREENS

### DASHBOARD
**Header:**
- Badge: "AI ACTIVE" (pulsing dot)
- Toggle: sun/moon icons for light/dark mode

**KPI Cards:**
- "AGENT SAVINGS" (explains SubZero refunds)
- "NET WORTH" (total portfolio value)
- Subtext: "+12.4%" / "+3.4%" (bold, green)

**Engine Status:**
- SubZero: "Autonomous Negotiations" / "3 ACTIVE TASKS" / "LIVE UPDATE"
- DopamineAudit: "Spending Correlation" / "HIGH VOLATILITY"
- ThesisFlow: "Investment Analysis"

### SUBZERO NEGOTIATION CHAT
**Opening message (AI):**
```
Hi, I'm SubZero. I'll handle your refund negotiation.

What went wrong with this charge? I'll take it from here.
```

**Mid-negotiation (AI):**
```
I found 7 similar cases. Merchants refunded 85% on average 
for this issue type.

Ready to push for your full refund?
```

**Success screen:**
```
Refund Approved

$47.99 will land in 3-5 business days.

You've saved $47.99 with SubZero.
New negotiation? →
```

### DOPAMINEAUDIT
**Hub headline:**
```
Spikes correlate with "Low Energy" periods.
```

**Category drill-down:**
```
You spent $340 this week.
Stress drove $240 of it.

Every late-night session ended in a purchase.
We're seeing a pattern.
```

**Wind Down Mode confirmation:**
```
Purchases after midnight will have a 30-second 
approval delay.

This helps break the impulse cycle.
```

**Stats callout:**
```
You spend 3.5x more after 11 PM.
Enable Wind Down Mode? →
```

### THESISFLOW
**DASH alert:**
```
Your portfolio is 60% Tech.
Market volatility could hit harder.

Move 5% into Healthcare? →
```

**TRENDS insight:**
```
Your Tech holdings are moving together.
Consider diversifying.

Rebalance recommendation ↓
```

**CONFIG label:**
```
Risk Profile

Currently: Moderate

Adjust based on goals and timeline.
```

**Post-rebalance:**
```
Rebalancing scheduled.

Orders execute Monday morning.
Your portfolio will be 45% Tech, 25% Finance, 
20% Healthcare, 10% Other.
```

### SETTINGS / PROFILE
**Profile screen:**
```
FISCALLY ACCOUNT

Name: [User]
Email: [user@email]
Accounts Connected: 3 (bank, brokerage, crypto)
Last Sync: Just now

Manage Accounts →
```

**Settings sections:**
- Notification Preferences (email, in-app, SMS)
- Safety & Security (biometric, 2FA, device trust)
- Theme (Light / Dark / System)
- Data & Privacy

---

## 7. INTERACTION PATTERNS FOR LATE-NIGHT UX

### Principle 1: Minimize Reading
- Use icons + color + status badges
- Avoid paragraphs; use short sentences
- "You spent $340 this week" beats "This week, your total spending reached three hundred and forty dollars"

### Principle 2: Tap-to-Confirm
- One primary action per screen
- Secondary actions tertiary (smaller, visual hierarchy)
- No double-reads; assume user is tired

### Principle 3: Dark Mode by Default
- Reduce eye strain after 10 PM
- Users can toggle, but dark is default
- High contrast for text/buttons (WCAG AAA)

### Principle 4: Guided Decision-Making
- Agent suggests next step ("Accept Offer" vs "Counter")
- User taps; agent executes
- Removes cognitive load (user just approves, doesn't plan)

### Principle 5: Emotional Validation
- Acknowledge stress: "This time of day is risky for you"
- Offer friction, not guilt: "30-second delay helps break the cycle"
- Celebrate wins: "You've saved $47.99 with SubZero"

### Principle 6: Persistent Context
- Always show current negotiation/transaction at top of relevant screens
- Swipe-accessible history (SubZero chat, DopamineAudit categories)
- "Back" button shows previous screen title

---

## 8. TECHNICAL NOTES

### Stack
- React Native + Expo (SDK 54)
- Bottom Tab Navigator + Stack navigators per tab
- Convex for backend (AI agents, data sync)
- Firebase or Supabase for auth + user data

### Key Components
- `KPICard` (reusable, shows metric + trend)
- `EngineCard` (SubZero, DopamineAudit, ThesisFlow)
- `ChatMessage` (AI vs user, with actions)
- `ProgressRing` (SVG, animated confidence)
- `Heatmap` (day × emotion grid)
- `Chart` (timeframe-switchable, responsive)

### Colors
- Primary: Blue (#6366F1)
- Success: Green (#10B981)
- Stress: Red (#EF4444)
- Energy: Purple (#8B5CF6)
- Neutral: Gray (#9CA3AF)
- Dark BG: #0F172A (DarkSlateGray)
- Light BG: #F8FAFC (AliceBlue)

### Safe Areas
- Respect `useSafeAreaInsets()` on all screens
- Tab bar: Always at bottom (safe area)
- Modals: Top safe area for close button
- Horizontally: 16px padding on mobile, 24px on tablet

### Accessibility
- Button min size: 44pt × 44pt (tap target)
- Color contrast ratio: 4.5:1 (text/bg)
- Labels for all icons
- Skip buttons for long lists

---

## 9. FUTURE EXTENSIONS

- **Smart Alerts:** Notify user before they spend (ML model of their patterns)
- **Merchant Integrations:** Direct API partnerships for faster refunds
- **Multi-Currency:** Support for travelers and forex traders
- **Social Features:** Share portfolio milestones (with privacy controls)
- **Rewards:** Gamify negotiation wins (badges, leaderboard)

---

**END DESIGN SPEC**
