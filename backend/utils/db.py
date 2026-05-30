import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ConfigurationError
from dotenv import load_dotenv

load_dotenv()

# Module-level singletons — created once, reused always
_client: MongoClient | None = None
_db = None


# ── Connection ─────────────────────────────────────────────────────────────────

def get_client() -> MongoClient:
    """
    Returns the MongoClient singleton.
    Creates it on the first call, reuses it on every call after.
    """
    global _client

    if _client is None:
        mongo_uri = os.getenv("MONGO_URI")

        if not mongo_uri:
            raise ValueError(
                "MONGO_URI is not set in your .env file.\n"
                "Get it from: MongoDB Atlas → Connect → Drivers → Python"
            )

        # serverSelectionTimeoutMS=5000 means:
        # if Atlas can't be reached in 5 seconds, raise an error immediately
        # instead of hanging forever
        _client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)

    return _client


def get_db():
    global _db

    if _db is None:
        client = get_client()
        db_name = os.getenv("MONGO_DB_NAME", "ecommerce_db")
        _db = client[db_name]

    return _db


def ping_db() -> bool:
    try:
        get_client().admin.command("ping")
        return True
    except (ConnectionFailure, ConfigurationError, Exception):
        return False


def users_col():
    return get_db()["users"]

def vendors_col():
    return get_db()["vendors"]

def products_col():
    return get_db()["products"]

def inventory_col():
    return get_db()["inventory"]

def orders_col():
    return get_db()["orders"]


# ── Index creation ─────────────────────────────────────────────────────────────
def create_indexes():
    db = get_db()
    print("Creating indexes...")

    # ── users ──────────────────────────────────────────────────────────────────
    db["users"].create_index("email", unique=True,  name="users_email_unique")
    db["users"].create_index("role",                name="users_role")

    # ── vendors ────────────────────────────────────────────────────────────────
    db["vendors"].create_index("user_id",                             name="vendors_user_id")
    db["vendors"].create_index("slug",    unique=True, sparse=True,   name="vendors_slug_unique")
    db["vendors"].create_index("is_approved",                         name="vendors_is_approved")

    # ── products ───────────────────────────────────────────────────────────────
    db["products"].create_index("vendor_id",                          name="products_vendor_id")
    db["products"].create_index("category",                           name="products_category")
    db["products"].create_index("is_active",                          name="products_is_active")
    db["products"].create_index(
        [("category", 1), ("is_active", 1)],                         name="products_category_active")
    # Text index enables $text search across name, description, and tags
    db["products"].create_index(
        [("name", "text"), ("description", "text"), ("tags", "text")],name="products_text_search")

    # ── inventory ──────────────────────────────────────────────────────────────
    db["inventory"].create_index("product_id", unique=True,           name="inventory_product_id_unique")
    db["inventory"].create_index("vendor_id",                         name="inventory_vendor_id")

    # ── orders ─────────────────────────────────────────────────────────────────
    db["orders"].create_index("user_id",                              name="orders_user_id")
    db["orders"].create_index("vendor_id",                            name="orders_vendor_id")
    db["orders"].create_index("status",                               name="orders_status")
    db["orders"].create_index(
        [("user_id", 1), ("created_at", -1)],                        name="orders_user_recent")
    db["orders"].create_index(
        "razorpay_order_id", sparse=True,                            name="orders_razorpay_id")

    # ── reviews ────────────────────────────────────────────────────────────────
    db["reviews"].create_index("product_id",                          name="reviews_product_id")
    # One review per user per product
    db["reviews"].create_index(
        [("product_id", 1), ("user_id", 1)], unique=True,            name="reviews_product_user_unique")

    # ── coupons ────────────────────────────────────────────────────────────────
    db["coupons"].create_index("code",      unique=True,              name="coupons_code_unique")
    db["coupons"].create_index("is_active",                           name="coupons_is_active")

    print("All indexes created successfully.")
