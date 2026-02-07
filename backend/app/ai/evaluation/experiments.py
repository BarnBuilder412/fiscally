"""
Opik Experiment Runners for Fiscally
======================================
Run systematic evaluations of LLM functions.
"""
import asyncio
from opik.evaluation import evaluate
from typing import Dict, Any

from .datasets import DatasetManager
from .metrics import (
    VoiceParsingAccuracy,
    get_chat_metrics,
    get_categorization_metrics,
    get_spend_class_metrics,
    get_receipt_metrics,
)

def _run_async(coro):
    """Helper to run async functions in sync context."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If we're already in an async context, create a new task
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, coro)
                return future.result()
        else:
            return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


def run_categorization_experiment(experiment_name: str = "categorization-eval"):
    """
    Run categorization evaluation experiment.
    
    Tests transaction categorization against the fiscally-categorization dataset.
    """
    from ..llm_client import llm_client
    
    print(f"🧪 Running experiment: {experiment_name}")
    
    # Get or create dataset
    dataset = DatasetManager.create_categorization_dataset()
    
    def evaluation_task(item: Dict[str, Any]) -> Dict[str, Any]:
        """Task that maps dataset items to LLM outputs."""
        result = _run_async(llm_client.categorize_transaction(item["input"]))
        # Return with 'output' key as Opik expects
        return {"output": result}
    
    # Run evaluation with key mappings
    result = evaluate(
        experiment_name=experiment_name,
        dataset=dataset,
        task=evaluation_task,
        scoring_metrics=get_categorization_metrics(),
        scoring_key_mapping={
            "output": "output",
            "expected_output": "expected_output"
        }
    )
    
    print(f"✅ Experiment complete: {experiment_name}")
    print("   View results: https://www.comet.com/opik/fiscally/experiments")
    
    return result


def run_voice_parsing_experiment(experiment_name: str = "voice-parsing-eval"):
    """
    Run voice parsing evaluation experiment.
    
    Tests voice input parsing against the fiscally-voice-parsing dataset.
    """
    from ..llm_client import llm_client
    
    print(f"🧪 Running experiment: {experiment_name}")
    
    dataset = DatasetManager.create_voice_parsing_dataset()
    
    def evaluation_task(item: Dict[str, Any]) -> Dict[str, Any]:
        """Task that parses voice input."""
        result = _run_async(llm_client.parse_voice_input(item["input"]))
        # Return with 'output' key as Opik expects
        return {"output": result}
    
    result = evaluate(
        experiment_name=experiment_name,
        dataset=dataset,
        task=evaluation_task,
        scoring_metrics=[VoiceParsingAccuracy()],
        scoring_key_mapping={
            "output": "output",
            "expected_output": "expected_output"
        }
    )
    
    print(f"✅ Experiment complete: {experiment_name}")
    return result


def run_chat_experiment(experiment_name: str = "chat-eval"):
    """
    Run chat response evaluation experiment.
    
    Tests chat quality against the fiscally-chat dataset.
    """
    from ..llm_client import llm_client
    
    print(f"🧪 Running experiment: {experiment_name}")
    
    dataset = DatasetManager.create_chat_dataset()
    
    def evaluation_task(item: Dict[str, Any]) -> Dict[str, Any]:
        """Task that generates chat responses."""
        user_context = {
            "profile": {"name": "Test User"},
            "patterns": {},
            "goals": [],
            "memory": {}
        }
        
        # Format context as transaction data
        transaction_data = ""
        if "context" in item:
            ctx = item["context"]
            if isinstance(ctx, dict):
                for key, value in ctx.items():
                    transaction_data += f"{key}: {value}\n"
        
        response = _run_async(llm_client.chat(
            message=item["input"],
            user_context=user_context,
            transaction_data=transaction_data if transaction_data else None
        ))
        # Return with 'output' key as Opik expects
        return {"output": response}
    
    result = evaluate(
        experiment_name=experiment_name,
        dataset=dataset,
        task=evaluation_task,
        scoring_metrics=get_chat_metrics(),
        scoring_key_mapping={
            "output": "output"
        }
    )
    
    print(f"✅ Experiment complete: {experiment_name}")
    return result


def run_spend_class_experiment(experiment_name: str = "spend-class-eval"):
    """Run need/want/luxury classification evaluation."""
    from ..llm_client import llm_client

    print(f"🧪 Running experiment: {experiment_name}")
    dataset = DatasetManager.create_spend_class_dataset()

    def evaluation_task(item: Dict[str, Any]) -> Dict[str, Any]:
        result = _run_async(
            llm_client.classify_spending_class(
                item["input"],
                user_context=item.get("user_context"),
            )
        )
        return {"output": result}

    result = evaluate(
        experiment_name=experiment_name,
        dataset=dataset,
        task=evaluation_task,
        scoring_metrics=get_spend_class_metrics(),
        scoring_key_mapping={
            "output": "output",
            "expected_output": "expected_output",
        },
    )
    print(f"✅ Experiment complete: {experiment_name}")
    return result


def run_receipt_parsing_experiment(experiment_name: str = "receipt-parsing-eval"):
    """Run receipt text parsing evaluation."""
    from ..llm_client import llm_client

    print(f"🧪 Running experiment: {experiment_name}")
    dataset = DatasetManager.create_receipt_parsing_dataset()

    def evaluation_task(item: Dict[str, Any]) -> Dict[str, Any]:
        result = _run_async(
            llm_client.parse_receipt_text(
                item["input"],
                user_context=item.get("user_context"),
            )
        )
        return {"output": result}

    result = evaluate(
        experiment_name=experiment_name,
        dataset=dataset,
        task=evaluation_task,
        scoring_metrics=get_receipt_metrics(),
        scoring_key_mapping={
            "output": "output",
            "expected_output": "expected_output",
        },
    )
    print(f"✅ Experiment complete: {experiment_name}")
    return result


def run_all_experiments():
    """Run all Fiscally LLM evaluation experiments."""
    print("=" * 60)
    print("🧪 Fiscally LLM Evaluation Suite")
    print("=" * 60)
    
    # First, ensure datasets exist
    DatasetManager.create_categorization_dataset()
    DatasetManager.create_voice_parsing_dataset()
    DatasetManager.create_chat_dataset()
    DatasetManager.create_anomaly_dataset()
    DatasetManager.create_spend_class_dataset()
    DatasetManager.create_receipt_parsing_dataset()
    print("✓ Datasets ready")
    
    # Run experiments
    print("\n📊 Running experiments...\n")
    
    try:
        run_categorization_experiment()
    except Exception as e:
        print(f"⚠️ Categorization experiment failed: {e}")
    
    try:
        run_voice_parsing_experiment()
    except Exception as e:
        print(f"⚠️ Voice parsing experiment failed: {e}")
    
    try:
        run_chat_experiment()
    except Exception as e:
        print(f"⚠️ Chat experiment failed: {e}")

    try:
        run_spend_class_experiment()
    except Exception as e:
        print(f"⚠️ Spend class experiment failed: {e}")

    try:
        run_receipt_parsing_experiment()
    except Exception as e:
        print(f"⚠️ Receipt parsing experiment failed: {e}")
    
    print("\n" + "=" * 60)
    print("✅ All experiments complete!")
    print("📊 View results at: https://www.comet.com/opik/fiscally/experiments")
    print("=" * 60)


# CLI entry point
if __name__ == "__main__":
    import sys
    import os
    
    # Add parent directory to path for imports
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
    
    # Load environment
    from dotenv import load_dotenv
    load_dotenv()
    
    print("Starting Fiscally LLM Evaluation...")
    run_all_experiments()
