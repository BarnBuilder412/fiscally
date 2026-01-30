# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Fiscally** is an AI-powered personal finance companion app for tracking expenses, generating insights, and providing conversational financial guidance. The app uses LLM-driven agents to understand user spending patterns and provide personalized, actionable advice.

### Core Value Proposition
- **< 3 taps to add expenses** - Voice-first, instant entry
- **Automatic SMS tracking** - Parses bank transaction SMS on-device
- **AI companion personality** - Context-aware, non-judgmental financial buddy
- **Proactive insights** - Pattern detection and predictive notifications

### Tech Stack
- **Backend:** FastAPI (Python) + PostgreSQL
- **Mobile:** React Native (Expo)
- **AI:** OpenAI GPT-4o-mini for LLM operations
- **Observability:** Opik for LLM evaluation
- **Push:** Firebase Cloud Messaging

## Architecture

### Context-Driven AI System
The app maintains a "living understanding" of each user through structured context files inspired by Moltbot:

```
User Context (Cloud-stored, JSONB columns)
├── PROFILE       # User identity, preferences, financial personality
├── PATTERNS      # AI-learned spending behavior, triggers, anomalies
├── INSIGHTS      # Active/delivered/dismissed observations
├── GOALS         # Financial targets and progress
└── MEMORY        # Conversation facts and history
```

### AI Agents Architecture
Four primary agents operate on user data:

1. **Transaction Processing Agent** - Categorizes transactions, detects anomalies, updates patterns, checks goal impact
2. **Insight Generation Agent** - Weekly cron + on-demand analysis, generates actionable observations
3. **Chat Agent** - Conversational queries with tool access (query transactions, update memory, set goals)
4. **Proactive Alert Agent** - Real-time monitoring for unusual amounts, budget breaches, pattern violations, goal milestones

### Data Flow
- **SMS → Parse (on-device) → Structured data → Backend**
- **Transaction → Categorize → Anomaly Check → Pattern Update → Notification**
- **Weekly Cron → Load Context → Generate Insights → Store → Notify**
- **Chat Query → Load Context → Tool Execution → LLM Response → Context Update**

## Development Commands

### Backend (FastAPI)
```bash
# Setup (when backend code exists)
cd backend
pip install -r requirements.txt

# Run development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Run with environment variables
export DATABASE_URL="postgresql://..."
export OPENAI_API_KEY="..."
uvicorn main:app --reload

# Database migrations (when using Alembic)
alembic upgrade head
alembic revision --autogenerate -m "description"

# Run tests
pytest tests/ -v
pytest tests/test_agents.py -v  # Test specific agent logic

# Check linting
black . --check
ruff check .

# Format code
black .
ruff check . --fix
```

### Mobile (React Native/Expo)
```bash
# Setup (when mobile code exists)
cd mobile
npm install
# or
yarn install

# Start development
npx expo start
npm start

# Run on specific platforms
npx expo start --ios
npx expo start --android
npx expo start --web

# Run tests
npm test
npm run test:watch

# Linting
npm run lint
npm run lint:fix

# Type checking
npm run typecheck

# Build for production
eas build --platform android
eas build --platform ios
```

## Code Structure Guidelines

### Backend Structure (Planned)
```
backend/
├── main.py              # FastAPI app entry
├── api/
│   ├── auth.py          # Authentication endpoints
│   ├── transactions.py  # Transaction CRUD + voice parsing
│   ├── chat.py          # Conversational interface
│   └── insights.py      # Insight retrieval
├── agents/
│   ├── transaction_processor.py  # Transaction categorization & anomaly detection
│   ├── insight_generator.py      # Weekly digest + pattern analysis
│   ├── chat_handler.py           # Context-aware chat with tools
│   └── alert_checker.py          # Real-time alert logic
├── models/
│   ├── user.py          # User, Profile models
│   ├── transaction.py   # Transaction model
│   └── context.py       # JSONB context schemas
├── llm/
│   ├── prompts.py       # All LLM prompt templates
│   ├── client.py        # OpenAI client wrapper
│   └── opik_tracker.py  # Opik evaluation integration
└── utils/
    ├── sms_parser.py    # Bank SMS parsing patterns
    └── notifications.py # FCM push service
```

### Mobile Structure (Planned)
```
mobile/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx       # Home dashboard
│   │   ├── stats.tsx       # Statistics screen
│   │   ├── chat.tsx        # Chat interface
│   │   └── settings.tsx    # Settings
│   └── modals/
│       ├── quick-add.tsx   # Add expense modal
│       └── voice-input.tsx # Voice recording UI
├── components/
│   ├── TransactionList.tsx
│   ├── CategorySelector.tsx
│   ├── InsightCard.tsx
│   └── ActionableNotification.tsx
├── services/
│   ├── api.ts              # API client
│   ├── sms-reader.ts       # Android SMS reading
│   ├── voice-recorder.ts   # Audio recording
│   └── offline-sync.ts     # SQLite + sync queue
├── context/
│   └── UserContext.tsx     # Global user state
└── widgets/
    └── expense-widget/     # Home screen widget
```

## AI Personality Guidelines

When working on LLM-related code or prompts, follow these principles:

### System Personality ("SOUL")
- **Honest, not preachy** - Show patterns, let users decide
- **Celebrate wins** - "Spent 20% less" > "You overspent"
- **Be specific** - Use actual numbers, not generic advice
- **Predict, don't just report** - "On track to exceed by ₹5,000"
- **Know when to shut up** - Only notify for anomalies, milestones, urgent alerts

### Prompt Engineering Standards
- Always inject full user context (PROFILE + PATTERNS + INSIGHTS + GOALS + MEMORY)
- Keep response constraints explicit (e.g., "under 80 words")
- Specify output format (JSON for structured data, conversational for chat)
- Include examples in prompts for consistency
- Track all LLM operations in Opik with custom metrics:
  - `categorization_accuracy`
  - `insight_specificity` (contains numbers/percentages)
  - `response_helpfulness` (LLM-judged)

## API Contract

All endpoints follow `/api/v1/` convention:

### Authentication
- `POST /api/v1/auth/signup` - Create account
- `POST /api/v1/auth/login` - JWT token generation
- `POST /api/v1/auth/refresh` - Token refresh

### Profile & Context
- `GET /api/v1/profile` - Returns user profile + full context
- `PATCH /api/v1/profile` - Update user preferences

### Transactions
- `GET /api/v1/transactions?limit=50&offset=0&category=food` - List with filters
- `POST /api/v1/transactions` - Create transaction (manual or SMS-parsed)
- `POST /api/v1/transactions/voice` - Parse voice audio to transaction

### AI Features
- `POST /api/v1/chat` - Conversational query with context
- `GET /api/v1/insights` - Fetch weekly summary, patterns, alerts

## Development Workflow

### Phase-Based Development
The project follows a 6-phase development plan (see `docs/FISCALLY_MVP_SPEC.md` Part 4):

1. **Foundation** - Auth + basic UI + API structure
2. **Core Transaction Flow** - Manual add + voice input + categorization
3. **SMS Auto-Tracking** - SMS parsing + notifications + FCM
4. **AI Chat + Insights** - Chat interface + weekly insights cron
5. **Widget + Polish** - Home screen widget + offline mode
6. **Demo Prep** - Testing + demo data + pitch preparation

### Testing Strategy
- **Backend**: Use pytest for agent logic, especially:
  - Transaction categorization accuracy
  - Anomaly detection edge cases
  - Context update logic
  - LLM prompt outputs (with Opik)
- **Mobile**: Use Jest + React Native Testing Library for:
  - SMS parsing regex patterns (critical!)
  - Offline sync queue behavior
  - Voice input recording/sending
  - Widget interactions

### Privacy & Security
- **SMS handling**: Parse on-device, never send raw SMS to server
- **API keys**: Always use environment variables, never commit secrets
- **User data**: JSONB context stored encrypted in PostgreSQL
- **JWT tokens**: Short-lived access tokens + refresh token rotation

## Important Context Files

- **`docs/FISCALLY_MVP_SPEC.md`** - Complete technical specification including:
  - Detailed context architecture (Part 1)
  - Full UI/UX wireframes (Part 2)
  - Technical architecture (Part 3)
  - Development phases & API contract (Part 4)
  - All screen mockups (Part 5)

## Key Implementation Notes

### SMS Parsing Patterns (Android)
Filter sender IDs: `HDFCBK`, `SBIINB`, `ICICIB`, etc.

Amount patterns:
```regex
/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i
/debited for (?:Rs\.?|INR)?\s*([\d,]+(?:\.\d{2})?)/i
```

Merchant patterns:
```regex
/(?:at|to|VPA)\s+([A-Za-z][A-Za-z0-9\s]+?)(?:\.|,|$)/i
/\(([A-Z][A-Za-z0-9\s]+?)\)/
```

### Opik Integration
Track these operations with custom metrics:
- Transaction categorization (accuracy)
- Voice parsing (confidence + needs_clarification)
- Chat responses (helpfulness judged by LLM)
- Weekly insight generation (specificity - must contain numbers)

### Notification Best Practices
- **Actionable** - Must allow category selection directly from notification
- **Expandable** - Long-press shows full categorization options + note field
- **Dismissible** - Auto-save with detected category if ignored after 5 minutes
- **Batched** - Don't spam; only send for anomalies, milestones, weekly digest

### Voice Input Flow
1. Record audio (on hold)
2. Send base64 to `/api/v1/transactions/voice`
3. Backend uses Whisper (via OpenAI) for transcription
4. LLM parses transcript to structured transaction
5. Return with `confidence` + optional `clarification_question`
6. Show confirmation UI with edit option

## Working with this Codebase

When implementing features:

1. **Always reference the spec** - `docs/FISCALLY_MVP_SPEC.md` is the source of truth
2. **Context-first design** - Every agent operation should load and potentially update user context
3. **Prompt templates** - Store all LLM prompts in `backend/llm/prompts.py` for version control
4. **Opik everything** - Track all LLM calls for evaluation and debugging
5. **Test SMS parsing thoroughly** - Edge cases in bank SMS formats are critical
6. **Mobile-first UX** - Prioritize speed: < 3 taps to add expense
7. **Offline support** - Use SQLite cache + sync queue for all mobile operations

## Common Pitfalls to Avoid

- ❌ Don't send raw SMS to backend (privacy violation)
- ❌ Don't make preachy or judgmental AI responses
- ❌ Don't notify for every transaction (noise)
- ❌ Don't forget to update PATTERNS context when detecting new behaviors
- ❌ Don't use generic advice ("save more") - always be specific with numbers
- ❌ Don't block user actions while waiting for network
- ❌ Don't commit API keys or secrets
- ❌ Don't ignore the context structure - it's central to the AI system
