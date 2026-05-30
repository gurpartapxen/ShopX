import hashlib
import json

from django.core.cache import cache

PRODUCT_LIST_TTL   = 5  * 60   # seconds
PRODUCT_DETAIL_TTL = 5  * 60
VENDOR_TTL         = 10 * 60


# ── Key builders ──────────────────────────────────────────────────────────────

def product_list_key(query_params: dict) -> str:
    digest = hashlib.md5(
        json.dumps(query_params, sort_keys=True).encode()
    ).hexdigest()[:16]
    return f"products:list:{digest}"


def product_detail_key(product_id: str) -> str:
    return f"products:detail:{product_id}"


def vendor_public_key(vendor_id: str) -> str:
    return f"vendors:public:{vendor_id}"


# ── Invalidation helpers ───────────────────────────────────────────────────────

def bust_product_detail(product_id: str) -> None:
    cache.delete(product_detail_key(product_id))


def bust_product_lists() -> None:
    try:
        cache.delete_pattern("*products:list:*")
    except AttributeError:
        pass


def bust_product(product_id: str) -> None:
    bust_product_detail(product_id)
    bust_product_lists()


def bust_vendor(vendor_id: str) -> None:
    cache.delete(vendor_public_key(vendor_id))
