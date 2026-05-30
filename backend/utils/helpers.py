from bson import ObjectId


def to_str_id(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


def to_object_id(id_str: str):
    try:
        return ObjectId(id_str)
    except Exception:
        return None


def first_error(serializer) -> str:
    """
    Collapse a DRF serializer's errors into a single human-readable message,
    matching the app's {"success": False, "message": "..."} response shape.

    DRF stores errors as {field: [msg, ...]} (and "non_field_errors" for
    object-level checks). We surface the first field's first message, prefixed
    with the field name when it adds clarity.
    """
    errors = serializer.errors
    for field, msgs in errors.items():
        msg = msgs[0] if isinstance(msgs, (list, tuple)) and msgs else msgs
        if field in ("non_field_errors", "__all__"):
            return str(msg)
        return f"{field}: {msg}"
    return "invalid request"
