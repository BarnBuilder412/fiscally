"""
Custom Opik Evaluation Metrics for Fiscally
=============================================
Domain-specific metrics for financial assistant evaluation.
"""
from typing import Any, Dict, Optional
from opik.evaluation.metrics import base_metric, score_result
from opik.evaluation.metrics import Hallucination, AnswerRelevance


class CategoryAccuracy(base_metric.BaseMetric):
    """Check if predicted category matches expected."""
    
    name = "category_accuracy"
    
    def score(
        self,
        output: Dict[str, Any],
        expected_output: Dict[str, Any],
        **kwargs
    ) -> score_result.ScoreResult:
        predicted = output.get("category", "").lower()
        expected = expected_output.get("category", "").lower()
        
        score = 1.0 if predicted == expected else 0.0
        
        return score_result.ScoreResult(
            value=score,
            name=self.name,
            reason=f"Predicted: {predicted}, Expected: {expected}"
        )


class ConfidenceCalibration(base_metric.BaseMetric):
    """Check if confidence scores are well-calibrated."""
    
    name = "confidence_calibration"
    
    def score(
        self,
        output: Dict[str, Any],
        expected_output: Dict[str, Any],
        **kwargs
    ) -> score_result.ScoreResult:
        confidence = output.get("confidence", 0)
        min_confidence = expected_output.get("min_confidence", 0.5)
        
        # Higher score if confidence meets expectation
        score = 1.0 if confidence >= min_confidence else confidence / min_confidence
        
        return score_result.ScoreResult(
            value=score,
            name=self.name,
            reason=f"Confidence: {confidence:.2f}, Min required: {min_confidence}"
        )


class CurrencyIndicatorUsage(base_metric.BaseMetric):
    """Check if response uses a recognizable currency indicator."""
    
    name = "currency_indicator_usage"
    
    def score(
        self,
        output: str,
        **kwargs
    ) -> score_result.ScoreResult:
        if not isinstance(output, str):
            output = str(output)
            
        currency_symbols = ["₹", "$", "€", "£", "¥", "₩", "₽", "₫", "฿"]
        currency_codes = ["inr", "usd", "eur", "gbp", "jpy", "sgd", "aed", "cad", "aud"]
        has_symbol = any(symbol in output for symbol in currency_symbols)
        has_code = any(code in output.lower() for code in currency_codes)
        
        score = 1.0 if has_symbol else (0.6 if has_code else 0.0)
        
        return score_result.ScoreResult(
            value=score,
            name=self.name,
            reason="Uses currency symbol" if has_symbol else ("Uses currency code" if has_code else "Missing currency indicator")
        )


class RupeeSymbolUsage(CurrencyIndicatorUsage):
    """
    Backward-compatible alias.
    Keep class name for older experiment scripts.
    """
    name = "rupee_symbol_usage"


class ResponseConciseness(base_metric.BaseMetric):
    """Check if response is concise (under 100 words as per Fiscally guidelines)."""
    
    name = "response_conciseness"
    
    def __init__(self, max_words: int = 100):
        self.max_words = max_words
    
    def score(
        self,
        output: str,
        **kwargs
    ) -> score_result.ScoreResult:
        if not isinstance(output, str):
            output = str(output)
            
        word_count = len(output.split())
        
        if word_count <= self.max_words:
            score = 1.0
        else:
            # Gradual penalty for exceeding
            score = max(0, 1 - (word_count - self.max_words) / 100)
        
        return score_result.ScoreResult(
            value=score,
            name=self.name,
            reason=f"Word count: {word_count} (max: {self.max_words})"
        )


class VoiceParsingAccuracy(base_metric.BaseMetric):
    """Check if voice parsing extracted correct amount and category."""
    
    name = "voice_parsing_accuracy"
    
    def score(
        self,
        output: Dict[str, Any],
        expected_output: Dict[str, Any],
        **kwargs
    ) -> score_result.ScoreResult:
        scores = []
        reasons = []
        
        # Check amount
        parsed_amount = output.get("amount", 0)
        expected_amount = expected_output.get("amount", 0)
        amount_match = abs(parsed_amount - expected_amount) < 1  # Allow for float rounding
        scores.append(1.0 if amount_match else 0.0)
        reasons.append(f"Amount: {parsed_amount} vs {expected_amount}")
        
        # Check category if expected
        if "category" in expected_output:
            cat_match = output.get("category", "").lower() == expected_output["category"].lower()
            scores.append(1.0 if cat_match else 0.0)
            reasons.append(f"Category: {output.get('category')} vs {expected_output['category']}")
        
        # Check merchant if expected
        if "merchant" in expected_output:
            expected_merchant = expected_output["merchant"].lower()
            parsed_merchant = (output.get("merchant") or "").lower()
            merchant_match = expected_merchant in parsed_merchant or parsed_merchant in expected_merchant
            scores.append(1.0 if merchant_match else 0.0)
            reasons.append(f"Merchant: {output.get('merchant')} vs {expected_output['merchant']}")
        
        avg_score = sum(scores) / len(scores) if scores else 0.0
        
        return score_result.ScoreResult(
            value=avg_score,
            name=self.name,
            reason=" | ".join(reasons)
        )


class ToneAppropriatenessMetric(base_metric.BaseMetric):
    """Check if response tone is friendly and non-judgmental (Fiscally guideline)."""
    
    name = "tone_appropriateness"
    
    # Words that indicate judgmental/preachy tone
    NEGATIVE_INDICATORS = [
        "you should", "you must", "you need to", "stop",
        "bad habit", "waste", "foolish", "mistake",
        "too much", "excessive", "problem"
    ]
    
    # Words that indicate friendly, supportive tone
    POSITIVE_INDICATORS = [
        "nice", "great", "good job", "well done",
        "consider", "might want", "could try",
        "just a heads up", "by the way"
    ]
    
    def score(
        self,
        output: str,
        **kwargs
    ) -> score_result.ScoreResult:
        if not isinstance(output, str):
            output = str(output)
            
        output_lower = output.lower()
        
        # Count indicators
        negative_count = sum(1 for phrase in self.NEGATIVE_INDICATORS if phrase in output_lower)
        positive_count = sum(1 for phrase in self.POSITIVE_INDICATORS if phrase in output_lower)
        
        # Score based on tone balance
        if negative_count > 2:
            score = 0.2
            reason = f"Found {negative_count} judgmental phrases"
        elif negative_count > 0:
            score = 0.6
            reason = f"Found {negative_count} slightly judgmental phrase(s)"
        elif positive_count > 0:
            score = 1.0
            reason = f"Friendly tone with {positive_count} positive indicator(s)"
        else:
            score = 0.8
            reason = "Neutral tone"
        
        return score_result.ScoreResult(
            value=score,
            name=self.name,
            reason=reason
        )


class SpecificNumbersMetric(base_metric.BaseMetric):
    """Check if response includes specific numbers (Fiscally guideline: be specific, not generic)."""
    
    name = "specific_numbers"
    
    def score(
        self,
        output: str,
        **kwargs
    ) -> score_result.ScoreResult:
        import re
        
        if not isinstance(output, str):
            output = str(output)
        
        # Find numeric amounts with optional currency symbol/code.
        number_pattern = r'(?:₹|\$|€|£|¥|INR|USD|EUR|GBP)?\s?\d[\d,]*\.?\d*'
        numbers_found = re.findall(number_pattern, output)
        
        if len(numbers_found) >= 3:
            score = 1.0
            reason = f"Found {len(numbers_found)} specific numbers"
        elif len(numbers_found) >= 1:
            score = 0.7
            reason = f"Found {len(numbers_found)} number(s), could be more specific"
        else:
            score = 0.3
            reason = "No specific numbers found - response too vague"
        
        return score_result.ScoreResult(
            value=score,
            name=self.name,
            reason=reason
        )


# Convenience function to get all Fiscally metrics
def get_fiscally_metrics():
    """Get all custom Fiscally evaluation metrics."""
    return [
        CategoryAccuracy(),
        ConfidenceCalibration(),
        CurrencyIndicatorUsage(),
        ResponseConciseness(),
        VoiceParsingAccuracy(),
        ToneAppropriatenessMetric(),
        SpecificNumbersMetric(),
    ]


def get_chat_metrics():
    """Get metrics specifically for chat evaluation."""
    return [
        CurrencyIndicatorUsage(),
        ResponseConciseness(),
        ToneAppropriatenessMetric(),
        SpecificNumbersMetric(),
        Hallucination(),
        AnswerRelevance(),
    ]


def get_categorization_metrics():
    """Get metrics specifically for categorization evaluation."""
    return [
        CategoryAccuracy(),
        ConfidenceCalibration(),
    ]
