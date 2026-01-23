from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class ProfileCreate(BaseModel):
    name: str
    email: str
    monthlyIncome: str
    monthlyExpenses: str
    savings: str
    riskTolerance: int
    investmentExperience: str
    financialGoal: str

# In-memory storage for demo
profiles = {}

@router.post("")
async def create_profile(profile: ProfileCreate):
    profiles[profile.email] = profile.model_dump()
    return {"message": "Profile created", "profile": profile}

@router.get("/{email}")
async def get_profile(email: str):
    if email in profiles:
        return profiles[email]
    return {"error": "Profile not found"}
