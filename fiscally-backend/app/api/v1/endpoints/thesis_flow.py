from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Literal
import asyncio

router = APIRouter()

class InvestmentQuery(BaseModel):
    query: str
    user_risk_tolerance: int = 5

class InvestmentMemo(BaseModel):
    recommendation: Literal["REJECT", "NEUTRAL", "RECOMMEND"]
    asset: str
    summary: str
    price: str
    marketCap: str
    change30d: str
    risks: List[dict]
    sources: List[dict]
    alternatives: List[str]

queries_history = []

@router.post("/research")
async def research_investment(query: InvestmentQuery):
    # Simulate research delay
    await asyncio.sleep(2)
    
    query_lower = query.query.lower()
    is_rocket = "rocketcoin" in query_lower
    is_bitcoin = "bitcoin" in query_lower
    
    if is_rocket:
        memo = {
            "recommendation": "REJECT",
            "asset": "RocketCoin",
            "summary": "High-risk asset with multiple red flags. Not aligned with your risk profile.",
            "price": "$0.0023",
            "marketCap": "$2.3M",
            "change30d": "-67%",
            "risks": [
                {"label": "Volatility", "value": "94%", "warning": True},
                {"label": "Whale Concentration", "value": "3 wallets hold 80%", "warning": True},
            ],
            "sources": [
                {"name": "CoinDesk", "note": "RocketCoin faces scrutiny", "date": "Jan 20, 2026"},
                {"name": "CoinGecko", "note": "Price data", "date": "Jan 23, 2026"},
            ],
            "alternatives": ["VOO", "VTI", "USDC Yield"],
        }
    elif is_bitcoin:
        memo = {
            "recommendation": "NEUTRAL",
            "asset": "Bitcoin",
            "summary": "Established cryptocurrency with moderate risk. Consider your timeline.",
            "price": "$98,450",
            "marketCap": "$1.9T",
            "change30d": "+12%",
            "risks": [
                {"label": "Volatility", "value": "45%", "warning": True},
                {"label": "Liquidity", "value": "High", "warning": False},
            ],
            "sources": [
                {"name": "CoinDesk", "note": "Bitcoin ETF inflows", "date": "Jan 22, 2026"},
            ],
            "alternatives": ["Bitcoin ETF", "Dollar-cost averaging"],
        }
    else:
        memo = {
            "recommendation": "RECOMMEND",
            "asset": "Tesla (TSLA)",
            "summary": "Growth stock with reasonable alignment to moderate goals.",
            "price": "$412.50",
            "marketCap": "$1.3T",
            "change30d": "+8%",
            "risks": [
                {"label": "Volatility", "value": "35%", "warning": True},
                {"label": "EV Leader", "value": "Yes", "warning": False},
            ],
            "sources": [
                {"name": "Reuters", "note": "Tesla Q4 deliveries", "date": "Jan 20, 2026"},
            ],
            "alternatives": ["QQQ", "EV ETFs"],
        }
    
    queries_history.append({"query": query.query, "memo": memo})
    return {"memo": memo, "hallucinations_detected": 0}

@router.get("/history")
async def get_query_history():
    return queries_history
