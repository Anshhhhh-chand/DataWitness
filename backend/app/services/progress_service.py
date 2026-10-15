"""Helpers for serializing investigation progress events."""

import json
from typing import Any


def as_sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event, default=str)}\n\n"
