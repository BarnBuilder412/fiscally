"""
Goals API Endpoints
===================
Sync goals from mobile and provide AI-calculated budget analysis.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from datetime import datetime

from app.api.deps import CurrentUser
from app.ai.context_manager import ContextManager

router = APIRouter()
context_manager = ContextManager()


class GoalDetail(BaseModel):
    id: str
    label: str
    target_amount: Optional[str] = None
    target_date: Optional[str] = None


class GoalsSyncRequest(BaseModel):
    goals: List[GoalDetail]


class GoalsSyncResponse(BaseModel):
    synced_count: int
    goals: List[Dict[str, Any]]


@router.post("/sync", response_model=GoalsSyncResponse)
async def sync_goals(
    request: GoalsSyncRequest,
    current_user: CurrentUser
):
    """
    Sync goals from mobile app.
    Stores goals with target amounts/dates for AI-powered budgeting.
    """
    user_id = str(current_user.id)
    # Format goals for storage
    goals_to_store = []
    for goal in request.goals:
        goal_data = {
            "id": goal.id,
            "label": goal.label,
            "target_amount": goal.target_amount,
            "target_date": goal.target_date,
            "synced_at": datetime.now().isoformat()
        }
        goals_to_store.append(goal_data)
    
    # Save to user context (creates/updates goals JSONB)
    await context_manager.save_goals(user_id, goals_to_store)
    
    # Return enriched goals with calculated monthly savings
    enriched_goals = await context_manager.load_goals(user_id)
    
    return GoalsSyncResponse(
        synced_count=len(goals_to_store),
        goals=enriched_goals
    )


@router.get("/budget-analysis")
async def get_budget_analysis(
    current_user: CurrentUser
):
    """
    Get AI-calculated budget analysis based on goals.
    Returns monthly savings needed and budget recommendations.
    """
    user_id = str(current_user.id)
    goals = await context_manager.load_goals(user_id)
    
    if not goals:
        return {
            "has_goals": False,
            "message": "No goals set. Add goals to get personalized budget recommendations."
        }
    
    # Calculate totals
    total_monthly_savings = sum(
        g.get("monthly_savings_needed", 0) for g in goals
    )
    
    # Get user's patterns for context
    patterns = await context_manager.load_patterns(user_id)
    avg_monthly_spending = patterns.get("avg_monthly_total", 0) if patterns else 0
    
    # Build recommendations
    recommendations = []
    for goal in goals:
        monthly_needed = goal.get("monthly_savings_needed", 0)
        months_left = goal.get("months_remaining", 0)
        
        if monthly_needed and months_left:
            recommendations.append({
                "goal_id": goal["id"],
                "goal_label": goal.get("label", goal["id"]),
                "target_amount": goal.get("target_amount"),
                "target_date": goal.get("target_date"),
                "monthly_savings_needed": monthly_needed,
                "months_remaining": months_left,
                "status": "on_track" if months_left > 3 else "urgent"
            })
    
    return {
        "has_goals": True,
        "total_monthly_savings_needed": total_monthly_savings,
        "avg_monthly_spending": avg_monthly_spending,
        "goals": recommendations,
        "tip": f"To reach your goals, aim to save ₹{total_monthly_savings:,} per month."
    }
