"""
MongoDB connection manager.

This is the single place in the entire project that talks to MongoDB.
Every app (users, products, orders, etc.) imports collection accessors
from here — nobody creates their own MongoClient.

How it works:
  - We use a module-level _client variable (singleton pattern)
  - First call to get_client() creates the connection
  - Every call after that reuses the same connection
  - This is important: MongoClient is expensive to create, so we
    create it once and share it across the whole app
"""

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
    """
    Returns the database object.
    The database name comes from MONGO_DB_NAME in .env.
    """
    global _db

    if _db is None:
        client = get_client()
        db_name = os.getenv("MONGO_DB_NAME", "ecommerce_db")
        _db = client[db_name]

    return _db


def ping_db() -> bool:
    """
    Sends a lightweight ping command to MongoDB.
    Returns True if connected, False if not.
    Used by the /api/health/ endpoint to report DB status.
    """
    try:
        get_client().admin.command("ping")
        return True
    except (ConnectionFailure, ConfigurationError, Exception):
        return False


# ── Collection accessors ───────────────────────────────────────────────────────
#
# Instead of writing get_db()["users"] everywhere, we have named functions.
# This means if we ever rename a collection, we change it in one place.
#
# These will be uncommented phase by phase as we build each app.

def users_col():
    """Phase 2 — user accounts"""
    return get_db()["users"]

def vendors_col():
    """Phase 3 — vendor store profiles"""
    return get_db()["vendors"]

def products_col():
    """Phase 4 — product listings"""
    return get_db()["products"]

def inventory_col():
    """Phase 4 — stock levels per product"""
    return get_db()["inventory"]

def orders_col():
    """Phase 5 — customer orders"""
    return get_db()["orders"]


# ── Index creation ─────────────────────────────────────────────────────────────
#
# Indexes make queries fast. Without them, every query does a full
# collection scan — fine for 100 documents, very slow for 100,000.
#
# We'll add indexes here phase by phase as we create each collection.
# Run setup_db.py once after each phase to apply the new indexes.

def create_indexes():
    """
    Creates all MongoDB indexes for the project.
    Safe to run multiple times — MongoDB ignores duplicates.
    """
    print("Creating indexes...")

    # Phase 2 indexes will be added here
    # Phase 3 indexes will be added here
    # Phase 4 indexes will be added here
    # Phase 5 indexes will be added here

    print("Done — no indexes yet (will be added phase by phase)")
