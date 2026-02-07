"""
Opik Dataset Management
========================
Create and manage evaluation datasets for each Fiscally LLM function.
"""
import opik

# Initialize Opik client
client = opik.Opik()


class DatasetManager:
    """Manages evaluation datasets for Fiscally LLM functions."""
    
    @staticmethod
    def create_categorization_dataset() -> opik.Dataset:
        """Create dataset for testing transaction categorization."""
        dataset = client.get_or_create_dataset("fiscally-categorization")
        
        # Comprehensive test cases for Indian transactions
        test_cases = [
            # Known merchants - should have high confidence
            {
                "input": {"amount": 450, "merchant": "Swiggy", "timestamp": "2026-01-30T20:30:00Z"},
                "expected_output": {"category": "food_delivery", "min_confidence": 0.9}
            },
            {
                "input": {"amount": 180, "merchant": "Uber", "timestamp": "2026-01-30T18:00:00Z"},
                "expected_output": {"category": "transport", "min_confidence": 0.9}
            },
            {
                "input": {"amount": 2500, "merchant": "Amazon", "timestamp": "2026-01-30T14:00:00Z"},
                "expected_output": {"category": "shopping", "min_confidence": 0.9}
            },
            {
                "input": {"amount": 350, "merchant": "Zomato", "timestamp": "2026-01-30T13:00:00Z"},
                "expected_output": {"category": "food_delivery", "min_confidence": 0.9}
            },
            {
                "input": {"amount": 1200, "merchant": "BigBasket", "timestamp": "2026-01-30T11:00:00Z"},
                "expected_output": {"category": "groceries", "min_confidence": 0.9}
            },
            # Restaurant chains
            {
                "input": {"amount": 550, "merchant": "Starbucks", "timestamp": "2026-01-30T10:00:00Z"},
                "expected_output": {"category": "restaurant", "min_confidence": 0.9}
            },
            {
                "input": {"amount": 320, "merchant": "Dominos", "timestamp": "2026-01-30T20:00:00Z"},
                "expected_output": {"category": "restaurant", "min_confidence": 0.9}
            },
            # Bills & subscriptions
            {
                "input": {"amount": 499, "merchant": "Netflix", "timestamp": "2026-01-01T00:00:00Z"},
                "expected_output": {"category": "subscriptions", "min_confidence": 0.9}
            },
            {
                "input": {"amount": 799, "merchant": "Airtel", "timestamp": "2026-01-05T00:00:00Z"},
                "expected_output": {"category": "bills", "min_confidence": 0.9}
            },
            # Unknown merchants - should have lower confidence
            {
                "input": {"amount": 500, "merchant": "Random Local Shop", "timestamp": "2026-01-30T16:00:00Z"},
                "expected_output": {"category": "other", "min_confidence": 0.4}
            },
            {
                "input": {"amount": 150, "merchant": "Unknown UPI Transfer", "timestamp": "2026-01-30T12:00:00Z"},
                "expected_output": {"category": "transfer", "min_confidence": 0.5}
            },
            # Edge cases - time-based inference
            {
                "input": {"amount": 80, "merchant": "Auto", "timestamp": "2026-01-30T08:30:00Z"},
                "expected_output": {"category": "transport", "min_confidence": 0.7}
            },
            {
                "input": {"amount": 300, "merchant": "Late Night Order", "timestamp": "2026-01-30T23:30:00Z"},
                "expected_output": {"category": "food_delivery", "min_confidence": 0.6}
            },
            # Health
            {
                "input": {"amount": 850, "merchant": "Apollo Pharmacy", "timestamp": "2026-01-30T15:00:00Z"},
                "expected_output": {"category": "health", "min_confidence": 0.9}
            },
            # Entertainment
            {
                "input": {"amount": 600, "merchant": "BookMyShow", "timestamp": "2026-01-30T19:00:00Z"},
                "expected_output": {"category": "entertainment", "min_confidence": 0.9}
            },
        ]
        
        dataset.insert(test_cases)
        return dataset
    
    @staticmethod
    def create_voice_parsing_dataset() -> opik.Dataset:
        """Create dataset for testing voice input parsing."""
        dataset = client.get_or_create_dataset("fiscally-voice-parsing")
        
        test_cases = [
            # Simple amounts
            {"input": "spent 200 on coffee", "expected_output": {"amount": 200, "category": "restaurant"}},
            {"input": "450 swiggy dinner", "expected_output": {"amount": 450, "category": "food_delivery", "merchant": "Swiggy"}},
            {"input": "auto 80 rupees", "expected_output": {"amount": 80, "category": "transport"}},
            # Shorthand amounts
            {"input": "amazon 2.5k headphones", "expected_output": {"amount": 2500, "category": "shopping", "merchant": "Amazon"}},
            {"input": "paid 1.5k for groceries", "expected_output": {"amount": 1500, "category": "groceries"}},
            {"input": "rent 15000", "expected_output": {"amount": 15000, "category": "bills"}},
            # With context
            {"input": "uber ride to office 120", "expected_output": {"amount": 120, "category": "transport", "merchant": "Uber"}},
            {"input": "netflix subscription 499", "expected_output": {"amount": 499, "category": "subscriptions", "merchant": "Netflix"}},
            # Ambiguous
            {"input": "paid 500", "expected_output": {"amount": 500, "needs_clarification": True}},
            {"input": "something around 200", "expected_output": {"amount": 200, "needs_clarification": True}},
        ]
        
        dataset.insert(test_cases)
        return dataset
    
    @staticmethod
    def create_chat_dataset() -> opik.Dataset:
        """Create dataset for testing chat responses."""
        dataset = client.get_or_create_dataset("fiscally-chat")
        
        test_cases = [
            {
                "input": "How much did I spend on food this month?",
                "context": {"total_food": 12000, "food_budget": 15000},
                "expected_traits": ["mentions_specific_amount", "uses_currency_indicator", "friendly_tone"]
            },
            {
                "input": "Am I on track with my savings goal?",
                "context": {"goal_target": 100000, "current_saved": 45000},
                "expected_traits": ["mentions_progress", "actionable_insight"]
            },
            {
                "input": "Compare my spending to last month",
                "context": {"this_month": 32000, "last_month": 28000},
                "expected_traits": ["comparison", "specific_numbers"]
            },
            {
                "input": "Why am I spending so much on Swiggy?",
                "context": {"swiggy_orders": 15, "swiggy_total": 6500},
                "expected_traits": ["specific_analysis", "non_judgmental", "suggestion"]
            },
            {
                "input": "What should I cut back on?",
                "context": {"over_budget": ["food_delivery", "entertainment"]},
                "expected_traits": ["prioritized_list", "actionable", "specific_amounts"]
            },
        ]
        
        dataset.insert(test_cases)
        return dataset
    
    @staticmethod
    def create_anomaly_dataset() -> opik.Dataset:
        """Create dataset for testing anomaly detection."""
        dataset = client.get_or_create_dataset("fiscally-anomaly-detection")
        
        test_cases = [
            # Clear anomaly - 10x average
            {
                "transaction": {"amount": 5000, "merchant": "Swiggy", "category": "food_delivery"},
                "user_stats": {"category_avg": 400, "category_max": 800, "category_budget": 5000},
                "expected": {"is_anomaly": True, "severity": "high"}
            },
            # Borderline - 2x average
            {
                "transaction": {"amount": 800, "merchant": "Zomato", "category": "food_delivery"},
                "user_stats": {"category_avg": 400, "category_max": 600, "category_budget": 5000},
                "expected": {"is_anomaly": True, "severity": "low"}
            },
            # Normal purchase
            {
                "transaction": {"amount": 350, "merchant": "Swiggy", "category": "food_delivery"},
                "user_stats": {"category_avg": 400, "category_max": 800, "category_budget": 5000},
                "expected": {"is_anomaly": False}
            },
            # Budget breach
            {
                "transaction": {"amount": 1000, "merchant": "Amazon", "category": "shopping"},
                "user_stats": {"category_avg": 2000, "category_max": 5000, "category_budget": 5000, "current_total": 4500},
                "expected": {"is_anomaly": True, "severity": "medium"}
            },
        ]
        
        dataset.insert(test_cases)
        return dataset

    @staticmethod
    def create_spend_class_dataset() -> opik.Dataset:
        """Create dataset for testing need/want/luxury classification."""
        dataset = client.get_or_create_dataset("fiscally-spend-class")

        test_cases = [
            {
                "input": {"amount": 1200, "merchant": "BigBasket", "category": "groceries"},
                "expected_output": {"spend_class": "need", "min_confidence": 0.7},
            },
            {
                "input": {"amount": 299, "merchant": "Netflix", "category": "subscriptions"},
                "expected_output": {"spend_class": "want", "min_confidence": 0.6},
            },
            {
                "input": {"amount": 18000, "merchant": "Apple Store", "category": "shopping"},
                "expected_output": {"spend_class": "luxury", "min_confidence": 0.6},
            },
            {
                "input": {"amount": 450, "merchant": "Uber", "category": "transport"},
                "expected_output": {"spend_class": "need", "min_confidence": 0.5},
            },
            {
                "input": {"amount": 3200, "merchant": "Fine Dine", "category": "restaurant"},
                "expected_output": {"spend_class": "luxury", "min_confidence": 0.5},
            },
        ]

        dataset.insert(test_cases)
        return dataset

    @staticmethod
    def create_receipt_parsing_dataset() -> opik.Dataset:
        """Create dataset for testing receipt parsing quality."""
        dataset = client.get_or_create_dataset("fiscally-receipt-parsing")

        test_cases = [
            {
                "input": "Merchant: Cafe Blue\nTotal: 450.00\nDate: 2026-02-01",
                "expected_output": {"amount": 450.0, "category": "restaurant", "merchant": "Cafe Blue", "min_confidence": 0.7},
            },
            {
                "input": "Amazon Invoice\nGrand Total INR 2599.00\nOrder date 2026-01-30",
                "expected_output": {"amount": 2599.0, "category": "shopping", "merchant": "Amazon", "min_confidence": 0.7},
            },
            {
                "input": "Apollo Pharmacy\nTotal payable: 899.50",
                "expected_output": {"amount": 899.5, "category": "health", "merchant": "Apollo", "min_confidence": 0.6},
            },
        ]

        dataset.insert(test_cases)
        return dataset


def setup_all_datasets():
    """Create all evaluation datasets."""
    print("Creating Fiscally evaluation datasets...")
    
    DatasetManager.create_categorization_dataset()
    print("✓ Created fiscally-categorization dataset")
    
    DatasetManager.create_voice_parsing_dataset()
    print("✓ Created fiscally-voice-parsing dataset")
    
    DatasetManager.create_chat_dataset()
    print("✓ Created fiscally-chat dataset")
    
    DatasetManager.create_anomaly_dataset()
    print("✓ Created fiscally-anomaly-detection dataset")

    DatasetManager.create_spend_class_dataset()
    print("✓ Created fiscally-spend-class dataset")

    DatasetManager.create_receipt_parsing_dataset()
    print("✓ Created fiscally-receipt-parsing dataset")
    
    print("\n✅ All datasets created successfully!")
    print("View at: https://www.comet.com/opik/fiscally/datasets")


if __name__ == "__main__":
    setup_all_datasets()
