ShopX
A full-stack multi-vendor e-commerce platform built with Django and Next.js.
Vendors can list products, customers can buy them, and admins keep everything in check.

Live: https://shop-x-mu.vercel.app

What is this?
ShopX is a complete e-commerce platform I built from scratch. It supports multiple vendors,
each with their own store and product listings. Customers can browse products, add to cart,
checkout with Razorpay, track orders, leave reviews, and use promo codes. Admins can approve
vendors, manage coupons, and monitor the platform.

TECH STACK
Backend — Django 4.2 + Django REST Framework
Database — MongoDB Atlas (via PyMongo, no ORM)
Auth — JWT tokens with custom MongoDB authentication
Payments — Razorpay
Images — Cloudinary
Frontend — Next.js 14 (App Router)
Deployed on — Render (backend) + Vercel (frontend)

FEATURES:

(For customers)
Browse products by category, gender filter, search
Add to cart and wishlist
Checkout with Razorpay payment
Apply promo/coupon codes at checkout
Track orders with live status updates
Cancel pending orders or request returns on delivered ones
Leave star ratings and reviews on products
Edit profile, saved address, change password

(For vendors)
Register and create a store (pending admin approval)
Add products with images, price, discount, category
Manage inventory (update stock)
View and update order status (processing → shipped → delivered)

(For admin)
Approve or suspend vendor accounts
View all products and vendors on the platform
Create and manage coupon codes (percentage or flat discount)
Set min order amount, max uses, and expiry on coupons


PROJECT STRUCTURE
ShopX/
├── backend/
│   ├── apps/
│   │   ├── users/        # auth — register, login, profile, change password
│   │   ├── vendors/      # vendor onboarding, admin approve/suspend
│   │   ├── products/     # products CRUD, inventory, reviews
│   │   └── orders/       # checkout, payments, cancel, return, coupons
│   └── utils/
│       ├── db.py          # MongoDB connection and collection helpers
│       ├── helpers.py     # ObjectId converters
│       └── permissions.py # role-based access decorator
│
└── frontend/
    ├── app/
    │   ├── store/         # storefront, product detail, cart, checkout, orders
    │   ├── vendor/        # vendor dashboard
    │   └── admin/         # admin dashboard
    ├── context/
    │   └── AuthContext.js # global auth state
    └── lib/
        └── api.js         # all API calls with axios
        
RUNNING LOCALLY:

(Backend)
cd backend
python -m venv venv
venv\Scripts\activate       # windows
pip install -r requirements.txt
cp .env.example .env        # fill in your values
python manage.py runserver

(Frontend)
cd frontend
npm install
# create .env.local and add:
# NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
npm run dev
Environment Variables
Backend .env

SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
MONGO_URI=your-mongodb-atlas-uri
MONGO_DB_NAME=ecommerce_db
RAZORPAY_KEY_ID=your-key
RAZORPAY_KEY_SECRET=your-secret
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
CORS_ALLOWED_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
Frontend .env.local

NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
Test accounts (on live site)
Role	    Email	          Password
Customer	test@gmail.com	test123
Vendor	vendor@gmail.com	vendor123
Admin	admin@gmail.com	    ....
Razorpay test payment

UPI: success@razorpay
Card: 4111 1111 1111 1111 · Expiry: 12/25 · CVV: 123

HOW PAYMENT WORKS
Customer hits checkout → backend creates a Razorpay order
Razorpay modal opens in the browser
Customer completes payment
Frontend sends payment ID + signature back to backend
Backend verifies the HMAC signature
Order marked as paid, stock reduced, customer gets confirmation

NOTES
Built without any SQL. Everything goes through MongoDB directly using PyMongo
No Django models, no migrations, no ORM — just raw MongoDB collections
JWT authentication is fully custom to work with MongoDB user documents
Frontend uses sessionStorage to cache products and avoid redundant API calls
Render free tier sleeps after inactivity — UptimeRobot keeps it awake
Deployment
Backend on Render — free tier, Python web service
Frontend on Vercel — free tier, Next.js
Database on MongoDB Atlas — free M0 cluster
Images on Cloudinary — free tier
Total hosting cost: ₹0
