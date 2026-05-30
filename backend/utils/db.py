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
        [("name", "text"), ("description", "text"), ("tags", "text")], name="products_text_search")

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

    apply_schema_validators()


# ── JSON Schema validation ─────────────────────────────────────────────────────

_SCHEMAS = {
    "users": {
        "bsonType": "object",
        "required": ["name", "email", "password", "role", "is_active"],
        "properties": {
            "name":      {"bsonType": "string"},
            "email":     {"bsonType": "string"},
            "password":  {"bsonType": "string"},
            "role":      {"enum": ["customer", "vendor", "admin"]},
            "is_active": {"bsonType": "bool"},
        },
    },
    "vendors": {
        "bsonType": "object",
        "required": ["user_id", "store_name", "is_approved", "is_active"],
        "properties": {
            "user_id":     {"bsonType": "string"},
            "store_name":  {"bsonType": "string"},
            "is_approved": {"bsonType": "bool"},
            "is_active":   {"bsonType": "bool"},
        },
    },
    "products": {
        "bsonType": "object",
        "required": ["vendor_id", "name", "price", "category", "is_active"],
        "properties": {
            "vendor_id": {"bsonType": "string"},
            "name":      {"bsonType": "string"},
            "price":     {"bsonType": ["int", "long", "double", "decimal"]},
            "discount":  {"bsonType": ["int", "long", "double"]},
            "category":  {"bsonType": "string"},
            "images":    {"bsonType": "array"},
            "tags":      {"bsonType": "array"},
            "is_active": {"bsonType": "bool"},
        },
    },
    "inventory": {
        "bsonType": "object",
        "required": ["product_id", "quantity"],
        "properties": {
            "product_id": {"bsonType": "string"},
            "quantity":   {"bsonType": ["int", "long"]},
            "vendor_id":  {"bsonType": "string"},
        },
    },
    "orders": {
        "bsonType": "object",
        "required": ["user_id", "items", "total", "status", "payment_status"],
        "properties": {
            "user_id":        {"bsonType": "string"},
            "items":          {"bsonType": "array"},
            "total":          {"bsonType": ["int", "long", "double", "decimal"]},
            "status":         {"enum": ["pending", "processing", "shipped", "delivered", "cancelled"]},
            "payment_status": {"enum": ["unpaid", "paid"]},
        },
    },
    "reviews": {
        "bsonType": "object",
        "required": ["product_id", "user_id", "rating"],
        "properties": {
            "product_id": {"bsonType": "string"},
            "user_id":    {"bsonType": "string"},
            "rating":     {"bsonType": "int", "minimum": 1, "maximum": 5},
            "comment":    {"bsonType": "string"},
        },
    },
    "coupons": {
        "bsonType": "object",
        "required": ["code", "discount_type", "discount_value", "is_active"],
        "properties": {
            "code":           {"bsonType": "string"},
            "discount_type":  {"enum": ["percentage", "fixed"]},
            "discount_value": {"bsonType": ["int", "long", "double"]},
            "is_active":      {"bsonType": "bool"},
        },
    },
}


def apply_schema_validators():
    db = get_db()
    existing = set(db.list_collection_names())
    print("Applying JSON Schema validators...")

    for name, schema in _SCHEMAS.items():
        validator = {"$jsonSchema": schema}
        if name in existing:
            db.command(
                "collMod", name,
                validator=validator,
                validationLevel="moderate",
                validationAction="error",
            )
        else:
            db.create_collection(
                name,
                validator=validator,
                validationLevel="moderate",
                validationAction="error",
            )
        print(f"  - {name}")

    print("All schema validators applied.")
