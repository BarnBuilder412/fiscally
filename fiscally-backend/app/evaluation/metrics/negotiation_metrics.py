"""
SubZero Negotiation Evaluation Metrics
Custom metrics for evaluating agent performance per SRS requirements.
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class MetricResult:
    """Result of a metric evaluation."""
    name: str
    score: float  # 0.0 to 1.0
    reason: str
    metadata: Optional[Dict[str, Any]] = None


class NegotiationTenacityScore:
    """
    Measures if the agent persisted toward the user's goal.
    
    Per SRS (OEM-2.1):
    - Metric: Did agent reject bad retention offer when user wanted full refund?
    - Target: 8/10 negotiations should show high tenacity
    
    Scoring:
    - 1.0: Agent pushed for full refund, rejected inadequate offers
    - 0.7: Agent countered once before accepting retention
    - 0.5: Agent accepted first retention offer
    - 0.3: Agent gave up after first rejection
    - 0.0: Agent didn't pursue user's goal at all
    """
    
    name = "NegotiationTenacityScore"
    
    def evaluate(
        self,
        user_goal: str,
        negotiation_rounds: int,
        vendor_offer_type: str,
        final_outcome: str,
        retention_offers_rejected: int = 0,
    ) -> MetricResult:
        """
        Evaluate tenacity based on negotiation behavior.
        """
        score = 0.0
        reasons = []
        
        # If goal was full refund
        if user_goal == "full_refund":
            # Best case: Got the refund
            if final_outcome == "refund_approved":
                score = 1.0
                reasons.append("Achieved full refund goal")
            
            # Rejected retention offers and kept pushing
            elif retention_offers_rejected > 0:
                score = 0.8 + (min(retention_offers_rejected, 2) * 0.1)
                reasons.append(f"Rejected {retention_offers_rejected} retention offer(s)")
            
            # Accepted retention but negotiated
            elif final_outcome == "retention_offer_accepted" and negotiation_rounds > 1:
                score = 0.5
                reasons.append("Negotiated before accepting retention")
            
            # Gave up easily
            elif final_outcome == "refund_denied" and negotiation_rounds <= 1:
                score = 0.3
                reasons.append("Gave up after first attempt")
            
            # Accepted first offer (low tenacity)
            elif final_outcome == "retention_offer_accepted" and negotiation_rounds == 1:
                score = 0.4
                reasons.append("Accepted first retention offer without pushing back")
            
            else:
                score = 0.5
                reasons.append("Standard negotiation effort")
        
        else:
            # For non-refund goals, different scoring
            if final_outcome in ["refund_approved", "retention_offer_accepted"]:
                score = 0.8
                reasons.append("Achieved a positive outcome")
            else:
                score = 0.5
                reasons.append("Made reasonable effort")
        
        # Bonus for multiple rounds (persistence)
        if negotiation_rounds >= 2:
            score = min(1.0, score + 0.1)
            reasons.append(f"Persisted for {negotiation_rounds} rounds")
        
        return MetricResult(
            name=self.name,
            score=round(score, 2),
            reason="; ".join(reasons),
            metadata={
                "user_goal": user_goal,
                "rounds": negotiation_rounds,
                "final_outcome": final_outcome,
            }
        )


class GoalAlignmentScore:
    """
    Measures if the final outcome matched the user's stated goal.
    
    Per SRS (OEM-2.2):
    - Metric: Did final outcome match user's stated goal?
    - Target: 9/10 negotiations should achieve user's goal
    
    Scoring:
    - 1.0: Exact goal achieved
    - 0.75: Partial goal achieved (e.g., partial refund when wanted full)
    - 0.5: Alternative acceptable outcome (e.g., good retention offer)
    - 0.25: Outcome somewhat related to goal
    - 0.0: Goal not achieved at all
    """
    
    name = "GoalAlignmentScore"
    
    def evaluate(
        self,
        user_goal: str,
        final_outcome: str,
        amount_saved: float,
        original_amount: float,
    ) -> MetricResult:
        """
        Evaluate how well the outcome aligns with the user's goal.
        """
        score = 0.0
        reasons = []
        
        goal_outcome_map = {
            "full_refund": {
                "refund_approved": 1.0,
                "retention_offer_accepted": 0.5,  # Got something at least
                "refund_denied": 0.0,
            },
            "partial_refund": {
                "refund_approved": 1.0,  # Got even more than asked
                "retention_offer_accepted": 0.7,
                "refund_denied": 0.0,
            },
            "better_deal": {
                "retention_offer_accepted": 1.0,
                "refund_approved": 0.8,  # Different outcome but good
                "refund_denied": 0.0,
            },
            "cancel_only": {
                "refund_approved": 1.0,
                "cancelled": 1.0,
                "retention_offer_accepted": 0.3,  # Didn't actually cancel
                "refund_denied": 0.2,  # May still have cancelled
            },
        }
        
        # Get base score from mapping
        goal_outcomes = goal_outcome_map.get(user_goal, {})
        score = goal_outcomes.get(final_outcome, 0.25)
        
        # Adjust based on amount saved
        if original_amount > 0:
            savings_ratio = amount_saved / original_amount
            if savings_ratio >= 1.0:
                score = max(score, 0.9)
                reasons.append(f"Saved full amount (${amount_saved:.2f})")
            elif savings_ratio >= 0.5:
                score = max(score, 0.6)
                reasons.append(f"Saved {savings_ratio*100:.0f}% (${amount_saved:.2f})")
            elif amount_saved > 0:
                score = max(score, 0.4)
                reasons.append(f"Saved ${amount_saved:.2f}")
        
        # Add reason based on outcome
        if score >= 0.9:
            reasons.append("Goal achieved")
        elif score >= 0.6:
            reasons.append("Partial goal achieved")
        elif score >= 0.3:
            reasons.append("Alternative outcome")
        else:
            reasons.append("Goal not achieved")
        
        return MetricResult(
            name=self.name,
            score=round(score, 2),
            reason="; ".join(reasons),
            metadata={
                "user_goal": user_goal,
                "final_outcome": final_outcome,
                "amount_saved": amount_saved,
                "original_amount": original_amount,
            }
        )


class NegotiationMetrics:
    """
    Aggregated metrics evaluator for SubZero negotiations.
    """
    
    def __init__(self):
        self.tenacity_scorer = NegotiationTenacityScore()
        self.alignment_scorer = GoalAlignmentScore()
    
    def evaluate_negotiation(
        self,
        user_goal: str,
        negotiation_rounds: int,
        vendor_offer_type: str,
        final_outcome: str,
        amount_saved: float,
        original_amount: float,
        retention_offers_rejected: int = 0,
    ) -> Dict[str, MetricResult]:
        """
        Run all metrics on a negotiation.
        """
        return {
            "tenacity": self.tenacity_scorer.evaluate(
                user_goal=user_goal,
                negotiation_rounds=negotiation_rounds,
                vendor_offer_type=vendor_offer_type,
                final_outcome=final_outcome,
                retention_offers_rejected=retention_offers_rejected,
            ),
            "goal_alignment": self.alignment_scorer.evaluate(
                user_goal=user_goal,
                final_outcome=final_outcome,
                amount_saved=amount_saved,
                original_amount=original_amount,
            ),
        }
    
    def calculate_aggregate_scores(
        self,
        evaluations: list[Dict[str, MetricResult]]
    ) -> Dict[str, float]:
        """
        Calculate average scores across multiple evaluations.
        """
        if not evaluations:
            return {"tenacity": 0.0, "goal_alignment": 0.0}
        
        tenacity_scores = [e["tenacity"].score for e in evaluations if "tenacity" in e]
        alignment_scores = [e["goal_alignment"].score for e in evaluations if "goal_alignment" in e]
        
        return {
            "avg_tenacity": sum(tenacity_scores) / len(tenacity_scores) if tenacity_scores else 0.0,
            "avg_goal_alignment": sum(alignment_scores) / len(alignment_scores) if alignment_scores else 0.0,
            "total_evaluations": len(evaluations),
        }


# Singleton instance
negotiation_metrics = NegotiationMetrics()
