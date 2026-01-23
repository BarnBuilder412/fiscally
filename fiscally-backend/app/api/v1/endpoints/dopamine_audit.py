from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter()

class EmotionalTag(BaseModel):
    stressLevel: int
    emotion: str
    note: Optional[str] = None

class Transaction(BaseModel):
    id: str
    date: str
    merchant: str
    amount: float
    category: str
    emotionalTag: Optional[EmotionalTag] = None

# Mock transactions
MOCK_TRANSACTIONS = [
    {"id": "tx_1", "date": "2026-01-22T23:30:00Z", "merchant": "Amazon", "amount": 299.99, "category": "Electronics", "emotionalTag": {"stressLevel": 9, "emotion": "anxious", "note": "Code isn't working"}},
    {"id": "tx_2", "date": "2026-01-22T14:00:00Z", "merchant": "Starbucks", "amount": 8.50, "category": "Food", "emotionalTag": {"stressLevel": 2, "emotion": "calm", "note": "Coffee with friend"}},
    {"id": "tx_3", "date": "2026-01-21T02:15:00Z", "merchant": "Steam", "amount": 59.99, "category": "Entertainment", "emotionalTag": {"stressLevel": 7, "emotion": "bored", "note": "Couldn't sleep"}},
]

transactions = list(MOCK_TRANSACTIONS)

@router.get("/transactions")
async def get_transactions():
    return transactions

@router.post("/transactions")
async def add_transaction(tx: Transaction):
    transactions.insert(0, tx.model_dump())
    return {"message": "Transaction added", "transaction": tx}

@router.get("/insights")
async def get_insights():
    high_stress = sum(1 for t in transactions if t.get("emotionalTag", {}).get("stressLevel", 0) >= 7)
    high_stress_total = sum(t["amount"] for t in transactions if t.get("emotionalTag", {}).get("stressLevel", 0) >= 7)
    return {
        "highStressCount": high_stress,
        "highStressTotal": high_stress_total,
        "insight": "You spend 3x more when stress level > 7",
        "recommendation": "Try a 4-hour cooling period for purchases > $100"
    }
