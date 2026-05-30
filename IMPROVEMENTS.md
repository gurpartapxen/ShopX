# ShopX — Improvements Log

Based on the executive summary security audit. All changes implemented on the existing
Django + Next.js + MongoDB stack without architectural rewrites.

---

## 1. Token Storage → HttpOnly Cookies + In-Memory Access Token + CSRF

**Problem:** Access and refresh tokens were stored in `localStorage`, readable by any JavaScript
on the page (XSS vulnerability).

**Final architecture (single source of truth, no token reachable from JS):**

| Token | Where it lives | XSS can read it? |
|-------|---------------|------------------|
| Access token (15 min) | JS memory only, sent via `Authorization: Bearer` | only in the current tab session; gone on reload |
| Refresh token (7 days) | HttpOnly cookie **only** — never localStorage, never request body | **No** |
| CSRF token | non-HttpOnly cookie, echoed in `X-CSRF-Token` header | yes (by design — it's not a credential) |

**What changed:**

- **Backend** — Login/Register set two cookies: `refresh_token` (HttpOnly) and `csrf_token`
  (readable). **No `access_token` cookie** — the access token is returned in the body for
  in-memory use only. Cookie `SameSite`: `None; Secure` in prod (cross-domain Vercel ↔ Render),
  `Lax` in dev (same-site localhost, Chrome rejects `None` without `Secure` on HTTP).
- **Backend** — `MongoJWTAuthentication` accepts the access token **only** from the
  `Authorization: Bearer` header (never a cookie). Because a custom header can't be forged
  cross-site, every data endpoint is inherently CSRF-proof.
- **Backend** — `RefreshTokenView` reads the refresh token **only** from the HttpOnly cookie
  (no body fallback), enforces a **double-submit CSRF check** (`X-CSRF-Token` header must equal
  the `csrf_token` cookie), and returns the **authoritative user** so the SPA never trusts
  client storage for auth state.
- **Backend** — `utils/csrf.py` — `generate_csrf_token()` + constant-time `csrf_valid(request)`.
- **Backend** — `POST /api/auth/logout/` always clears both cookies (never blockable).
- **Backend** — `CORS_ALLOW_HEADERS` extended with `x-csrf-token` so the header passes preflight.
- **Frontend** — Access token in **JS module memory only**. `lib/api.js` attaches the Bearer
  token + `X-CSRF-Token` header (read from the readable cookie) on every request, with a single
  deduplicated `refreshAccessToken()` for silent 401 recovery.
- **Frontend** — **No tokens or user object in `localStorage`.** On reload, `AuthContext` probes
  the readable `csrf_token` cookie to decide whether a session exists, then calls `/auth/refresh/`
  (cookie + CSRF header) to re-mint the access token and fetch the authoritative user.

**Why the previous localStorage-refresh + body-fallback was removed:** storing the refresh token
in `localStorage` (or sending it in the body) re-exposed it to the exact XSS class the HttpOnly
cookie defends against. With the dev cookie issues already fixed (§11), the cookie works on
reload without any fallback, so the fallback was pure liability and is gone.

**Files changed/created:**
`backend/utils/csrf.py` *(new)* · `backend/apps/users/authentication.py` ·
`backend/apps/users/views.py` · `backend/config/settings.py` ·
`frontend/lib/api.js` · `frontend/context/AuthContext.js` · `frontend/app/store/profile/page.js`

---

## 2. Access Token Lifetime Shortened

**Problem:** Access tokens were valid for 60 minutes — a long exposure window if stolen.

**What changed:** `ACCESS_TOKEN_LIFETIME` reduced **60 min → 15 min** in `SIMPLE_JWT`.
The refresh token silently rotates it in the background — users notice nothing.

**File changed:** `backend/config/settings.py`

---

## 3. Password Minimum Raised

**Problem:** Minimum password length was 6 characters — too weak.

**What changed:** Minimum raised to **8 characters** in both `RegisterView` and `ChangePasswordView`.

**File changed:** `backend/apps/users/views.py`

---

## 4. Rate Limiting on Critical Endpoints

**Problem:** No throttling — login, register, checkout, and payment endpoints were open to
brute-force and abuse.

**What changed:** DRF throttle scopes configured in `settings.py`, custom throttle classes
applied to each sensitive view:

| Endpoint | Limit |
|----------|-------|
| `POST /auth/login/` | 5 / min |
| `POST /auth/register/` | 3 / min |
| `POST /auth/refresh/` | 10 / min |
| `POST /orders/checkout/` | 10 / min |
| `POST /orders/payment/verify/` | 10 / min |
| All anonymous requests | 200 / hour |
| All authenticated requests | 1 000 / hour |

**Files changed:** `backend/config/settings.py` · `backend/apps/users/views.py` ·
`backend/apps/orders/views.py`

---

## 5. Security Headers Middleware

**Problem:** No `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`, HSTS,
or `X-Frame-Options`.

**What changed:**

- `django.middleware.security.SecurityMiddleware` added to `MIDDLEWARE`.
- New `SecurityHeadersMiddleware` (`backend/config/middleware.py`) sets:
  - `Content-Security-Policy` — scoped to Razorpay and Cloudinary origins only
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` — disables camera, microphone, geolocation
- Django settings: `SECURE_HSTS_SECONDS`, `X_FRAME_OPTIONS = "DENY"`,
  `SECURE_CONTENT_TYPE_NOSNIFF = True` (HSTS only active in production).

**Files changed/created:** `backend/config/middleware.py` *(new)* · `backend/config/settings.py`

---

## 6. MongoDB Indexes

**Problem:** `create_indexes()` in `utils/db.py` was a placeholder — every query did a full
collection scan.

**What changed:** All 6 collections now have proper indexes:

| Collection | Indexes |
|------------|---------|
| `users` | `email` (unique), `role` |
| `vendors` | `user_id`, `slug` (unique), `is_approved` |
| `products` | `vendor_id`, `category`, `is_active`, compound `category+is_active`, full-text on `name/description/tags` |
| `inventory` | `product_id` (unique), `vendor_id` |
| `orders` | `user_id`, `vendor_id`, `status`, compound `user_id+created_at`, `razorpay_order_id` |
| `reviews` | `product_id`, compound `product_id+user_id` (unique — one review per user per product) |
| `coupons` | `code` (unique), `is_active` |

Run once to apply: `cd backend && python setup_db.py`

**File changed:** `backend/utils/db.py`

---

## 7. Input Sanitization — NoSQL Injection + ReDoS Prevention

**Problem:** User-supplied data was passed to MongoDB queries without sanitization.
A payload like `{"email": {"$gt": ""}}` could bypass query logic.

**What changed:**

- New `backend/utils/sanitize.py` — `clean(data)` strips keys starting with `$`
  (NoSQL operator injection), removes null bytes, and processes nested dicts/lists recursively.
- `clean()` applied at the top of **every write method** (POST / PATCH) across all 4 view files.
- Product search `q` param now passes through `re.escape()` before use in a `$regex` query —
  prevents ReDoS attacks from catastrophic backtracking patterns like `(.*)*`.

**Files changed/created:** `backend/utils/sanitize.py` *(new)* ·
`backend/apps/users/views.py` · `backend/apps/vendors/views.py` ·
`backend/apps/products/views.py` · `backend/apps/orders/views.py`

---

## 8. Atomic Inventory Decrement

**Problem:** `PaymentVerifyView` decremented inventory with plain `update_one`. Concurrent
orders could push stock negative (overselling).

**What changed:** Now uses `find_one_and_update` with `{"quantity": {"$gte": required_qty}}`
guard — stock can never go below zero. If a race condition is detected (stock exhausted
between checkout and payment), the order is flagged `stock_issue: True` for manual refund.

**File changed:** `backend/apps/orders/views.py`

---

## 9. CI/CD Pipeline (GitHub Actions)

**Problem:** No automated checks — broken code could deploy directly to production.

**What changed:** `.github/workflows/ci.yml` with three jobs:

**`backend-checks`** (every push / PR to `main`):
1. Installs `requirements_clean.txt` + `requirements-dev.txt`
2. `flake8` — lint, max line length 120
3. `bandit` — security scan, medium+ severity

**`frontend-checks`** (every push / PR to `main`):
1. `npm ci`
2. `eslint .` — lint with `eslint-config-next/core-web-vitals`
3. `next build` — compile-time error check

**`deploy-backend`** (push to `main` only, after both checks pass):
- Fires Render deploy hook via `curl` using `RENDER_DEPLOY_HOOK_URL` GitHub secret
- Exits cleanly with setup instructions if the secret is not yet configured

**Supporting files:**
`backend/requirements-dev.txt` · `backend/.flake8` · `frontend/package.json` (lint script fixed)

**Setup steps:**
- GitHub → Settings → Branches → protect `main` → require both CI status checks
- Render → Service → Settings → Deploy Hook → copy URL → GitHub Secret `RENDER_DEPLOY_HOOK_URL`

---

## 10. SEO — Next.js ISR, Open Graph, JSON-LD

**Problem:** All pages were `"use client"` — Google's crawler received a blank JS shell with
no meaningful metadata. Every product page had the same generic title and description.

**What changed:**

- **Product detail page split into two files:**
  - `app/store/product/[id]/page.js` — Server Component. Exports `generateMetadata()` that
    fetches product data server-side and returns a unique `<title>`, `<meta description>`,
    Open Graph tags, and Twitter Card per product. Exports `revalidate = 3600` (ISR — page is
    cached for 1 hour, then silently re-fetched in the background).
  - `app/store/product/[id]/ProductPageClient.js` — Client Component with all interactive UI
    (cart, wishlist, reviews, qty picker). Receives `productId` as a plain prop.
  - JSON-LD `<script type="application/ld+json">` injected into `<head>` — Schema.org `Product`
    structured data enabling Google rich results (price, rating, stock status in search).

- **Root layout** (`app/layout.js`) — Added title template (`%s | ShopX`), OG defaults,
  Twitter card, `robots: index/follow`.

- **Store layout** (`app/store/layout.js`) *(new)* — Store-section metadata override
  (`Shop | ShopX` as default title for all `/store/*` routes).

**Metadata cascade:**

| Route | Title Google sees |
|-------|------------------|
| Any page | `ShopX — Multi-Vendor Store` |
| `/store/*` | `Shop \| ShopX` |
| `/store/product/[id]` | `{Product Name} \| ShopX` |

**Files changed/created:**
`frontend/app/layout.js` · `frontend/app/store/layout.js` *(new)* ·
`frontend/app/store/product/[id]/page.js` ·
`frontend/app/store/product/[id]/ProductPageClient.js` *(new)*

---

## 11. Session Persistence Fix (Reload → Login Bug)

**Problem:** Reloading any page redirected the user back to `/login`, requiring re-authentication
every time. Three compounding root causes:

1. **`127.0.0.1` ≠ `localhost` for cookies** — `.env.local` pointed the API at
   `http://127.0.0.1:8000`. Browsers treat `127.0.0.1` and `localhost` as different domains for
   cookie purposes. The refresh cookie set by `localhost:8000` was never sent to `127.0.0.1:8000`.
   Fixed: changed to `http://localhost:8000/api`.

2. **`SameSite=None` without `Secure` silently rejected** — Chrome discards any cookie with
   `SameSite=None; Secure=false` on HTTP. The cookie was never stored in the browser.
   Fixed: development now uses `SameSite=Lax; Secure=false` (accepted by Chrome;
   `localhost` ports are same-site so Lax cookies are sent cross-port including POST).

3. **No body fallback for the refresh token** — The frontend relied entirely on the cookie being
   sent. When it wasn't, the refresh call returned 401, the catch block cleared localStorage,
   and the page redirected to login.
   Fixed: refresh token now stored in `localStorage` and sent in the request body on every
   refresh call. The backend reads `cookie → body` in that priority — production uses the
   HttpOnly cookie, development uses the body token.

**Files changed:**
`frontend/.env.local` · `frontend/context/AuthContext.js` · `frontend/lib/api.js` ·
`backend/apps/users/views.py`

---

## Summary Table

| # | Improvement | Category | Risk / Benefit |
|---|-------------|----------|---------------|
| 1 | JWT → HttpOnly cookies + memory access token | Security | Eliminates XSS token theft |
| 2 | Access token 60 → 15 min | Security | Reduces stolen-token reuse window |
| 3 | Password min 6 → 8 chars | Security | Stronger credentials |
| 4 | Rate limiting on auth / payment | Security | Blocks brute-force attacks |
| 5 | Security headers (CSP, HSTS, X-Frame…) | Security | Clickjacking, XSS, sniffing |
| 6 | MongoDB indexes on all 6 collections | Performance | Fast queries at scale |
| 7 | Input sanitization + re.escape on search | Security | NoSQL injection, ReDoS |
| 8 | Atomic inventory with $gte guard | Data integrity | Prevents overselling |
| 9 | CI/CD pipeline (GitHub Actions) | Process | Bad code never reaches prod |
| 10 | SEO — ISR, Open Graph, JSON-LD, meta | SEO | Google rich results, crawlability |
| 11 | Session persistence fix (reload bug) | Bug fix | Users stay logged in after reload |

---

## 12. Redis Caching — Product Listings and Vendor Profiles

**Problem:** Every product list and detail request hit MongoDB directly — slow cold
responses (9 000 ms+) under normal load, worse at scale.

**What changed:**

- **`backend/utils/cache.py`** *(new)* — cache key builders, TTL constants, and
  `bust_product` / `bust_vendor` invalidation helpers:
  - `product_list_key(params)` — stable MD5 hash of all query params; each unique
    filter/sort/page combination gets its own cache slot
  - `product_detail_key(product_id)` and `vendor_public_key(vendor_id)`
  - `bust_product(id)` — deletes the detail key + pattern-deletes all list keys
  - `bust_product_lists()` — uses `delete_pattern` with a silent fallback for
    LocMemCache (dev without Redis)

- **`backend/requirements_clean.txt`** — added `django-redis==5.4.0` and `redis==5.0.8`.

- **`backend/config/settings.py`** — dynamic `CACHES` config:
  - `REDIS_URL` env var set → `django_redis.cache.RedisCache` with `IGNORE_EXCEPTIONS`
    (Redis going down degrades gracefully, never crashes the app)
  - `REDIS_URL` not set → Django's built-in `LocMemCache` (zero-config dev fallback)

- **Views cached:**

| View | TTL | Invalidated when |
|------|-----|-----------------|
| `GET /api/products/` (list) | 5 min | Product created / updated / deleted |
| `GET /api/products/{id}/` (detail) | 5 min | Product updated / deleted / inventory changed / review submitted |
| `GET /api/vendors/{id}/` (public) | 10 min | Vendor updates their profile |

**Measured speedup (dev LocMemCache):**

| Request | Time |
|---------|------|
| First (MongoDB) | ~9 900 ms |
| Second (cache hit) | ~52 ms |

**To enable Redis in production:** add `REDIS_URL=<your-redis-url>` to Render env vars.
Free options: Render managed Redis, or [Upstash](https://upstash.com) free tier.

**Files changed/created:**
`backend/utils/cache.py` *(new)* · `backend/requirements_clean.txt` ·
`backend/config/settings.py` · `backend/apps/products/views.py` ·
`backend/apps/vendors/views.py`

---

## 13. Cross-Domain Cookie Fix — Same-Origin Proxy (BFF)

**Problem:** After the HttpOnly-cookie auth went live, production (but not local dev) logged the
user out on every page reload. Root cause: the frontend (Vercel) and backend (Render) are on
**different domains**. The readable `csrf_token` cookie is set by the *Render* domain, but a page
served from the *Vercel* domain cannot read another domain's cookie via `document.cookie`. So the
reload-time session probe `hasSession()` was always false → the app never attempted the refresh →
redirect to login. (It worked locally only because `localhost:3000` and `localhost:8000` share the
`localhost` hostname.) Worse, even a forced refresh couldn't build the `X-CSRF-Token` header, and a
third-party cookie may not be sent at all under modern browser policies.

**Fix — reverse-proxy the API through the frontend's own origin:**

- `next.config.mjs` rewrites `/bff/:path*` → `${BACKEND_ORIGIN}/api/:path*/`. The browser now only
  ever talks to the Vercel origin; Next.js proxies to Render server-side. The backend's auth cookies
  are therefore **first-party** to the Vercel domain — readable and sent on reload, exactly like dev.
- `BACKEND_ORIGIN` is derived from the existing `NEXT_PUBLIC_API_URL` (strip the trailing `/api`),
  so **no new environment variable** is needed.
- `skipTrailingSlashRedirect: true` + an explicit trailing slash in the destination — Next's
  `:path*` capture drops the incoming slash and Django requires it (`APPEND_SLASH`).
- `lib/api.js` — axios `baseURL` changed from the absolute backend URL to the same-origin `/bff`.
- Because requests are now same-origin, CORS is bypassed entirely (no preflight), and `SameSite`
  cookies behave first-party. The existing HttpOnly + CSRF design is unchanged — it just works now.

**Verified locally:** register through `/bff` scopes both cookies to the *frontend* origin
(`localhost:3000`); a cookies-only refresh (reload simulation) returns `200` + access + user.

**Deploy:** redeploy the **frontend** only (Next.js config + api client). Backend unchanged.
No Vercel/Render env-var changes required.

**Files changed:** `frontend/next.config.mjs` · `frontend/lib/api.js`

---

## Still To Do

- [ ] Razorpay webhooks — confirm payment server-side if browser closes before callback
- [ ] Sentry error logging and monitoring
- [ ] Restrict MongoDB Atlas IP whitelist (Atlas dashboard change, not code)
- [ ] Docker — Dockerfile + docker-compose for consistent backend deployments
- [ ] Database migration evaluation — PostgreSQL for full ACID compliance
