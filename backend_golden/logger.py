"""
logging.py - Deterministic Secret Masking
REQUIRED: Denylist policy for all credentials, tokens, and PII.
"""

import re
from typing import Any, Dict

def mask_secrets(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    REQUIRED: Masks client_secret, JWT, Auth headers, card, cvv, password.
    """
    sensitive_keys = {
        "client_secret", "access_token", "refresh_token", 
        "Authorization", "stripe_signature", "password", 
        "card_number", "cvv"
    }
    
    masked = payload.copy()
    for key in masked:
        if any(sk in key for sk in sensitive_keys):
            masked[key] = "********"
        elif isinstance(masked[key], dict):
            masked[key] = mask_secrets(masked[key])
            
    return masked
