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
# Setup
cd backend
pip install -r requirements.txt

# Env
cp .env.example .env  # then edit values

# Database migrations
alembic upgrade head

# Run dev server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Quick AI sanity check (requires OPENAI_API_KEY)
python test_ai.py

# Lint/format
black .
ruff check .
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

### Backend Structure (Current)
```
backend/
├── main.py
├── requirements.txt
├── .env.example
├── alembic.ini
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 20260130_001_initial_schema.py
└── app/
    ├── __init__.py
    ├── config.py
    ├── database.py
    ├── core/
    │   └── security.py
    ├── models/
    │   └── user.py
    ├── schemas/
    │   ├── auth.py
    │   └── user.py
    ├── api/
    │   ├── deps.py
    │   └── v1/
    │       ├── router.py
    │       └── endpoints/
    │           └── auth.py
    └── ai/
        ├── prompts.py
        ├── llm_client.py
        ├── context_manager.py
        └── agents.py
```

### Backend Structure (Planned / Target)
- Keep extending under `backend/app/`.
- New API endpoints go in `backend/app/api/v1/endpoints/`.
- Non-HTTP business logic should live outside `endpoints/` (e.g. `backend/app/ai/`, later `backend/app/services/`).

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
- `POST /api/v1/auth/refresh` - Token refresh (rotation)
- `POST /api/v1/auth/logout` - Invalidate refresh token
- `GET /api/v1/auth/me` - Get current user + context

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
2. **Context-first design** - Every AI operation should load full context (PROFILE + PATTERNS + INSIGHTS + GOALS + MEMORY) and update it when needed
3. **Prompt templates** - Store all LLM prompts in `backend/app/ai/prompts.py` (single source of truth)
4. **LLM entrypoint** - Use `backend/app/ai/llm_client.py` for OpenAI calls (don’t call OpenAI directly from endpoints)
5. **Agent orchestration** - Use `backend/app/ai/agents.py` for transaction/chat/insights flows; keep endpoints thin
6. **DB↔Context boundary** - `backend/app/ai/context_manager.py` is the interface between agents and the database layer
7. **Keep `.env.example` in sync** - If you add an env var, update `backend/.env.example`
8. **Keep `requirements.txt` in sync** - If you add a dependency, update `backend/requirements.txt`

## Common Pitfalls to Avoid

- ❌ Don't send raw SMS to backend (privacy violation)
- ❌ Don't make preachy or judgmental AI responses
- ❌ Don't notify for every transaction (noise)
- ❌ Don't forget to update PATTERNS context when detecting new behaviors
- ❌ Don't use generic advice ("save more") - always be specific with numbers
- ❌ Don't block user actions while waiting for network
- ❌ Don't commit API keys or secrets
- ❌ Don't ignore the context structure - it's central to the AI system

---

## Current Development Status (Handoff)

### Where we are (as of 2026-02-06)
- **Trends Page Refined**: Expandable categories, top-3 view, and agentic sub-categorization implemented.
- **Home Page Enhanced**: Added "Agentic Coach" card and goal tracking visualization.
- **Backend Foundation**: Auth, DB, and basic API endpoints are stable.
- **Next Focus**: Advanced AI integration (SMS parsing, pattern detection) and Voice Input.

### How to keep development “continuous” across multiple agents
- Treat this file (`AGENTS.md`) as the shared handoff doc:
  - When you complete a meaningful slice (endpoint + schema + tests), update **Implementation Progress** and the **API Contract**.
  - If you add an env var or dependency, also update `backend/.env.example` and `backend/requirements.txt`.
- Keep endpoints thin; orchestration belongs in `backend/app/ai/agents.py` and DB/context logic in the model/service layer.
- Don’t introduce a new “second” prompt file; prompts must live in `backend/app/ai/prompts.py`.

## Implementation Progress

### Phase 1: Backend Foundation ✅ COMPLETE
**Status:** Core backend foundation is in place (FastAPI + DB schema + auth + AI scaffolding)

#### Step 1: FastAPI Project Setup ✅
- `backend/requirements.txt` - All dependencies (FastAPI, SQLAlchemy, JWT, bcrypt, etc.)
- `backend/app/config.py` - Pydantic settings with env vars support
- `backend/app/database.py` - SQLAlchemy engine + session management
- `backend/main.py` - FastAPI app with CORS, health check, API router

#### Step 2: PostgreSQL Schema ✅
- `backend/app/models/user.py` - User model with:
  - UUID primary key
  - Email/password auth fields
  - JSONB context columns: `profile`, `patterns`, `insights`, `goals`, `memory`
  - Refresh token hash for JWT rotation
- `backend/app/models/user.py` - Transaction model with:
  - Amount (string for precision), currency, merchant, category
  - Source tracking (manual/voice/sms)
  - AI metadata (confidence, anomaly flags)
- `backend/alembic/` - Migration setup with initial schema

#### Step 3: API Structure ✅
- `backend/app/schemas/auth.py` - Request/response schemas:
  - `SignupRequest`, `LoginRequest`, `RefreshTokenRequest`
  - `TokenResponse`, `MessageResponse`
- `backend/app/schemas/user.py` - User schemas:
  - `UserResponse` (includes all context fields)
  - `ProfileUpdate` for PATCH operations
- `backend/app/api/deps.py` - FastAPI dependencies:
  - `get_db()` - Database session injection
  - `get_current_user()` - JWT validation + user lookup
  - Type aliases: `DBSession`, `CurrentUser`, `ActiveUser`
- `backend/app/core/security.py` - Security utilities:
  - Password hashing (bcrypt)
  - JWT creation/validation (access + refresh tokens)
  - Token hashing for rotation security

#### Step 4: Auth Endpoints ✅
- `backend/app/api/v1/endpoints/auth.py` - Auth routes:
  - `POST /api/v1/auth/signup` - Register + return tokens
  - `POST /api/v1/auth/login` - Authenticate + return tokens
  - `POST /api/v1/auth/refresh` - Token rotation
  - `POST /api/v1/auth/logout` - Invalidate refresh token
  - `GET /api/v1/auth/me` - Get current user + context
- `backend/app/api/v1/router.py` - API router wiring

#### Step 5: AI Scaffolding ✅
- `backend/app/ai/prompts.py` - Prompt library + system personality (SOUL)
- `backend/app/ai/llm_client.py` - Async OpenAI wrapper (optional Serper search fallback)
- `backend/app/ai/context_manager.py` - Context interface (DB boundary; currently TODO stubs)
- `backend/app/ai/agents.py` - Orchestration for transaction/chat/insights/alerts

#### Backend File Structure (Current)
```
backend/
├── main.py                          # FastAPI app entry
├── requirements.txt                 # Python dependencies
├── .env.example                     # Environment template
├── alembic.ini                      # Alembic config
├── alembic/                         # Database migrations
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 20260130_001_initial_schema.py
└── app/
    ├── __init__.py
    ├── config.py                    # Settings (env vars)
    ├── database.py                  # SQLAlchemy setup
    ├── api/
    │   ├── __init__.py
    │   ├── deps.py                  # Dependencies (auth, db)
    │   └── v1/
    │       ├── __init__.py
    │       ├── router.py            # API router
    │       └── endpoints/
    │           ├── __init__.py
    │           └── auth.py          # Auth endpoints
    ├── ai/                          # LLM + agent orchestration
    │   ├── prompts.py
    │   ├── llm_client.py
    │   ├── context_manager.py
    │   └── agents.py
    ├── core/
    │   ├── __init__.py
    │   └── security.py              # JWT + password utils
    ├── models/
    │   ├── __init__.py
    │   └── user.py                  # User + Transaction models
    └── schemas/
        ├── __init__.py
        ├── auth.py                  # Auth request/response schemas
        └── user.py                  # User schemas
```

#### To Run Backend
```bash
cd backend
pip install -r requirements.txt

# Set environment variables (or create .env file)
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fiscally"
export SECRET_KEY="your-random-secret-key"
export DEBUG=true

# Run migrations
alembic upgrade head

# Start server
uvicorn main:app --reload --port 8000
```

### Phase 2: Core Transaction Flow 🚧 IN PROGRESS
**Status:** Transaction CRUD + Profile endpoints implemented. ContextManager wired to DB. LLM integration pending.

#### Completed (2026-01-30)

##### Transaction Schemas ✅
- `backend/app/schemas/transaction.py`:
  - `TransactionCreate` - Request schema (amount, merchant, category, note, source, transaction_at)
  - `TransactionResponse` - Single transaction response with AI metadata
  - `TransactionListResponse` - Paginated list with total count

##### Transaction Endpoints ✅
- `backend/app/api/v1/endpoints/transactions.py`:
  - `POST /api/v1/transactions` - Create transaction (basic save, no AI yet)
  - `GET /api/v1/transactions` - List with filters (limit, offset, category)
  - `GET /api/v1/transactions/{id}` - Get single transaction

##### Profile Endpoints ✅
- `backend/app/api/v1/endpoints/profile.py`:
  - `GET /api/v1/profile` - Returns full user context (profile, patterns, goals, memory, insights)
  - `PATCH /api/v1/profile` - Update profile JSONB with deep merge

##### ContextManager Wired to DB ✅
- `backend/app/ai/context_manager.py` - All TODO stubs replaced with real SQLAlchemy queries:
  - `load_profile()`, `load_patterns()`, `load_goals()`, `load_memory()`, `load_active_insights()`
  - `update_patterns()`, `add_memory_fact()`, `add_insight()`
  - `get_transactions()`, `get_spending_summary()`, `get_category_total()`

##### Router Updated ✅
- `backend/app/api/v1/router.py` - Added transactions and profile routers

##### Infrastructure ✅
- Virtual environment created (`backend/venv/`)
- Dependencies installed
- PostgreSQL running in Docker (`fiscally-db`)
- Migrations applied

#### Testing Results (2026-01-30)
✅ Backend server healthy (`GET /health` = 200). PostgreSQL container (fiscally-db) running.

- Auth: signup, login, refresh, and /auth/me all working.
- Transactions: create, list (with pagination), filter by category, and get by id working.
- Profile: GET returns full context; PATCH performs deep merge and persists.

Example created data:
- Transactions: Swiggy ₹450 (food_delivery), Uber ₹180 (transport), Amazon ₹2,500 (shopping).
- Profile updated: identity.name=Kaushal, currency=INR, payday=1; preferences.voice_enabled=true, notification_style=actionable.

#### Remaining Phase 2 Work
- [ ] Voice transaction parsing (`POST /api/v1/transactions/voice`) - needs Whisper integration
- [ ] **LLM Team**: Wire `TransactionAgent` in `POST /transactions` for:
  - Auto-categorization when category is None
  - Anomaly detection (set `is_anomaly`, `anomaly_reason`)
  - Pattern updates (update user's `patterns` context)
- [ ] Add tests for logout and negative/error cases (invalid tokens, unauthorized)

#### Notes for contributors (multi-agent safe)
- Keep endpoints thin; put orchestration in `backend/app/ai/agents.py` and DB logic in the model/service layer.
- ContextManager is now fully wired to the database.
- Transaction endpoints have basic CRUD; AI logic needs to be plugged in.
- When adding new routes, also update the **API Contract** section above.
- Backend foundation is stable and ready for AI agent integration.

---

## Mobile App Status (Updated 2026-02-06)

### Phase: UI/UX Refactoring ✅ COMPLETED

The mobile app underwent a major UI refactoring to implement a new "Stitch" cream/tan theme and redesigned navigation.

#### Completed Work

##### Navigation Refactor ✅
- **Custom Tab Bar** (`mobile/app/(tabs)/_layout.tsx`):
  - 4 main tabs: Home, Trends, Wallet, Profile
  - Centered "+" Add button that floats half above the tab bar (56px, primary color with shadow)
  - Floating Chat button on bottom-right corner (48px, above tab bar)
  - Chat tab hidden from tab bar but accessible via floating button
  - Stats and Settings tabs hidden (replaced by Trends and Profile)

##### New Screens Created ✅
- **Trends** (`mobile/app/(tabs)/trends.tsx`):
  - Analytics/spending breakdown screen
  - Monthly spending summary with comparison badge
  - AI insight card (Fiscally AI tips)
  - Category breakdown with progress bars and status badges
  - Actionable tip card at bottom
  
- **Wallet** (`mobile/app/(tabs)/wallet.tsx`):
  - Total balance overview with Send/Receive/Transfer actions
  - Accounts list (Bank, Credit Card, Cash, Digital wallets)
  - Recent transfers section
  
- **Profile** (`mobile/app/(tabs)/profile.tsx`):
  - User profile section with avatar and Pro badge
  - Automation settings (SMS tracking, Voice input toggles)
  - General settings (Notifications, Export data, Privacy)
  - Logout button with version info

##### Theme Updates ✅
- **Updated theme colors** (`mobile/constants/theme.ts`):
  - Primary: `#8B7E66` (warm taupe)
  - Background: `#F9F7F2` (cream)
  - Surface: `#FFFFFF`
  - Gray scale refined for cream theme consistency
  - Category accent colors: warm-orange, warm-blue, warm-purple, warm-green

##### NativeWind Integration ✅
- Installed dependencies: `nativewind`, `tailwindcss@3.4.17`, `react-native-worklets`, `react-native-css-interop`
- Configured: `tailwind.config.js`, `babel.config.js`, `metro.config.js`
- Global CSS imported in `mobile/app/_layout.tsx`
- Ready for Tailwind `className` usage in components

##### Home Screen Updates ✅
- Removed floating AddExpenseButton (now in custom tab bar)
- Adjusted scroll padding for new tab bar height
- Added "Agentic Coach" card with dynamic, context-aware tips
- Integrated Goal tracking visualization

##### Trends Page Refinements (2026-02-06) ✅
- **Agentic Sub-categorization**: Automatically groups sub-categories under parents (e.g., "Swiggy" -> Food Delivery).
- **Expandable Lists**: Tap categories to reveal transaction details/sub-categories.
- **Top 3 View**: Shows top 3 categories by default with "Show More" toggle to reduce clutter.
- **Actionable Insights**: Enhanced tip card with budget warnings and saving opportunities.

#### Mobile File Structure (Current)
```
mobile/app/
├── (tabs)/
│   ├── _layout.tsx      # Custom tab bar with centered Add button + floating Chat
│   ├── index.tsx        # Home dashboard
│   ├── trends.tsx       # NEW: Analytics/spending breakdown
│   ├── wallet.tsx       # NEW: Accounts overview
│   ├── profile.tsx      # NEW: Settings (replaces settings.tsx)
│   ├── chat.tsx         # Hidden tab, accessible via floating button
│   ├── stats.tsx        # Hidden (replaced by trends)
│   └── settings.tsx     # Hidden (replaced by profile)
├── (auth)/
│   ├── login.tsx
│   └── signup.tsx
├── add-expense.tsx      # Modal for adding expenses
├── voice-input.tsx      # Voice recording screen
├── transactions.tsx     # Full transaction list
└── onboarding.tsx       # Onboarding flow
```

#### Design Reference
The UI follows the "Stitch" design system from HTML mockups in:
- `stitch_home_dashboard/` - Home and dashboard designs
- `stitch_home_dashboard (4)/` - Analytics/Stats design
- `stitch_home_dashboard (5)/` - Settings/Profile design
- `stitch_home_dashboard (6)/` - Welcome/onboarding
- `stitch_home_dashboard (7)/` - Onboarding income selection
- `stitch_home_dashboard (8)/` - SMS permission onboarding

#### Remaining Mobile Work
- [ ] Implement SMS parsing (Android)
- [ ] Voice input integration with backend
- [ ] Push notifications setup
- [ ] Polish transitions and animations

#### Commands
```bash
cd mobile
pnpm install          # Install dependencies
pnpm start -- --clear # Start Metro with cache clear
pnpm typecheck        # Run TypeScript checks
```

#### Notes for Mobile Contributors
- Use `Colors`, `Spacing`, `FontSize`, etc. from `@/constants/theme` for consistency
- All screens use `SafeAreaView` with `edges={['top']}` and bottom padding for tab bar
- Tab bar height is ~60px + safe area insets
- Floating Chat button is positioned at `bottom: 70 + insets.bottom`
- NativeWind is configured but most components still use StyleSheet (gradual migration)
- The `@tailwind` lint warnings in `global.css` are false positives from IDE (NativeWind works)

