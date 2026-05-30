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
- **Atomic inventory** — Stock decrements use `find_one_and_update` with a `$gte` guard (no overselling).
- **MongoDB indexes** — On all collections (unique email, product text search, one-review-per-user, etc.).
- **Performance** — Redis caching for product listings, detail pages, and vendor profiles.
- **SEO** — Product pages are server-rendered with ISR, `generateMetadata`, Open Graph, and JSON-LD.
- **CI/CD** — Every push runs flake8 + bandit (backend) and ESLint + build (frontend); deploy only on pass.

---

## Project Structure

```
ShopX/
├── .github/workflows/ci.yml     # CI/CD: lint, security scan, build, deploy
├── IMPROVEMENTS.md              # full engineering / hardening log
├── backend/
│   ├── apps/
│   │   ├── users/               # auth — register, login, refresh, logout, profile
│   │   ├── vendors/             # vendor onboarding, admin approve/suspend
│   │   ├── products/            # product CRUD, inventory, reviews
│   │   └── orders/              # checkout, payments, cancel, return, coupons
│   ├── config/
│   │   ├── settings.py          # DRF, JWT, CORS, cache, security headers
│   │   └── middleware.py        # CSP / Referrer-Policy / Permissions-Policy
│   ├── utils/
│   │   ├── db.py                # MongoDB connection + index creation
│   │   ├── csrf.py              # double-submit CSRF helpers
│   │   ├── sanitize.py          # NoSQL-injection input sanitizer
│   │   ├── cache.py             # cache keys + invalidation
│   │   ├── helpers.py           # ObjectId converters
│   │   └── permissions.py       # role-based access decorator
│   └── setup_db.py              # run once to create MongoDB indexes
│
└── frontend/
    ├── next.config.mjs          # same-origin /bff reverse proxy to the backend
    ├── app/
    │   ├── store/               # storefront, product detail, cart, checkout, orders
    │   │   └── product/[id]/     # Server Component (SEO/ISR) + Client Component (UI)
    │   ├── vendor/              # vendor dashboard
    │   └── admin/               # admin dashboard
    ├── context/AuthContext.js   # global auth state (cookie-based session)
    └── lib/api.js               # axios client (Bearer + CSRF header, silent refresh)
```

---

## Running Locally

**Backend**
```bash
cd backend
python -m venv venv
venv\Scripts\activate                 # Windows  (use: source venv/bin/activate on macOS/Linux)
pip install -r requirements_clean.txt
copy .env.example .env                 # then fill in your values
python setup_db.py                     # one-time: creates MongoDB indexes
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
