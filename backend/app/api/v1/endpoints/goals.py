"""
Goals API Endpoints
===================
Sync goals from mobile and provide AI-calculated budget analysis.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from datetime import datetime

from app.api.deps import CurrentUser, get_db
from app.ai.context_manager import ContextManager
from app.ai.prompts import get_currency_symbol
from sqlalchemy.orm import Session

router = APIRouter()


class GoalDetail(BaseModel):
    id: str
    label: str
    target_amount: Optional[str] = None
    target_date: Optional[str] = None
    priority: Optional[int] = None


class GoalsSyncRequest(BaseModel):
    goals: List[GoalDetail]


class GoalsSyncResponse(BaseModel):
    synced_count: int
    goals: List[Dict[str, Any]]


@router.post("/sync", response_model=GoalsSyncResponse)
async def sync_goals(
    request: GoalsSyncRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """
    Sync goals from mobile app.
    Stores goals with target amounts/dates for AI-powered budgeting.
    """
    user_id = str(current_user.id)
    ctx = ContextManager(db)
    
    # Format goals for storage
    goals_to_store = []
    for goal in request.goals:
        print(f"Syncing goal: {goal.label}, Priority: {goal.priority}")
        goal_data = {
            "id": goal.id,
            "label": goal.label,
            "target_amount": goal.target_amount,
            "target_date": goal.target_date,
            "priority": goal.priority,
            "synced_at": datetime.now().isoformat()
        }
        goals_to_store.append(goal_data)
    
    # Save to user context (creates/updates goals JSONB)
    await ctx.save_goals(user_id, goals_to_store)
    
    # Return enriched goals with calculated monthly savings
    enriched_goals = await ctx.load_goals(user_id)
    
    return GoalsSyncResponse(
        synced_count=len(goals_to_store),
        goals=enriched_goals or []
    )


@router.get("/budget-analysis")
async def get_budget_analysis(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    """
    Get AI-calculated budget analysis based on goals.
    Returns monthly savings needed and budget recommendations.
    """
    user_id = str(current_user.id)
    ctx = ContextManager(db)
    goals = await ctx.load_goals(user_id)
    
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
    patterns = await ctx.load_patterns(user_id)
    avg_monthly_spending = patterns.get("avg_monthly_total", 0) if patterns else 0
    profile = await ctx.load_profile(user_id)
    currency_code = (
        profile.get("identity", {}).get("currency")
        or profile.get("currency")
        or "INR"
    )
    symbol = get_currency_symbol(currency_code)
    
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
        "tip": f"To reach your goals, aim to save {symbol}{total_monthly_savings:,} per month."
    }


@router.get("/progress")
async def get_goal_progress(
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """
    Get real-time goal progress based on salary, expenses, and priorities.
    
    This endpoint calculates:
    - Monthly savings = Salary - Actual Expenses
    - Goal progress based on priorities
    - Projected completion dates
    - On-track status vs deadlines
    
    Returns:
        - monthly_salary: user's income
        - monthly_budget: spending limit
        - monthly_expenses: actual spending
        - monthly_savings: available for goals
        - budget_used_percentage: expenses/budget
        - goals: list of goals with progress details
    """
    from app.ai.context_manager import ContextManager
    
    user_id = str(current_user.id)
    ctx = ContextManager(db)
    
    # Calculate full goal progress
    progress = await ctx.calculate_goal_progress(user_id)
    
    # Add helpful tip based on savings
    monthly_savings = progress.get("monthly_savings", 0)
    goals = progress.get("goals", [])
    
    tip = None
    if monthly_savings == 0:
        tip = "Set your income in preferences to see goal projections."
    elif len(goals) == 0:
        tip = "Add savings goals to track your progress."
    elif monthly_savings > 0:
        on_track_count = sum(1 for g in goals if g.get("on_track", True))
        if on_track_count == len(goals):
            tip = f"Great! You're on track for all {len(goals)} goal(s). Keep it up! 🎉"
        else:
            behind_goals = [g["label"] for g in goals if not g.get("on_track", True)]
            tip = f"You're behind on: {', '.join(behind_goals[:2])}. Consider increasing savings."
    
    return {
        **progress,
        "tip": tip,
    }


@router.post("/save-amount")
async def save_to_goal(
    goal_id: str,
    amount: float,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """
    Record a savings contribution to a specific goal.
    
    Use this when user manually allocates savings to a goal.
    """
    from app.ai.context_manager import ContextManager
    
    user_id = str(current_user.id)
    ctx = ContextManager(db)
    
    await ctx.update_goal_saved_amount(user_id, goal_id, amount)
    profile = await ctx.load_profile(user_id)
    currency_code = (
        profile.get("identity", {}).get("currency")
        or profile.get("currency")
        or "INR"
    )
    symbol = get_currency_symbol(currency_code)
    
    return {"message": f"Added {symbol}{amount:,.0f} to goal", "goal_id": goal_id}
