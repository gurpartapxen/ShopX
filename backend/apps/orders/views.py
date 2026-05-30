from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from datetime import datetime
import razorpay
import os
import hmac
import hashlib


class CheckoutRateThrottle(UserRateThrottle):
    scope = "checkout"

class PaymentRateThrottle(UserRateThrottle):
    scope = "payment"

from utils.db import orders_col, products_col, inventory_col, vendors_col, get_db
from utils.helpers import to_str_id, to_object_id
from utils.permissions import require_role
from utils.sanitize import clean


def get_razorpay_client():
    return razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")))


def coupons_col():
    return get_db()["coupons"]


class CouponValidateView(APIView):
    @require_role("customer", "vendor", "admin")
    def post(self, request):
        data  = clean(request.data)
        code  = data.get("code", "").strip().upper()
        total = float(data.get("total", 0))

        if not code:
            return Response({"success": False, "message": "coupon code is required"}, status=400)

        coupon = coupons_col().find_one({"code": code, "is_active": True})
        if not coupon:
            return Response({"success": False, "message": "invalid or expired coupon code"}, status=404)

        if coupon.get("expires_at") and coupon["expires_at"] < datetime.utcnow():
            return Response({"success": False, "message": "this coupon has expired"}, status=400)

        if coupon.get("max_uses") and coupon.get("used_count", 0) >= coupon["max_uses"]:
            return Response({"success": False, "message": "this coupon has reached its usage limit"}, status=400)

        user_id = request.user.pk
        if user_id in coupon.get("used_by", []):
            return Response({"success": False, "message": "you have already used this coupon"}, status=400)

        min_amount = coupon.get("min_order_amount", 0)
        if total < min_amount:
            return Response({"success": False, "message": f"minimum order amount for this coupon is ₹{min_amount}"}, status=400)

        discount_type  = coupon.get("discount_type", "percentage")
        discount_value = coupon.get("discount_value", 0)
        max_discount   = coupon.get("max_discount_amount")

        if discount_type == "percentage":
            discount_amount = round(total * discount_value / 100, 2)
            if max_discount:
                discount_amount = min(discount_amount, max_discount)
        else:
            discount_amount = min(discount_value, total)

        final_total = round(total - discount_amount, 2)

        return Response({
            "success": True,
            "message": f"Coupon applied! You save ₹{discount_amount}",
            "data": {
                "code":            code,
                "discount_type":   discount_type,
                "discount_value":  discount_value,
                "discount_amount": discount_amount,
                "original_total":  total,
                "final_total":     final_total,
                "description":     coupon.get("description", ""),
            }
        })


class CheckoutView(APIView):
    throttle_classes = [CheckoutRateThrottle]

    @require_role("customer", "vendor", "admin")
    def post(self, request):
        user_id     = request.user.pk
        data        = clean(request.data)
        items       = data.get("items", [])
        shipping    = data.get("shipping_address", {})
        coupon_code = data.get("coupon_code", "").strip().upper()

        if not items:
            return Response({"success": False, "message": "cart is empty"}, status=400)

        enriched  = []
        vendor_id = None

        for item in items:
            pid      = item.get("product_id", "")
            quantity = int(item.get("quantity", 1))

            if quantity < 1:
                return Response({"success": False, "message": "quantity must be at least 1"}, status=400)

            product = products_col().find_one({"_id": to_object_id(pid), "is_active": True})
            if not product:
                return Response({"success": False, "message": f"product {pid} not found or unavailable"}, status=404)

            inv = inventory_col().find_one({"product_id": pid})
            if not inv or inv["quantity"] < quantity:
                return Response({
                    "success": False,
                    "message": f"not enough stock for '{product['name']}' — only {inv['quantity'] if inv else 0} left"
                }, status=400)

            if vendor_id and product["vendor_id"] != vendor_id:
                return Response({"success": False, "message": "cart can only contain products from one vendor"}, status=400)
            vendor_id = product["vendor_id"]

            price = product["price"]
            if product.get("discount", 0) > 0:
                price = round(price * (1 - product["discount"] / 100), 2)

            enriched.append({
                "product_id": pid,
                "name":       product["name"],
                "price":      price,
                "quantity":   quantity,
                "image":      product["images"][0] if product.get("images") else "",
            })

        subtotal        = round(sum(i["price"] * i["quantity"] for i in enriched), 2)
        discount_amount = 0
        coupon_data     = None

        if coupon_code:
            coupon = coupons_col().find_one({"code": coupon_code, "is_active": True})
            if coupon and not (coupon.get("expires_at") and coupon["expires_at"] < datetime.utcnow()):
                if user_id not in coupon.get("used_by", []):
                    discount_type  = coupon.get("discount_type", "percentage")
                    discount_value = coupon.get("discount_value", 0)
                    max_discount   = coupon.get("max_discount_amount")

                    if discount_type == "percentage":
                        discount_amount = round(subtotal * discount_value / 100, 2)
                        if max_discount:
                            discount_amount = min(discount_amount, max_discount)
                    else:
                        discount_amount = min(discount_value, subtotal)

                    coupon_data = {"code": coupon_code, "discount_amount": discount_amount}

                    coupons_col().update_one(
                        {"code": coupon_code},
                        {"$inc": {"used_count": 1}, "$push": {"used_by": user_id}}
                    )

        total_inr = round(subtotal - discount_amount, 2)

        rz_client = get_razorpay_client()
        rz_order  = rz_client.order.create({
            "amount":          int(total_inr * 100),
            "currency":        "INR",
            "payment_capture": 1,
        })

        order_doc = {
            "user_id":           user_id,
            "vendor_id":         vendor_id,
            "items":             enriched,
            "subtotal":          subtotal,
            "discount_amount":   discount_amount,
            "coupon":            coupon_data,
            "total":             total_inr,
            "status":            "pending",
            "payment_status":    "unpaid",
            "razorpay_order_id": rz_order["id"],
            "shipping_address":  shipping,
            "created_at":        datetime.utcnow(),
            "updated_at":        datetime.utcnow(),
        }

        result   = orders_col().insert_one(order_doc)
        order_id = str(result.inserted_id)

        return Response({
            "success": True,
            "message": "order created — proceed to payment",
            "data": {
                "order_id":          order_id,
                "razorpay_order_id": rz_order["id"],
                "razorpay_key":      os.getenv("RAZORPAY_KEY_ID"),
                "amount":            rz_order["amount"],
                "currency":          "INR",
                "items":             enriched,
                "subtotal":          subtotal,
                "discount_amount":   discount_amount,
                "coupon":            coupon_data,
                "total":             total_inr,
            }
        }, status=201)


class PaymentVerifyView(APIView):
    throttle_classes = [PaymentRateThrottle]

    @require_role("customer", "vendor", "admin")
    def post(self, request):
        data          = clean(request.data)
        order_id      = data.get("order_id")
        rz_order_id   = data.get("razorpay_order_id")
        rz_payment_id = data.get("razorpay_payment_id")
        rz_signature  = data.get("razorpay_signature")

        if not all([order_id, rz_order_id, rz_payment_id, rz_signature]):
            return Response({"success": False, "message": "all payment fields are required"}, status=400)

        key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
        payload    = f"{rz_order_id}|{rz_payment_id}".encode()
        expected   = hmac.new(key_secret.encode(), payload, hashlib.sha256).hexdigest()

        if not hmac.compare_digest(expected, rz_signature):
            return Response({"success": False, "message": "payment verification failed — invalid signature"}, status=400)

        order = orders_col().find_one({"_id": to_object_id(order_id)})
        if not order:
            return Response({"success": False, "message": "order not found"}, status=404)

        if order["payment_status"] == "paid":
            return Response({"success": False, "message": "order already paid"}, status=400)

        # Atomically decrement each item's inventory only if sufficient stock remains.
        # findOneAndUpdate with $gte ensures we never go negative (oversell guard).
        now = datetime.utcnow()
        for item in order["items"]:
            result = inventory_col().find_one_and_update(
                {
                    "product_id": item["product_id"],
                    "quantity":   {"$gte": item["quantity"]},
                },
                {
                    "$inc": {"quantity": -item["quantity"]},
                    "$set": {"updated_at": now},
                },
            )
            if result is None:
                # Stock was exhausted between checkout and payment (race condition).
                # Payment is already captured — flag the order for manual review
                # rather than silently ignoring, so support can issue a refund.
                orders_col().update_one(
                    {"_id": to_object_id(order_id)},
                    {"$set": {"stock_issue": True, "updated_at": now}},
                )

        orders_col().update_one(
            {"_id": to_object_id(order_id)},
            {"$set": {
                "payment_status":      "paid",
                "status":              "processing",
                "razorpay_payment_id": rz_payment_id,
                "paid_at":             now,
                "updated_at":          now,
            }}
        )

        return Response({
            "success": True,
            "message": "payment verified — order confirmed!",
            "data":    {"order_id": order_id, "status": "processing"}
        })


class OrderListView(APIView):
    @require_role("customer", "vendor", "admin")
    def get(self, request):
        user_id = request.user.pk
        page    = max(int(request.query_params.get("page",  1)), 1)
        limit   = min(int(request.query_params.get("limit", 10)), 50)
        skip    = (page - 1) * limit

        orders = [
            to_str_id(o)
            for o in orders_col()
            .find({"user_id": user_id})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        ]
        total = orders_col().count_documents({"user_id": user_id})

        return Response({"success": True, "data": {"orders": orders, "total": total, "page": page}})


class OrderDetailView(APIView):
    @require_role("customer", "vendor", "admin")
    def get(self, request, order_id):
        order = orders_col().find_one({"_id": to_object_id(order_id)})
        if not order:
            return Response({"success": False, "message": "order not found"}, status=404)

        user_id   = request.user.pk
        is_buyer  = order["user_id"] == user_id
        is_admin  = request.user.role == "admin"
        vendor    = vendors_col().find_one({"user_id": user_id})
        is_vendor = vendor and str(vendor["_id"]) == order.get("vendor_id")

        if not (is_buyer or is_vendor or is_admin):
            return Response({"success": False, "message": "you don't have access to this order"}, status=403)

        return Response({"success": True, "data": to_str_id(order)})


class VendorOrderListView(APIView):
    @require_role("vendor")
    def get(self, request):
        vendor = vendors_col().find_one({"user_id": request.user.pk})
        if not vendor:
            return Response({"success": False, "message": "vendor profile not found"}, status=404)

        vendor_id     = str(vendor["_id"])
        query         = {"vendor_id": vendor_id}
        status_filter = request.query_params.get("status")
        if status_filter:
            query["status"] = status_filter

        page  = max(int(request.query_params.get("page",  1)), 1)
        limit = min(int(request.query_params.get("limit", 20)), 100)
        skip  = (page - 1) * limit

        orders = [
            to_str_id(o)
            for o in orders_col()
            .find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        ]
        total = orders_col().count_documents(query)

        return Response({"success": True, "data": {"orders": orders, "total": total, "page": page}})


class VendorOrderUpdateView(APIView):
    @require_role("vendor")
    def patch(self, request, order_id):
        vendor = vendors_col().find_one({"user_id": request.user.pk})
        if not vendor:
            return Response({"success": False, "message": "vendor profile not found"}, status=404)

        order = orders_col().find_one({"_id": to_object_id(order_id)})
        if not order:
            return Response({"success": False, "message": "order not found"}, status=404)

        if order["vendor_id"] != str(vendor["_id"]):
            return Response({"success": False, "message": "this order does not belong to your store"}, status=403)

        new_status     = clean(request.data).get("status")
        valid_statuses = ["processing", "shipped", "delivered", "cancelled"]

        if new_status not in valid_statuses:
            return Response({"success": False, "message": f"status must be one of: {', '.join(valid_statuses)}"}, status=400)

        orders_col().update_one(
            {"_id": to_object_id(order_id)},
            {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
        )

        return Response({"success": True, "message": f"order status updated to '{new_status}'", "data": {"order_id": order_id, "status": new_status}})


class AdminCouponView(APIView):
    @require_role("admin")
    def get(self, request):
        raw     = list(coupons_col().find().sort("created_at", -1))
        coupons = [to_str_id(c) for c in raw]
        return Response({"success": True, "data": {"coupons": coupons}})

    @require_role("admin")
    def post(self, request):
        data = clean(request.data)
        code = data.get("code", "").strip().upper()
        if not code:
            return Response({"success": False, "message": "code is required"}, status=400)

        if coupons_col().find_one({"code": code}):
            return Response({"success": False, "message": "coupon code already exists"}, status=400)

        discount_type  = data.get("discount_type", "percentage")
        discount_value = float(data.get("discount_value", 0))
        expires_at_str = data.get("expires_at")

        coupon_doc = {
            "code":               code,
            "description":        data.get("description", ""),
            "discount_type":      discount_type,
            "discount_value":     discount_value,
            "max_discount_amount":data.get("max_discount_amount"),
            "min_order_amount":   float(data.get("min_order_amount", 0)),
            "max_uses":           data.get("max_uses"),
            "used_count":         0,
            "used_by":            [],
            "is_active":          True,
            "expires_at":         datetime.fromisoformat(expires_at_str) if expires_at_str else None,
            "created_at":         datetime.utcnow(),
        }

        result = coupons_col().insert_one(coupon_doc)
        coupon_doc["id"] = str(result.inserted_id)
        coupon_doc.pop("_id", None)

        return Response({"success": True, "message": "coupon created", "data": coupon_doc}, status=201)


class AdminCouponDetailView(APIView):
    @require_role("admin")
    def patch(self, request, code):
        code   = code.upper()
        coupon = coupons_col().find_one({"code": code})
        if not coupon:
            return Response({"success": False, "message": "coupon not found"}, status=404)

        allowed = {"description", "discount_type", "discount_value", "max_discount_amount",
                   "min_order_amount", "max_uses", "is_active"}
        updates = {k: v for k, v in clean(request.data).items() if k in allowed}
        if updates:
            coupons_col().update_one({"code": code}, {"$set": updates})

        return Response({"success": True, "message": "coupon updated"})

    @require_role("admin")
    def delete(self, request, code):
        coupons_col().update_one({"code": code.upper()}, {"$set": {"is_active": False}})
        return Response({"success": True, "message": "coupon deactivated"})


class OrderCancelView(APIView):
    @require_role("customer", "vendor", "admin")
    def post(self, request, order_id):
        order = orders_col().find_one({"_id": to_object_id(order_id)})
        if not order:
            return Response({"success": False, "message": "order not found"}, status=404)

        if order["user_id"] != request.user.pk:
            return Response({"success": False, "message": "you can only cancel your own orders"}, status=403)

        if order["status"] not in ["pending", "processing"]:
            return Response({
                "success": False,
                "message": f"order cannot be cancelled — it is already {order['status']}"
            }, status=400)

        if order["payment_status"] == "paid":
            for item in order["items"]:
                inventory_col().update_one(
                    {"product_id": item["product_id"]},
                    {"$inc": {"quantity": item["quantity"]}, "$set": {"updated_at": datetime.utcnow()}}
                )

        cancel_reason = clean(request.data).get("reason", "Cancelled by customer")
        orders_col().update_one(
            {"_id": to_object_id(order_id)},
            {"$set": {
                "status":        "cancelled",
                "cancelled_at":  datetime.utcnow(),
                "cancel_reason": cancel_reason,
                "updated_at":    datetime.utcnow(),
            }}
        )

        return Response({
            "success": True,
            "message": "order cancelled successfully",
            "data":    {"order_id": order_id, "status": "cancelled"}
        })


class ReturnRequestView(APIView):
    @require_role("customer", "vendor", "admin")
    def get(self, request, order_id):
        order = orders_col().find_one({"_id": to_object_id(order_id)})
        if not order:
            return Response({"success": False, "message": "order not found"}, status=404)

        if order["user_id"] != request.user.pk and request.user.role not in ["admin", "vendor"]:
            return Response({"success": False, "message": "access denied"}, status=403)

        return Response({
            "success": True,
            "data": {
                "return_requested":    order.get("return_requested", False),
                "return_reason":       order.get("return_reason", ""),
                "return_status":       order.get("return_status", ""),
                "return_requested_at": order.get("return_requested_at"),
            }
        })

    @require_role("customer", "vendor", "admin")
    def post(self, request, order_id):
        order = orders_col().find_one({"_id": to_object_id(order_id)})
        if not order:
            return Response({"success": False, "message": "order not found"}, status=404)

        if order["user_id"] != request.user.pk:
            return Response({"success": False, "message": "you can only request returns for your own orders"}, status=403)

        if order["status"] != "delivered":
            return Response({"success": False, "message": "return can only be requested for delivered orders"}, status=400)

        if order.get("return_requested"):
            return Response({"success": False, "message": "return already requested for this order"}, status=400)

        reason = clean(request.data).get("reason", "").strip()
        if not reason:
            return Response({"success": False, "message": "return reason is required"}, status=400)

        orders_col().update_one(
            {"_id": to_object_id(order_id)},
            {"$set": {
                "return_requested":    True,
                "return_reason":       reason,
                "return_status":       "pending",
                "return_requested_at": datetime.utcnow(),
                "updated_at":          datetime.utcnow(),
            }}
        )

        return Response({
            "success": True,
            "message": "return request submitted — our team will review it within 24 hours",
            "data":    {"order_id": order_id, "return_status": "pending"}
        })