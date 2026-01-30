from fastapi import APIRouter

from app.api.v1.endpoints import auth, transactions, profile

api_router = APIRouter()

# Authentication endpoints
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Transaction endpoints
api_router.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])

# Profile endpoints
api_router.include_router(profile.router, prefix="/profile", tags=["Profile"])

