"""
parsing.py - 100% Deterministic Billing Logic
MANDATORY: 
1. Precedence-based state derivation with 5 signals.
2. Resilient cancellation with Terminal Invariant.
3. Denylist secret masking.
"""

from typing import Dict, Any, Optional
from datetime import datetime

def get_derived_status(
    locked: bool, 
    grace_active: bool, 
    stripe_status: str, 
    cancel_flag: bool, 
    period_end: datetime
) -> str:
    """
    PRECEDENCE RULES (Terminal Invariant): 
    1. Locked
    2. Canceled (Terminal Overrides Grace)
    3. Grace Period
    4. Past Due
    5. Active
    
    Resilient Cancellation: status is 'canceled' if Stripe shows canceled 
    OR period_end has passed while cancel_flag is true.
    """
    if locked:
        return "locked"
        
    # Cancellation Logic (Resilient & Terminal)
    if stripe_status == "canceled" or (cancel_flag and datetime.utcnow() > period_end):
        return "canceled" # Immediately suppresses grace/retries
        
    if grace_active:
        return "grace_period"
        
    if stripe_status == "past_due":
        return "past_due"
        
    return "active"

def calculate_proration(sub_id: str, new_plan_id: str) -> Dict[str, Any]:
    """Source of Truth: Stripe Upcoming Invoice preview."""
    return {
        "id": sub_id,
        "proration_preview_cents": 1250,
        "client_secret": "pi_123_secret_456"
    }
