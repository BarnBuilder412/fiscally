"""
Subscription Service
Manages subscription data and vendor policies.
"""

import json
import os
from typing import List, Optional, Dict, Any

from app.models.subzero import Subscription, VendorPolicy


# Load mock data
MOCK_DATA_PATH = os.path.join(os.path.dirname(__file__), "../../../mock_data/vendor_policies.json")


def load_vendor_data() -> Dict[str, Any]:
    """Load vendor policies from JSON."""
    try:
        with open(MOCK_DATA_PATH, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load vendor data: {e}")
        return {"vendors": []}


class SubscriptionService:
    """
    Service for managing subscriptions and vendor data.
    """
    
    def __init__(self):
        data = load_vendor_data()
        self._vendors = {v["merchant_name"]: v for v in data.get("vendors", [])}
        
        # Pre-loaded mock subscriptions
        self._subscriptions = [
            Subscription(
                id="sub_1",
                merchant_name="Adobe Creative Cloud",
                amount=54.99,
                billing_frequency="monthly",
            ),
            Subscription(
                id="sub_2",
                merchant_name="Netflix",
                amount=15.99,
                billing_frequency="monthly",
            ),
            Subscription(
                id="sub_3",
                merchant_name="Spotify",
                amount=10.99,
                billing_frequency="monthly",
            ),
            Subscription(
                id="sub_4",
                merchant_name="Planet Fitness",
                amount=10.00,
                billing_frequency="monthly",
            ),
            Subscription(
                id="sub_5",
                merchant_name="HelloFresh",
                amount=60.00,
                billing_frequency="weekly",
            ),
        ]
    
    def get_all_subscriptions(self) -> List[Subscription]:
        """Get all mock subscriptions."""
        return self._subscriptions
    
    def get_subscription(self, subscription_id: str) -> Optional[Subscription]:
        """Get a specific subscription by ID."""
        for sub in self._subscriptions:
            if sub.id == subscription_id:
                return sub
        return None
    
    def get_vendor_policy(self, merchant_name: str) -> Optional[VendorPolicy]:
        """Get vendor policy for a merchant."""
        vendor_data = self._vendors.get(merchant_name)
        
        if not vendor_data:
            return None
        
        return VendorPolicy(
            merchant_name=vendor_data["merchant_name"],
            refund_window_days=vendor_data["refund_window_days"],
            pro_rated_refund=vendor_data["pro_rated_refund"],
            retention_offers=vendor_data["retention_offers"],
            cancellation_notice_days=vendor_data.get("cancellation_notice_days", 0),
            refund_difficulty=vendor_data["refund_difficulty"],
            notes=vendor_data.get("notes"),
        )
    
    def get_all_vendor_policies(self) -> List[VendorPolicy]:
        """Get all vendor policies."""
        return [
            VendorPolicy(
                merchant_name=v["merchant_name"],
                refund_window_days=v["refund_window_days"],
                pro_rated_refund=v["pro_rated_refund"],
                retention_offers=v["retention_offers"],
                cancellation_notice_days=v.get("cancellation_notice_days", 0),
                refund_difficulty=v["refund_difficulty"],
                notes=v.get("notes"),
            )
            for v in self._vendors.values()
        ]


# Singleton instance
subscription_service = SubscriptionService()
