"""Pure-Python utilities shared across all layers.

Only stdlib — no framework dependencies allowed here.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any


def utc_now() -> str:
    """Return the current UTC time as an ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def json_dumps(value: Any) -> str:
    """Serialize *value* to a JSON string (ASCII-safe)."""
    return json.dumps(value, ensure_ascii=True)


def json_loads(value: str | None, fallback: Any = None) -> Any:
    """Deserialize a JSON string; return *fallback* on failure or None input."""
    if value is None:
        return fallback
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return fallback
