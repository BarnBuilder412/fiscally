from fastapi import APIRouter

from app.api.v1.endpoints import auth, transactions, profile, chat, goals, insights

api_router = APIRouter()

# Authentication endpoints
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Transaction endpoints
api_router.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])

# Profile endpoints
api_router.include_router(profile.router, prefix="/profile", tags=["Profile"])

# Chat and AI insights endpoints
api_router.include_router(chat.router, prefix="/chat", tags=["Chat & AI"])

# Dedicated insights endpoint (GET /api/v1/insights)
api_router.include_router(insights.router, prefix="/insights", tags=["Insights"])

# Goals endpoints
api_router.include_router(goals.router, prefix="/goals", tags=["Goals"])
