# ShopX

A full-stack, multi-vendor e-commerce platform built with Django and Next.js.
Vendors list products, customers buy them, and admins keep everything in check.

**Live:** https://shop-x-mu.vercel.app

---

## What is this?

ShopX is a complete e-commerce platform I built from scratch. It supports multiple vendors,
each with their own store and product listings. Customers can browse products, add to cart,
checkout with Razorpay, track orders, leave reviews, and use promo codes. Admins approve
vendors, manage coupons, and monitor the platform.

It started as a working MVP and has since been hardened to production standards — secure
cookie-based auth with CSRF protection, rate limiting, security headers, Redis caching,
MongoDB indexing, SEO, and a CI/CD pipeline. See [IMPROVEMENTS.md](IMPROVEMENTS.md) for the
full engineering log.

---

## Tech Stack

- **Backend** — Django 4.2 + Django REST Framework
- **Database** — MongoDB Atlas (via PyMongo — no ORM)
- **Auth** — JWT with HttpOnly refresh cookie + in-memory access token + CSRF (custom MongoDB auth)
- **Cache** — Redis (optional; falls back to in-process cache automatically)
- **Payments** — Razorpay (HMAC-verified)
- **Images** — Cloudinary
- **Frontend** — Next.js 16 (App Router, React 19)
- **CI/CD** — GitHub Actions (lint + security scan + build, auto-deploy on green)
- **Hosting** — Render (backend) + Vercel (frontend)

---

## Features

**For customers**
- Browse products by category, gender filter, and search
- Add to cart and wishlist
- Checkout with Razorpay payment
- Apply promo/coupon codes at checkout
- Track orders with live status updates
- Cancel pending orders or request returns on delivered ones
- Leave star ratings and reviews (one per product)
- Edit profile, saved address, change password

**For vendors**
- Register and create a store (pending admin approval)
- Add products with images, price, discount, category
- Manage inventory (update stock)
- View and update order status (processing → shipped → delivered)

**For admins**
- Approve or suspend vendor accounts
- View all products and vendors on the platform
- Create and manage coupon codes (percentage or flat discount)
- Set min order amount, max uses, and expiry on coupons

---

## Security & Engineering Highlights

This is what separates the hardened build from the original MVP:

- **Secure auth** — Access token lives only in JS memory (15 min); the refresh token is an
  **HttpOnly cookie** (never reachable from JavaScript). No tokens in `localStorage`.
- **CSRF protection** — Double-submit token validated on the cookie-authenticated refresh endpoint.
- **Same-origin proxy (BFF)** — Next.js reverse-proxies `/bff/*` to the backend so auth cookies
  are first-party even though frontend and backend live on different domains.
- **Rate limiting** — Throttling on login (5/min), register (3/min), refresh, checkout, and payment.
- **Security headers** — CSP, HSTS, Referrer-Policy, Permissions-Policy, X-Frame-Options, nosniff.
- **NoSQL-injection & ReDoS hardening** — All write inputs sanitized; product search escaped.
- **Two-layer validation** — DRF serializers validate every write request; MongoDB `$jsonSchema`
  validators enforce types/enums/required fields at the database. Registration can't self-assign `admin`.
- **Atomic inventory** — Stock decrements use `find_one_and_update` with a `$gte` guard (no overselling).
- **MongoDB indexes** — On all collections (unique email, product text search, one-review-per-user, etc.).
- **Performance** — Redis caching for product listings, detail pages, and vendor profiles.
- **SEO** — Product pages are server-rendered with ISR, `generateMetadata`, Open Graph, and JSON-LD.
- **CI/CD** — Every push runs flake8 + bandit (backend) and ESLint + build (frontend); deploy only on pass.

---

## Codebase Guide

A brief tour of every meaningful file and what it does.

### Backend (`backend/`)

**Project config (`config/`)**
| File | What it does |
|------|--------------|
| `config/settings.py` | Central Django config — installed apps, DRF, custom JWT auth, throttle rates, CORS, Redis/in-memory cache, and security-header settings (HSTS, nosniff, X-Frame). |
| `config/urls.py` | Root URL router — mounts `/api/health/` and includes each app's URLs under `/api/auth`, `/api/vendors`, `/api/products`, `/api/orders`. |
| `config/middleware.py` | `SecurityHeadersMiddleware` — adds Content-Security-Policy, Referrer-Policy, and Permissions-Policy to every response. |
| `config/wsgi.py` | WSGI entry point used by Gunicorn in production. |

**Apps (`apps/`)** — each has `views.py` (logic), `urls.py` (routes), `serializers.py` (request validation)
| File | What it does |
|------|--------------|
| `apps/users/views.py` | Register, login, refresh, logout, profile, change-password. Sets the HttpOnly refresh + CSRF cookies; returns the access token in the body. |
| `apps/users/authentication.py` | `MongoJWTAuthentication` — validates the `Bearer` access token and loads the Mongo user as `MongoUser`. Header-only (no cookie) so data endpoints stay CSRF-proof. |
| `apps/users/serializers.py` | Validates auth payloads; restricts registration to `customer`/`vendor` (blocks self-made admins). |
| `apps/vendors/views.py` | Vendor onboarding, own-profile get/update, public vendor view, and admin approve/suspend. |
| `apps/vendors/serializers.py` | Validates vendor onboarding + profile updates. |
| `apps/products/views.py` | Product list (filters/search/sort + cache), detail, create/update/delete, inventory, reviews, Cloudinary image upload. |
| `apps/products/serializers.py` | Validates product create/update, inventory quantity, and review rating/comment. |
| `apps/orders/views.py` | Checkout (Razorpay order), payment verify (HMAC + atomic stock), order list/detail, cancel, returns, vendor order status, admin coupons. |
| `apps/orders/serializers.py` | Validates checkout items, coupon validation, and coupon create/update. |

**Shared utilities (`utils/`)**
| File | What it does |
|------|--------------|
| `utils/db.py` | The single MongoDB connection (singleton PyMongo client), collection accessors, **index creation**, and **`$jsonSchema` validators** for all collections. |
| `utils/permissions.py` | `@require_role(...)` decorator — authenticates the request and enforces role-based access on a view. |
| `utils/csrf.py` | Double-submit CSRF token generator + constant-time validator for the cookie-authenticated refresh endpoint. |
| `utils/sanitize.py` | `clean()` — strips `$`-prefixed keys and null bytes from input to prevent NoSQL injection. |
| `utils/cache.py` | Cache key builders, TTLs, and invalidation helpers for product/vendor caching. |
| `utils/helpers.py` | `to_str_id` / `to_object_id` ObjectId converters + `first_error()` (DRF errors → `{message}`). |

**Scripts & config**
| File | What it does |
|------|--------------|
| `setup_db.py` | Run once after setup — tests the DB connection, creates all indexes, and applies the JSON Schema validators. |
| `gen_sig.py` | Dev helper to generate a Razorpay HMAC signature for manually testing payment verification. |
| `requirements_clean.txt` | Runtime dependencies (Django, DRF, PyMongo, Razorpay, Cloudinary, Redis…). |
| `requirements-dev.txt` | CI-only tools — flake8 + bandit. |
| `.flake8` | Lint config (max line length, ignores, excludes). |
| `.env.example` | Template for the required environment variables. |

### Frontend (`frontend/`)

**Config**
| File | What it does |
|------|--------------|
| `next.config.mjs` | The `/bff/*` same-origin reverse proxy to the backend (makes auth cookies first-party) + trailing-slash handling. |
| `eslint.config.mjs` | ESLint (Next core-web-vitals) config used in CI. |
| `jsconfig.json` | Path alias `@/*` → project root. |
| `postcss.config.mjs` | Tailwind CSS v4 PostCSS plugin. |

**App shell & data layer**
| File | What it does |
|------|--------------|
| `app/layout.js` | Root layout — fonts, global metadata (title template, Open Graph), wraps everything in `AuthProvider`. |
| `app/globals.css` | Global styles / Tailwind import. |
| `app/page.js` | Landing route — redirects by role (customer → store, vendor → dashboard, admin → admin). |
| `context/AuthContext.js` | Global auth state — login/register/logout, silent refresh on reload, in-memory access token. |
| `lib/api.js` | Axios client — attaches the Bearer + CSRF headers, dedup silent-refresh on 401; exports the typed `authAPI`/`productsAPI`/`ordersAPI`/`vendorsAPI`. |
| `components/ImageUploader.js` | Reusable file-upload widget that posts to the Cloudinary upload endpoint. |
| `app/api/logo/route.js` | Tiny Next route handler that proxies external SVG logos (CORS-friendly). |

**Auth pages**
| File | What it does |
|------|--------------|
| `app/login/page.js` | Login form. |
| `app/register/page.js` | Registration with a 2-step vendor flow (store details). |

**Storefront (`app/store/`)**
| File | What it does |
|------|--------------|
| `store/layout.js` | Store-section metadata (title template). |
| `store/page.js` | Main storefront — product grid, category/gender filters, search, sorting. |
| `store/product/[id]/page.js` | **Server Component** — SEO metadata, JSON-LD, ISR caching. |
| `store/product/[id]/ProductPageClient.js` | **Client Component** — gallery, add-to-cart/wishlist, reviews UI. |
| `store/cart/page.js` | Cart (localStorage-backed). |
| `store/checkout/page.js` | Address + Razorpay checkout flow. |
| `store/wishlist/page.js` | Saved items. |
| `store/orders/page.js` | Order history. |
| `store/orders/[id]/page.js` | Order detail — status, cancel, return request. |
| `store/profile/page.js` | Profile + address edit, change password. |
| `store/new-arrivals/`, `store/deals/`, `store/sale/` | Curated product listing variants. |

**Dashboards**
| File | What it does |
|------|--------------|
| `app/vendor/page.js` | Vendor dashboard — manage products, inventory, and order status. |
| `app/admin/page.js` | Admin dashboard — approve/suspend vendors, manage coupons. |

### Root
| File | What it does |
|------|--------------|
| `.github/workflows/ci.yml` | CI/CD — backend lint + security scan, frontend lint + build, deploy on green. |

---

## Running Locally

**Backend**
```bash
cd backend
python -m venv venv
venv\Scripts\activate                 # Windows  (use: source venv/bin/activate on macOS/Linux)
pip install -r requirements_clean.txt
copy .env.example .env                 # then fill in your values
python setup_db.py                     # one-time: creates indexes + JSON Schema validators
python manage.py runserver
```

**Frontend**
```bash
cd frontend
npm install
# create .env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:8000/api
npm run dev
```

> Use `localhost` (not `127.0.0.1`) for the API URL — the frontend and backend must share the
> same hostname locally so the auth cookies are treated as same-site.

---

## Environment Variables

**Backend `.env`**
```
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
MONGO_URI=your-mongodb-atlas-uri
MONGO_DB_NAME=ecommerce_db
FRONTEND_URL=http://localhost:3000
RAZORPAY_KEY_ID=your-key
RAZORPAY_KEY_SECRET=your-secret
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
# Optional — enables shared Redis cache (otherwise an in-process cache is used)
# REDIS_URL=redis://localhost:6379/0
```

**Frontend `.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

> In production, set `NEXT_PUBLIC_API_URL` on Vercel to your Render backend URL. The frontend
> talks to its own origin via `/bff`, and `next.config.mjs` derives the proxy target from this
> variable — so no extra config is needed.

---

## Test Accounts (live site)

| Role | Email | Password |
|------|-------|----------|
| Customer | test@gmail.com | test123 |
| Vendor | vendor@gmail.com | vendor123 |

**Razorpay test payment**
- UPI: `success@razorpay`
- Card: `4111 1111 1111 1111` · Expiry: `12/25` · CVV: `123`

---

## How Auth Works

1. **Login** sets an HttpOnly `refresh_token` cookie + a readable `csrf_token` cookie, and returns
   a short-lived access token in the body.
2. The **access token** is held in JS memory and sent as a `Bearer` header on every API call.
3. When it expires, the client silently calls `/auth/refresh/` — the HttpOnly cookie is sent
   automatically, the `X-CSRF-Token` header is validated, and a fresh access token is issued.
4. On **reload**, memory is empty, so the app re-mints the access token from the cookie and
   re-fetches the authoritative user — no token ever touches `localStorage`.
5. In production, the `/bff` reverse proxy keeps those cookies first-party to the frontend domain.

## How Payments Work

1. Customer hits checkout → backend creates a Razorpay order
2. Razorpay modal opens in the browser
3. Customer completes payment
4. Frontend sends the payment ID + signature back to the backend
5. Backend verifies the HMAC signature
6. Order is marked paid, stock is atomically reduced, customer gets confirmation

---

## Notes

- **No SQL.** Everything goes through MongoDB directly via PyMongo — no Django models,
  migrations, or ORM. JWT auth is fully custom to work with MongoDB user documents.
- The storefront caches product lists in `sessionStorage` to avoid redundant fetches.
- Render's free tier sleeps after inactivity — UptimeRobot keeps it warm.
- `requirements_clean.txt` is the runtime dependency list; `requirements-dev.txt` holds CI tools
  (flake8, bandit).

---

## Deployment

- Backend on [Render](https://render.com) — free tier, Python web service
- Frontend on [Vercel](https://vercel.com) — free tier, Next.js
- Database on [MongoDB Atlas](https://cloud.mongodb.com) — free M0 cluster
- Images on [Cloudinary](https://cloudinary.com) — free tier

Total hosting cost: **₹0**
