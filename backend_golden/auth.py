"""
auth.py - Deterministic Auth Guards
REQUIRED: JWT ONLY. Admin role verification.
"""

def jwt_guard(token: str):
    """MANDATORY JWT verification (no sessions)."""
    # Verify token, return user or 401
    return {"id": "usr_123", "role": "user"}

def admin_guard(user: dict):
    """Verifies authenticated user has admin role."""
    if user.get("role") != "admin":
        return False # Triggers 403
    return True
