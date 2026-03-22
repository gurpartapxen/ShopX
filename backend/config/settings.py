"""
Django settings for the e-commerce backend.

We use python-dotenv to load variables from .env so no sensitive
values ever live directly in this file.
"""

from pathlib import Path
import os
from dotenv import load_dotenv
import os
from corsheaders.defaults import default_headers

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
# Load .env file from the project root (same folder as manage.py)
load_dotenv()

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent


# ── Security ───────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise ValueError(
        "SECRET_KEY is not set. "
        "Copy .env.example to .env and fill in your values."
    )

DEBUG = os.getenv("DEBUG", "True") == "True"

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")


# ── Installed apps ─────────────────────────────────────────────────────────────
# We only add what we actually need right now.
# Each phase will add its own apps here.

INSTALLED_APPS = [
    # Django built-ins we need
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "django.contrib.auth",

    # Third-party
    "rest_framework",
    "corsheaders",

# Our apps — will be added phase by phase
    "apps.users",
    "apps.vendors",
    "apps.products",
    "apps.orders",
]


# ── Middleware ──────────────────────────────────────────────────────────────────
MIDDLEWARE = [
    # CorsMiddleware must be as high as possible, before CommonMiddleware
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# ── URL config ──────────────────────────────────────────────────────────────────
ROOT_URLCONF = "config.urls"


# ── Templates ───────────────────────────────────────────────────────────────────
# We're building a pure API — no HTML templates needed.
# Keeping this minimal.
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
            ],
        },
    },
]


# ── WSGI ────────────────────────────────────────────────────────────────────────
WSGI_APPLICATION = "config.wsgi.application"


# ── Database ─────────────────────────────────────────────────────────────────
# We are NOT using Django's ORM at all.
# MongoDB is connected separately via PyMongo in utils/db.py
# This empty dict tells Django "no SQL database" without errors.
DATABASES = {}


# ── Django REST Framework ─────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
    "apps.users.authentication.MongoJWTAuthentication",
],
}
from datetime import timedelta
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME":  timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS":  True,
    "ALGORITHM":              "HS256",
    "SIGNING_KEY":            SECRET_KEY,
    "AUTH_HEADER_TYPES":      ("Bearer",),
    "USER_ID_FIELD":          "id",
    "USER_ID_CLAIM":          "user_id",
}

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow our Next.js frontend to make requests to Django
CORS_ALLOWED_ORIGINS = [
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
]
CORS_ALLOW_CREDENTIALS = True


# ── Static files ──────────────────────────────────────────────────────────────
STATIC_URL = "/static/"


# ── Timezone + Language ───────────────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"   # IST — change if needed
USE_I18N = True
USE_TZ = True                # Store all datetimes as UTC internally


# ── Default primary key ───────────────────────────────────────────────────────
# Required by Django even when not using the ORM
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
