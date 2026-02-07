"""
Online Evaluation Rules for Fiscally
=====================================
Define LLM-as-Judge rules for production trace evaluation.

These rules are configured in the Opik dashboard but documented here for reference.
Use the functions below to create rules programmatically via the API.
"""
import opik


# Initialize Opik client
client = opik.Opik()


# =============================================================================
# RULE DEFINITIONS
# =============================================================================

CATEGORIZATION_QUALITY_RULE = {
    "name": "categorization-quality",
    "description": "Evaluate transaction categorization accuracy and confidence",
    "sampling_rate": 1.0,  # 100% of traces
    "model": "gpt-4o-mini",
    "prompt": """You are evaluating a financial transaction categorization.

INPUT Transaction:
{{input}}

OUTPUT Categorization:
{{output}}

Valid categories: food_delivery, restaurant, groceries, transport, shopping, 
entertainment, bills, subscriptions, health, education, transfer, other

Evaluate:
1. Is the category correct for this merchant/transaction?
2. Is the confidence score appropriate?
3. Would a human categorize it the same way?

Provide a score from 0 to 1 where:
- 1.0 = Perfect categorization
- 0.7 = Correct category but confidence could be better
- 0.5 = Partially correct (close category)
- 0.0 = Wrong category

Explain your reasoning in one sentence.""",
    "variable_mapping": {
        "input": "input",
        "output": "output"
    },
    "scores": [
        {"name": "category_correctness", "type": "float", "min": 0, "max": 1}
    ]
}


CHAT_HELPFULNESS_RULE = {
    "name": "chat-helpfulness",
    "description": "Evaluate chat response quality for financial questions",
    "sampling_rate": 0.5,  # 50% of traces
    "model": "gpt-4o-mini",
    "prompt": """You are evaluating a financial assistant's response.

USER QUESTION:
{{input}}

ASSISTANT RESPONSE:
{{output}}

Fiscally Guidelines:
- Be specific with numbers (use user currency symbol/code)
- Keep responses under 100 words
- Be friendly and non-judgmental
- Never be preachy about spending

Evaluate if the response:
1. Directly addresses the user's question
2. Uses specific numbers (not vague statements)
3. Maintains a friendly, non-judgmental tone
4. Uses a currency indicator correctly
5. Is concise (under 100 words)

Provide a score from 0 to 1 and explain your reasoning in one sentence.""",
    "variable_mapping": {
        "input": "input",
        "output": "output"
    },
    "scores": [
        {"name": "helpfulness", "type": "float", "min": 0, "max": 1}
    ]
}


ANOMALY_DETECTION_RULE = {
    "name": "anomaly-detection-quality",
    "description": "Evaluate anomaly detection accuracy",
    "sampling_rate": 1.0,  # 100% - anomaly detection is critical
    "model": "gpt-4o-mini",
    "prompt": """Evaluate this anomaly detection result.

TRANSACTION:
Amount: {{metadata.amount}}
Category: {{metadata.category}}
Merchant: {{metadata.merchant}}

USER STATS:
Category Average: {{metadata.category_avg}}

DETECTION RESULT:
{{output}}

Evaluate:
1. Is the anomaly detection reasonable given the amount vs average?
2. If flagged as anomaly, is the severity appropriate?
3. Would a human agree with this assessment?

Score:
- 1.0 = Correct detection (anomaly flagged/not flagged appropriately)
- 0.5 = Partially correct (right detection, wrong severity)
- 0.0 = Wrong detection

Explain briefly.""",
    "variable_mapping": {
        "metadata.amount": "metadata.amount",
        "metadata.category": "metadata.category",
        "metadata.merchant": "metadata.merchant",
        "metadata.category_avg": "metadata.category_avg",
        "output": "output"
    },
    "scores": [
        {"name": "detection_accuracy", "type": "float", "min": 0, "max": 1}
    ]
}


VOICE_PARSING_RULE = {
    "name": "voice-parsing-quality",
    "description": "Evaluate voice input parsing accuracy",
    "sampling_rate": 1.0,
    "model": "gpt-4o-mini",
    "prompt": """Evaluate this voice input parsing result.

VOICE INPUT (transcript):
{{metadata.transcript_preview}}

PARSED OUTPUT:
Amount: {{metadata.parsed_amount}}
Category: {{metadata.parsed_category}}
Confidence: {{metadata.confidence}}

Evaluate:
1. Was the amount extracted correctly from the voice input?
2. Was the category inferred correctly?
3. Is the confidence score appropriate?

Score 1.0 if parsing is correct, 0.5 if partially correct, 0.0 if wrong.
Explain briefly.""",
    "variable_mapping": {
        "metadata.transcript_preview": "metadata.transcript_preview",
        "metadata.parsed_amount": "metadata.parsed_amount",
        "metadata.parsed_category": "metadata.parsed_category",
        "metadata.confidence": "metadata.confidence"
    },
    "scores": [
        {"name": "parsing_accuracy", "type": "float", "min": 0, "max": 1}
    ]
}


SPEND_CLASS_RULE = {
    "name": "spend-class-quality",
    "description": "Evaluate need/want/luxury classification quality",
    "sampling_rate": 1.0,
    "model": "gpt-4o-mini",
    "prompt": """Evaluate this needs/wants/luxury classification.

TRANSACTION:
Amount: {{metadata.amount}}
Category: {{metadata.category}}
Merchant: {{metadata.merchant}}

CLASSIFICATION OUTPUT:
{{output}}

Evaluate:
1. Is need/want/luxury class appropriate?
2. Is confidence proportional to ambiguity?
3. Is reasoning aligned with user context/goals when available?

Score:
- 1.0 = Correct class and confidence
- 0.5 = Mostly correct but weak confidence/reasoning
- 0.0 = Incorrect class

Explain briefly.""",
    "variable_mapping": {
        "metadata.amount": "metadata.amount",
        "metadata.category": "metadata.category",
        "metadata.merchant": "metadata.merchant",
        "output": "output",
    },
    "scores": [
        {"name": "spend_class_accuracy", "type": "float", "min": 0, "max": 1},
    ],
}


RECEIPT_PARSING_RULE = {
    "name": "receipt-parsing-quality",
    "description": "Evaluate receipt parsing quality for auto-add flow",
    "sampling_rate": 1.0,
    "model": "gpt-4o-mini",
    "prompt": """Evaluate this receipt parsing result.

OCR/Vision INPUT:
{{input}}

PARSED OUTPUT:
{{output}}

Evaluate:
1. Is total payable amount extracted correctly?
2. Is merchant reasonably identified?
3. Is category plausible for merchant/items?
4. Is review flag sensible given confidence?

Score:
- 1.0 = Accurate parse
- 0.5 = Partially accurate (minor field issues)
- 0.0 = Incorrect parse

Explain briefly.""",
    "variable_mapping": {
        "input": "input",
        "output": "output",
    },
    "scores": [
        {"name": "receipt_parsing_accuracy", "type": "float", "min": 0, "max": 1},
    ],
}


# All rules for easy iteration
ALL_RULES = [
    CATEGORIZATION_QUALITY_RULE,
    CHAT_HELPFULNESS_RULE,
    ANOMALY_DETECTION_RULE,
    VOICE_PARSING_RULE,
    SPEND_CLASS_RULE,
    RECEIPT_PARSING_RULE,
]


def print_rule_setup_instructions():
    """Print instructions for setting up rules in Opik dashboard."""
    print("=" * 70)
    print("📋 OPIK ONLINE EVALUATION RULES SETUP")
    print("=" * 70)
    print("\nNavigate to: https://www.comet.com/opik/fiscally/projects")
    print("Select your project → Rules tab → Create new rule\n")
    
    for rule in ALL_RULES:
        print("-" * 70)
        print(f"📌 Rule: {rule['name']}")
        print(f"   Description: {rule['description']}")
        print(f"   Sampling Rate: {rule['sampling_rate'] * 100}%")
        print(f"   Model: {rule['model']}")
        print(f"   Scores: {[s['name'] for s in rule['scores']]}")
        print()
    
    print("=" * 70)
    print("💡 TIP: Start with 100% sampling for critical rules (categorization, anomaly)")
    print("        Use 50% sampling for expensive rules (chat helpfulness)")
    print("=" * 70)


if __name__ == "__main__":
    print_rule_setup_instructions()
