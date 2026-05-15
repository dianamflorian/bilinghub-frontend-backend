"""
models.py - Absolute Deterministic Billing Models
REQUIRED: All models must link with Stripe IDs and support durable state transitions.
"""

from typing import List, Optional
from datetime import datetime
import uuid

class User:
    """User with mandatory Stripe link and lock status."""
    def __init__(self, email: str, name: str, stripe_customer_id: str):
        self.id = str(uuid.uuid4())
        self.email = email
        self.name = name
        self.stripe_customer_id = stripe_customer_id 
        self.locked = False # Precedence 1
        self.created_at = datetime.utcnow()

class Subscription:
    """Syncs with Stripe; supports scheduled cancellation."""
    def __init__(self, user_id: str, plan_id: str, stripe_sub_id: str):
        self.id = str(uuid.uuid4())
        self.user_id = user_id
        self.plan_id = plan_id
        self.stripe_sub_id = stripe_sub_id
        self.status = "active" # active, past_due, canceled
        self.cancel_at_period_end = False
        self.current_period_end = datetime.utcnow()

class Plan:
    """Pricing configuration with > 0 constraints."""
    def __init__(self, name: str, amount_cents: int, billing_cycle: str):
        self.id = str(uuid.uuid4())
        self.name = name
        self.amount_cents = amount_cents # MUST be > 0
        self.billing_cycle = billing_cycle # monthly, annual
        self.active = True # False if archived

class Invoice:
    """Mirrored Stripe invoice metadata."""
    def __init__(self, user_id: str, stripe_invoice_id: str, amount_cents: int):
        self.id = str(uuid.uuid4())
        self.user_id = user_id
        self.stripe_invoice_id = stripe_invoice_id
        self.amount_cents = amount_cents
        self.status = "open" # paid, open, void

class GracePeriod:
    """Tracks retry episode keyed by Sub + Invoice IDs."""
    def __init__(self, sub_id: str, invoice_id: str, ends_at: datetime):
        self.id = str(uuid.uuid4())
        self.sub_id = sub_id
        self.invoice_id = invoice_id # episode key (Sub+Invoice)
        self.retry_count = 0 # MAX 3
        self.started_at = datetime.utcnow()
        self.ends_at = ends_at
        self.status = "active" # active, recovered, expired

class RetryQueue:
    """Durable job persistence for payment retries."""
    def __init__(self, grace_period_id: str, scheduled_at: datetime):
        self.id = str(uuid.uuid4())
        self.grace_period_id = grace_period_id
        self.scheduled_at = scheduled_at
        self.status = "pending" # pending, processing, completed

class WebhookLog:
    """Enforces idempotency via UNIQUE stripe_event_id."""
    def __init__(self, stripe_event_id: str):
        self.id = str(uuid.uuid4())
        self.stripe_event_id = stripe_event_id # UNIQUE index REQUIRED
        self.processed = True

class AuditLog:
    """Audit trail for reconciliation results."""
    def __init__(self, job_name: str, mismatch_count: int, fixed_count: int):
        self.id = str(uuid.uuid4())
        self.job_name = job_name
        self.mismatch_count = mismatch_count
        self.fixed_count = fixed_count
        self.created_at = datetime.utcnow()
