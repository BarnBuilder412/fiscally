"""
Opik User Feedback Integration
================================
Log user feedback to Opik traces for continuous improvement.

This module provides utilities to:
1. Log category corrections when users fix AI categorization
2. Log chat satisfaction scores (thumbs up/down)
3. Track ground truth for evaluation dataset creation
"""
import opik
import logging
from typing import Optional

logger = logging.getLogger(__name__)


# Initialize Opik client
client = opik.Opik()


def log_category_correction(
    trace_id: str,
    original_category: str,
    corrected_category: str,
    transaction_id: str,
    confidence: float = 0.0
) -> bool:
    """
    Log a category correction as feedback on the original trace.
    
    Called when a user corrects an AI-assigned category, providing
    ground truth for improving categorization accuracy.
    
    Args:
        trace_id: The Opik trace ID from the original categorization
        original_category: What the AI assigned
        corrected_category: What the user corrected it to
        transaction_id: ID of the transaction being corrected
        confidence: Original AI confidence score
    
    Returns:
        True if feedback was logged successfully
    """
    try:
        # Calculate a score: 1.0 if correct, 0.0 if wrong
        score = 1.0 if original_category == corrected_category else 0.0
        
        client.log_traces_feedback_scores(
            scores=[{
                "id": trace_id,
                "name": "category_accuracy_user",
                "value": score,
                "reason": f"User corrected '{original_category}' to '{corrected_category}'"
            }]
        )
        
        # Also log the correction details for training data extraction
        client.log_traces_feedback_scores(
            scores=[{
                "id": trace_id,
                "name": "user_correction",
                "value": 0.0 if score == 0.0 else 1.0,  # Was correction needed?
                "reason": f"transaction_id={transaction_id}, ai_confidence={confidence:.2f}"
            }]
        )
        
        return True
    except Exception as e:
        logger.warning("Failed to log category correction feedback", exc_info=True)
        return False


def log_spend_class_correction(
    trace_id: str,
    original_spend_class: str,
    corrected_spend_class: str,
    transaction_id: str,
    confidence: float = 0.0,
) -> bool:
    """
    Log need/want/luxury corrections as ground-truth feedback.

    Args:
        trace_id: The Opik trace ID from the original classification
        original_spend_class: AI-assigned spend class
        corrected_spend_class: User corrected spend class
        transaction_id: ID of the corrected transaction
        confidence: Original AI confidence score
    """
    try:
        score = 1.0 if original_spend_class == corrected_spend_class else 0.0

        client.log_traces_feedback_scores(
            scores=[{
                "id": trace_id,
                "name": "spend_class_accuracy_user",
                "value": score,
                "reason": f"User corrected '{original_spend_class}' to '{corrected_spend_class}'",
            }]
        )

        client.log_traces_feedback_scores(
            scores=[{
                "id": trace_id,
                "name": "user_spend_class_correction",
                "value": 0.0 if score == 0.0 else 1.0,
                "reason": f"transaction_id={transaction_id}, ai_confidence={confidence:.2f}",
            }]
        )
        return True
    except Exception as e:
        logger.warning("Failed to log spend class correction feedback", exc_info=True)
        return False


def log_chat_feedback(
    trace_id: str,
    rating: int,  # 1 = thumbs down, 2 = thumbs up
    message_preview: Optional[str] = None
) -> bool:
    """
    Log user satisfaction rating for a chat response.
    
    Args:
        trace_id: The Opik trace ID from the chat response
        rating: 1 = thumbs down (unhelpful), 2 = thumbs up (helpful)
        message_preview: First 50 chars of the response for context
    
    Returns:
        True if feedback was logged successfully
    """
    try:
        # Normalize to 0-1 scale
        score = 1.0 if rating >= 2 else 0.0
        
        reason = "User found response helpful" if score == 1.0 else "User found response unhelpful"
        if message_preview:
            reason += f" | Response: {message_preview[:50]}..."
        
        client.log_traces_feedback_scores(
            scores=[{
                "id": trace_id,
                "name": "chat_satisfaction",
                "value": score,
                "reason": reason
            }]
        )
        
        return True
    except Exception as e:
        logger.warning("Failed to log chat feedback", exc_info=True)
        return False


def log_anomaly_feedback(
    trace_id: str,
    is_correct: bool,
    user_comment: Optional[str] = None
) -> bool:
    """
    Log whether user agrees with anomaly detection result.
    
    Args:
        trace_id: The Opik trace ID from anomaly detection
        is_correct: True if user agrees it's an anomaly (or not)
        user_comment: Optional user comment explaining disagreement
    
    Returns:
        True if feedback was logged successfully
    """
    try:
        client.log_traces_feedback_scores(
            scores=[{
                "id": trace_id,
                "name": "anomaly_detection_accuracy",
                "value": 1.0 if is_correct else 0.0,
                "reason": user_comment or ("User confirmed" if is_correct else "User disagreed")
            }]
        )
        
        return True
    except Exception as e:
        logger.warning("Failed to log anomaly feedback", exc_info=True)
        return False


def get_current_trace_id() -> Optional[str]:
    """
    Get the current Opik trace ID from the active context.
    
    Call this during a traced function to capture the trace ID
    for later feedback logging.
    
    Returns:
        The current trace ID, or None if not in a traced context
    """
    try:
        from opik import opik_context
        span = opik_context.get_current_span()
        if span:
            return span.trace_id
        return None
    except Exception:
        return None
