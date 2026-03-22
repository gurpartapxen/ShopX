"""
Run this script once after setting up your .env file.
It will:
  1. Test your MongoDB Atlas connection
  2. Print the database name it connected to
  3. Create all indexes (empty for now, grows each phase)

Usage:
  python setup_db.py
"""

import os
import sys

# Tell Django which settings to use before importing anything else
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from utils.db import get_client, get_db, create_indexes


def main():
    print("\n" + "═" * 50)
    print("  E-Commerce Backend — Database Setup")
    print("═" * 50)

    # Step 1: Test connection
    print("\n[1/3] Testing MongoDB connection...")
    try:
        client = get_client()
        client.admin.command("ping")
        print("      ✅ Connected to MongoDB Atlas successfully")
    except Exception as e:
        print(f"      ❌ Connection failed: {e}")
        print("\n  Check that:")
        print("  - MONGO_URI is set correctly in your .env")
        print("  - Your IP is whitelisted in Atlas Network Access")
        print("  - Your Atlas username/password are correct")
        sys.exit(1)

    # Step 2: Show which database we're using
    print("\n[2/3] Checking database...")
    db = get_db()
    db_name = os.getenv("MONGO_DB_NAME", "ecommerce_db")
    print(f"      ✅ Using database: '{db_name}'")
    print(f"      ✅ Existing collections: {db.list_collection_names() or ['(none yet — will be created when data is inserted)']}")

    # Step 3: Create indexes
    print("\n[3/3] Creating indexes...")
    create_indexes()

    print("\n" + "═" * 50)
    print("  All good! Start the server with:")
    print("  python manage.py runserver")
    print("═" * 50 + "\n")


if __name__ == "__main__":
    main()
