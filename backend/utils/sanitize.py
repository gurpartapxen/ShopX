from typing import Any


def sanitize_value(value: Any) -> Any:
    """Recursively sanitize a value that came from user input."""
    if isinstance(value, dict):
        return sanitize_dict(value)
    if isinstance(value, list):
        return [sanitize_value(item) for item in value]
    if isinstance(value, str):
        # Remove null bytes which can truncate strings in C-based drivers
        return value.replace("\x00", "")
    return value


def sanitize_dict(data: dict) -> dict:
    """
    Remove keys that start with '$' (MongoDB operator injection) and
    recursively sanitize nested values.
    """
    if not isinstance(data, dict):
        return data
    return {
        k: sanitize_value(v)
        for k, v in data.items()
        if not (isinstance(k, str) and k.startswith("$"))
    }


def clean(data: Any) -> Any:
    """Top-level entry point — sanitize whatever user data you have."""
    return sanitize_value(data)
