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
