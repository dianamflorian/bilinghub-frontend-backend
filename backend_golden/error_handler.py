"""
error_handler.py - Strict Error Mapping
REQUIRED: 429, 502, 503, 400, 500 signals.
"""

def map_stripe_error(error_code: str) -> int:
    """
    REQUIRED: Maps Stripe exceptions to strict HTTP responses.
    503 added for upstream connection issues.
    """
    error_map = {
        "rate_limit": 429,
        "api_connection_error": 503, # Connection/Timeout
        "invalid_request_error": 502, # Malformed response / logic
        "card_error": 400,           # Validation / declined
    }
    return error_map.get(error_code, 500)
