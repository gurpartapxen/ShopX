"""
Django settings for the e-commerce backend.

We use python-dotenv to load variables from .env so no sensitive
values ever live directly in this file.
"""

from pathlib import Path
from datetime import timedelta
import os
from dotenv import load_dotenv
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

    # Our apps
    "apps.users",
    "apps.vendors",
    "apps.products",
    "apps.orders",
]


# ── Middleware ──────────────────────────────────────────────────────────────────
MIDDLEWARE = [
    # CorsMiddleware must be first so preflight OPTIONS requests get CORS headers
    "corsheaders.middleware.CorsMiddleware",
    # SecurityMiddleware handles HSTS, X-Content-Type-Options, etc.
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # Adds CSP, Referrer-Policy, Permissions-Policy
    "config.middleware.SecurityHeadersMiddleware",
]

# ── Security header settings (used by Django's SecurityMiddleware) ─────────────
SECURE_BROWSER_XSS_FILTER    = True
SECURE_CONTENT_TYPE_NOSNIFF  = True
X_FRAME_OPTIONS               = "DENY"
# Only activate HSTS in production — avoids breaking local HTTP dev
SECURE_HSTS_SECONDS           = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD           = not DEBUG


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
    # Global throttle classes — individual views can override with their own
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon":          "200/hour",
        "user":          "1000/hour",
        # Scopes used by LoginRateThrottle, RegisterRateThrottle, etc.
        "login":         "5/min",
        "register":      "3/min",
        "refresh_token": "10/min",
        "checkout":      "10/min",
        "payment":       "10/min",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME":  timedelta(minutes=15),  # short-lived; refresh cookie rotates it
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
# Permit the double-submit CSRF header on cross-origin requests (and its preflight)
CORS_ALLOW_HEADERS = (*default_headers, "x-csrf-token")


# ── Cache (Redis / LocMemCache fallback) ──────────────────────────────────────
# Set REDIS_URL in .env (or Render env vars) to enable distributed Redis caching.
# Without it the app falls back to in-process memory cache — everything still
# works, just cache is not shared between workers and resets on restart.
_REDIS_URL = os.getenv("REDIS_URL")

if _REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND":  "django_redis.cache.RedisCache",
            "LOCATION": _REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS":    "django_redis.client.DefaultClient",
                # Don't crash if Redis drops — just serve uncached responses
                "IGNORE_EXCEPTIONS": True,
                "SOCKET_CONNECT_TIMEOUT": 2,
                "SOCKET_TIMEOUT":         2,
            },
            "KEY_PREFIX": "shopx",
            "TIMEOUT":    300,   # default TTL: 5 min (views override per-key)
        }
    }
else:
    # Local dev without Redis — per-process memory cache, resets on restart
    CACHES = {
        "default": {
            "BACKEND":  "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "shopx-dev",
            "TIMEOUT":  300,
        }
    }

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
