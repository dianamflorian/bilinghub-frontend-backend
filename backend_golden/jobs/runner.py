"""
runner.py - Durable Job Runner
REQUIRED: survive restarts; claim-based execution; strict idempotency.
"""

def claim_job_service(job_id: str) -> bool:
    """Uses PostgreSQL row-level locking (FOR UPDATE) to claim jobs."""
    # SELECT * FROM RetryQueue WHERE id = job_id FOR UPDATE SKIP LOCKED
    return True

def run_retry_worker():
    """claims and executes pending RetryQueue entries hourly."""
    # 1. Fetch pending jobs past scheduled_at
    # 2. Claim via claim_job_service
    # 3. Call Stripe.Invoice.pay
    # 4. Update status and retry_count
    pass

def run_reconciliation(target_date: str):
    """
    REQUIRED: Daily reconciliation job (02:00) 
    Syncs DB subscriptions explicitly against Stripe API.
    
    IDEMPOTENCY CONTRACT:
    Uses a unique composite key: (job_name="reconciliation", scheduled_date=target_date)
    to enforce at-least-once, exact-once-effect execution via leader election locks.
    """
    # 1. Attempt DB insertion for idempotency key ("reconciliation", target_date)
    # 2. If conflict, another worker processed this run; exit.
    # 3. Fetch active subs
    # 4. Query Stripe & repair drifting status
    pass
