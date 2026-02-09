# 💰 Fiscally

> Your AI-powered expense companion for effortless tracking and intelligent insights

**Fiscally** is a modern personal finance application that combines AI-driven expense categorization with smart goal tracking. Built with React Native (Expo) and FastAPI, it uses LLMs to automatically categorize transactions and provide contextual financial insights.

---

## ✨ Features

### 🤖 AI-Powered Intelligence
- **Smart Categorization**: Automatic transaction categorization using OpenAI
- **Natural Language Input**: Add expenses via voice or text ("450 swiggy dinner")
- **Contextual Chat**: Ask questions about your spending patterns
- **Anomaly Detection**: Get notified about unusual spending

### 📊 Financial Tracking
- **Real-time Dashboard**: Track income, expenses, and savings
- **Budget Management**: Set monthly budgets and get alerts
- **Goal Tracking**: Priority-based allocation of savings to goals
- **Spending Trends**: Category-wise breakdowns and insights

### 🎯 Smart Goal Allocation
- **Priority-First Funding**: Higher priority goals get full funding first
- **Budget Impact Warnings**: See how overspending affects goal timelines
- **Deadline Tracking**: Monitor progress toward target dates
- **Allocation Matrix**: Detailed view of fund distribution

### 🚀 Modern UX
- **Floating Voice Button**: Keyboard-triggered quick expense entry
- **Animated Splash**: Smooth app launch experience
- **Dark Mode Ready**: Beautiful gradient-based UI
- **Offline Support**: Local-first with backend sync

---

## 🏗️ Architecture

```
fiscally/
├── mobile/          # React Native (Expo) app
│   ├── app/         # File-based routing (expo-router)
│   ├── components/  # Reusable UI components
│   ├── services/    # API client & event bus
│   └── constants/   # Theme, categories, config
│
├── backend/         # FastAPI Python server
│   └── app/
│       ├── ai/      # LLM agents & context management
│       ├── api/     # REST endpoints
│       ├── models/  # SQLAlchemy models
│       └── core/    # Auth, config, dependencies
│
└── docs/            # Documentation
```

---

## 🛠️ Tech Stack

### Frontend (Mobile)
- **Framework**: React Native with Expo SDK 54
- **Routing**: expo-router (file-based)
- **State**: Zustand + AsyncStorage
- **UI**: Custom design system with Ionicons
- **Gradients**: expo-linear-gradient

### Backend
- **Framework**: FastAPI (async Python)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **AI/LLM**: OpenAI GPT-4
- **Observability**: Opik for LLM tracing
- **Auth**: JWT with python-jose

---

## 🚀 Getting Started

### Prerequisites
```bash
# Node.js 18+ and Python 3.11+
node --version
python --version

# PostgreSQL 15+
psql --version

# Expo CLI
npm install -g expo-cli
```

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your:
# - DATABASE_URL
# - OPENAI_API_KEY
# - SECRET_KEY (for JWT)

# Run migrations
alembic upgrade head

# Start server
uvicorn main:app --reload --port 8000
```

Backend will be available at `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### Mobile Setup

```bash
cd mobile

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit with backend URL: API_URL=http://localhost:8000

# Start Expo dev server
npx expo start

# Run on device/simulator
# Press 'a' for Android, 'i' for iOS, 'w' for web
```

---

## 📱 Key Screens

### Onboarding Flow
1. **Welcome** → App intro
2. **Income** → Enter exact monthly income (₹)
3. **Budget** → Set monthly spending budget
4. **Goals** → Select savings goals
5. **Goal Details** → Set target amounts & dates

### Main Tabs
- **Home** (`/`) - Dashboard with spending summary & goals
- **Trends** (`/trends`) - Category breakdowns & insights
- **Add Expense** (`/add-expense`) - Quick transaction entry
- **Chat** (`/chat`) - AI financial assistant
- **Profile** (`/profile`) - Settings & preferences

---

## 🧠 AI Agent System

### Transaction Agent
```python
# Auto-categorizes transactions
"450 swiggy dinner" → Category: "Food Delivery"
"2000 uber to airport" → Category: "Transport"
```

### Context Manager
- Tracks user financial profile
- Calculates goal progress
- Manages priority-based allocation
- Detects spending anomalies

### Chat Agent
Answers questions like:
- "How much did I spend on food this week?"
- "Am I on track for my vacation goal?"
- "Why am I over budget this month?"

---

## 🔍 LLM Observability (Opik)

Fiscally uses **Opik** for complete LLM traceability and evaluation.

### Traced Functions
All AI operations are automatically traced:
- `categorize_transaction` - Auto-categorization calls
- `detect_anomaly` - Spending anomaly detection
- `generate_insight` - Insight generation
- `chat_response` - Chat agent completions
- `parse_voice_input` - Voice transcription parsing

### Viewing Traces
```bash
# Traces are visible at:
# https://www.comet.com/opik/fiscally/traces
```

### Evaluation Experiments
Run evaluation experiments to benchmark LLM performance:

```bash
cd backend
source venv/bin/activate

# Run categorization accuracy evaluation
python -m app.ai.evaluation.experiments

# View results in Opik dashboard
```

### Baseline vs Challenger Pipeline (Hackathon)
Generate judge-ready before/after evidence, thresholds, deltas, and readiness score:

```bash
# 1) Capture baseline (before prompt/model change)
python scripts/opik_eval_pipeline.py \
  --mode baseline-only \
  --run-id opik-baseline-001 \
  --output eval_artifacts/baseline_latest.json \
  --baseline-output eval_artifacts/baseline_latest.json \
  --min-readiness-score 0 \
  --tag hackathon --tag opik-bounty

# 2) Apply your improvement (prompt/model/tool flow), then run challenger
python scripts/opik_eval_pipeline.py \
  --mode challenger-only \
  --run-id opik-challenger-001 \
  --baseline-artifact eval_artifacts/baseline_latest.json \
  --output eval_artifacts/latest.json \
  --chat-feedback-score 0.82 \
  --fallback-rate 0.07 \
  --feedback-sample-size 60 \
  --min-feedback-score 0.75 \
  --max-fallback-rate 0.15 \
  --max-feedback-drop 0.03 \
  --max-fallback-regression 0.03 \
  --min-readiness-score 9.2 \
  --tag hackathon --tag opik-bounty
```

Validate artifact gate independently:

```bash
python scripts/eval_gate.py \
  --artifact eval_artifacts/latest.json \
  --baseline-artifact eval_artifacts/baseline_latest.json \
  --min-readiness-score 9.2

# Readiness + deltas are now persisted in latest.json
```

Read artifact via API:

```bash
GET /api/v1/evals/latest
```

### Evaluation Metrics
- **Categorization Accuracy**: % of correct category predictions
- **Hallucination Check**: LLM-judged factual accuracy
- **Context Relevance**: How well responses use provided context
- **Moderation**: Content safety scoring

### Configuration
```bash
# Required in .env:
OPIK_API_KEY=your_opik_api_key
OPIK_WORKSPACE=your_workspace_name
OPIK_PROJECT_NAME=fiscally
```

### SMS Privacy
- SMS is parsed on-device.
- Raw SMS content is not accepted by backend ingest endpoints.
- Send only structured transaction fields + hashed SMS signature for idempotency.

---

## 🔑 Key Concepts

### Budget-Based Allocation
```
Savings Pool = Income - Budget (not actual expenses)
```
Goals are funded from planned savings, not leftovers.

### Priority-First Distribution
```
If P1 needs ₹500 and P2 needs ₹300 but only ₹600 available:
  P1 gets ₹500 (full)
  P2 gets ₹100 (remaining)
```

### Allocation Matrix
```json
{
  "total_needed": 800,
  "total_available": 600,
  "shortfall": 200,
  "budget_exceeded": false,
  "goals": [
    {
      "id": "vacation",
      "ideal_monthly": 500,
      "allocated_monthly": 500,
      "is_underfunded": false,
      "deadline_at_risk": false
    },
    {
      "id": "laptop",
      "ideal_monthly": 300,
      "allocated_monthly": 100,
      "is_underfunded": true,
      "deadline_at_risk": true
    }
  ]
}
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Mobile Tests
```bash
cd mobile
npm test
```

---

## 📡 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Create account
- `POST /api/v1/auth/login` - Get JWT token

### Transactions
- `GET /api/v1/transactions` - List transactions
- `POST /api/v1/transactions` - Create transaction
- `DELETE /api/v1/transactions/{id}` - Delete transaction

### Goals
- `GET /api/v1/goals/progress` - Get goal allocations
- `POST /api/v1/goals/sync` - Sync from mobile

### AI
- `POST /api/v1/ai/chat` - Chat with assistant
- `POST /api/v1/ai/categorize` - Auto-categorize transaction

---

## 🤝 Contributing

### Code Style
- **Python**: Black + Ruff (backend)
- **TypeScript**: ESLint (mobile)

### Commit Guidelines
```
feat: Add voice input button
fix: Correct goal allocation formula
docs: Update README setup steps
```

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feat/amazing-feature`)
3. Commit changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to branch (`git push origin feat/amazing-feature`)
5. Open Pull Request

---

## 🐛 Troubleshooting

### "Cannot connect to backend"
- Ensure backend is running on correct port
- Check `API_URL` in mobile `.env`
- Verify network connectivity (use IP, not localhost on device)

### "Database connection failed"
- Check PostgreSQL is running
- Verify `DATABASE_URL` in backend `.env`
- Run migrations: `alembic upgrade head`

### "OpenAI API error"
- Verify `OPENAI_API_KEY` in backend `.env`
- Check API quota/billing
- Review Opik dashboard for traces

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev)
- AI powered by [OpenAI](https://openai.com)
- Observability by [Opik](https://www.comet.com/site/products/opik/)

---

## 📬 Contact

For questions or feedback, please open an issue on GitHub.

---

**Happy tracking! 💸**
