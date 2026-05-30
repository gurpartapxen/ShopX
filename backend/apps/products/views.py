from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from datetime import datetime
import cloudinary
import cloudinary.uploader
import os
import re

from django.core.cache import cache

from utils.db import products_col, vendors_col, inventory_col, get_db
from utils.helpers import to_str_id, to_object_id, first_error
from utils.permissions import require_role
from utils.sanitize import clean
from utils.cache import (
    product_list_key, product_detail_key,
    bust_product, bust_product_detail, bust_product_lists,
    PRODUCT_LIST_TTL, PRODUCT_DETAIL_TTL,
)
from apps.products.serializers import (
    ProductCreateSerializer, ProductUpdateSerializer,
    InventorySerializer, ReviewSerializer,
)


def reviews_col():
    return get_db()["reviews"]


def get_vendor(user_id: str):
    return vendors_col().find_one({
        "user_id":     user_id,
        "is_approved": True,
        "is_active":   True,
    })


class ProductListCreateView(APIView):
    def get_permissions(self):
        return [AllowAny()]

    def get(self, request):
        # Serve from cache if available (keyed by the full query-param set)
        ck = product_list_key(dict(request.query_params))
        cached = cache.get(ck)
        if cached is not None:
            return Response(cached)

        query = {"is_active": True}

        vendor_id = request.query_params.get("vendor_id")
        if vendor_id:
            query["vendor_id"] = vendor_id

        category = request.query_params.get("category")
        if category:
            query["category"] = category

        search = request.query_params.get("q")
        if search:
            # re.escape prevents ReDoS from malicious regex patterns in user input
            safe_search = re.escape(search[:200])
            query["$or"] = [
                {"name":        {"$regex": safe_search, "$options": "i"}},
                {"description": {"$regex": safe_search, "$options": "i"}},
            ]

        min_price = request.query_params.get("min_price")
        max_price = request.query_params.get("max_price")
        if min_price or max_price:
            query["price"] = {}
            if min_price:
                query["price"]["$gte"] = float(min_price)
            if max_price:
                query["price"]["$lte"] = float(max_price)

        has_discount = request.query_params.get("has_discount")
        if has_discount:
            query["discount"] = {"$gt": 0}

        page  = max(int(request.query_params.get("page",  1)), 1)
        limit = min(int(request.query_params.get("limit", 20)), 100)
        skip  = (page - 1) * limit

        sort_by  = request.query_params.get("sort", "created_at")
        sort_dir = -1 if request.query_params.get("order", "desc") == "desc" else 1
        sort_map = {
            "created_at": "created_at",
            "price_asc":  "price",
            "price_desc": "price",
            "name":       "name",
        }
        sort_field = sort_map.get(sort_by, "created_at")
        if sort_by == "price_asc":
            sort_dir = 1
        elif sort_by == "price_desc":
            sort_dir = -1

        low_stock = request.query_params.get("low_stock")

        raw_products = list(
            products_col().find(query)
            .sort(sort_field, sort_dir)
            .skip(skip)
            .limit(limit)
        )

        products = []
        for p in raw_products:
            p_id  = str(p["_id"])
            inv   = inventory_col().find_one({"product_id": p_id})
            stock = inv["quantity"] if inv else 0

            if low_stock and not (0 < stock < 20):
                continue

            # attach avg rating
            pipeline = [
                {"$match": {"product_id": p_id}},
                {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}}
            ]
            agg = list(reviews_col().aggregate(pipeline))
            p["avg_rating"]    = round(agg[0]["avg"], 1) if agg else 0
            p["review_count"]  = agg[0]["count"] if agg else 0
            p["stock"] = stock
            products.append(to_str_id(p))

        total = products_col().count_documents(query)

        result = {
            "success": True,
            "data": {
                "products": products,
                "total":    total,
                "page":     page,
                "pages":    max((total + limit - 1) // limit, 1),
            }
        }
        cache.set(ck, result, PRODUCT_LIST_TTL)
        return Response(result)

    @require_role("vendor")
    def post(self, request):
        user_id = request.user.pk
        vendor  = get_vendor(user_id)

        if not vendor:
            return Response({
                "success": False,
                "message": "your vendor account must be approved before adding products"
            }, status=403)

        serializer = ProductCreateSerializer(data=clean(request.data))
        if not serializer.is_valid():
            return Response({"success": False, "message": first_error(serializer)}, status=400)
        data = serializer.validated_data

        vendor_id = str(vendor["_id"])

        product_doc = {
            "vendor_id":   vendor_id,
            "name":        data["name"].strip(),
            "description": data["description"].strip(),
            "price":       data["price"],
            "discount":    data["discount"],
            "category":    data["category"].strip(),
            "images":      data["images"],
            "tags":        data["tags"],
            "is_active":   True,
            "created_at":  datetime.utcnow(),
            "updated_at":  datetime.utcnow(),
        }

        result     = products_col().insert_one(product_doc)
        product_id = str(result.inserted_id)

        inventory_col().insert_one({
            "product_id": product_id,
            "vendor_id":  vendor_id,
            "quantity":   data["quantity"],
            "updated_at": datetime.utcnow(),
        })

        product_doc["id"] = product_id
        product_doc.pop("_id", None)

        bust_product_lists()   # new product → stale list caches
        return Response({
            "success": True,
            "message": "product created successfully",
            "data":    product_doc
        }, status=201)


class ProductDetailView(APIView):
    def get_permissions(self):
        return [AllowAny()]

    def get(self, request, product_id):
        ck = product_detail_key(product_id)
        cached = cache.get(ck)
        if cached is not None:
            return Response(cached)

        product = products_col().find_one({
            "_id":       to_object_id(product_id),
            "is_active": True,
        })
        if not product:
            return Response({"success": False, "message": "product not found"}, status=404)

        inv = inventory_col().find_one({"product_id": product_id})
        product["stock"] = inv["quantity"] if inv else 0

        # attach reviews summary
        pipeline = [
            {"$match": {"product_id": product_id}},
            {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}}
        ]
        agg = list(reviews_col().aggregate(pipeline))
        product["avg_rating"]   = round(agg[0]["avg"], 1) if agg else 0
        product["review_count"] = agg[0]["count"] if agg else 0

        # star breakdown
        breakdown = {}
        for star in range(1, 6):
            breakdown[str(star)] = reviews_col().count_documents({
                "product_id": product_id,
                "rating": star
            })
        product["rating_breakdown"] = breakdown

        result = {"success": True, "data": to_str_id(product)}
        cache.set(ck, result, PRODUCT_DETAIL_TTL)
        return Response(result)

    @require_role("vendor")
    def patch(self, request, product_id):
        product = products_col().find_one({"_id": to_object_id(product_id)})
        if not product:
            return Response({"success": False, "message": "product not found"}, status=404)

        vendor = get_vendor(request.user.pk)
        if not vendor or str(vendor["_id"]) != product["vendor_id"]:
            return Response({"success": False, "message": "you can only edit your own products"}, status=403)

        serializer = ProductUpdateSerializer(data=clean(request.data))
        if not serializer.is_valid():
            return Response({"success": False, "message": first_error(serializer)}, status=400)
        updates = dict(serializer.validated_data)

        updates["updated_at"] = datetime.utcnow()
        products_col().update_one({"_id": to_object_id(product_id)}, {"$set": updates})

        bust_product(product_id)   # detail + all list caches
        return Response({"success": True, "message": "product updated successfully"})

    @require_role("vendor")
    def delete(self, request, product_id):
        product = products_col().find_one({"_id": to_object_id(product_id)})
        if not product:
            return Response({"success": False, "message": "product not found"}, status=404)

        vendor = get_vendor(request.user.pk)
        if not vendor or str(vendor["_id"]) != product["vendor_id"]:
            return Response({"success": False, "message": "you can only delete your own products"}, status=403)

        products_col().update_one(
            {"_id": to_object_id(product_id)},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
        )
        bust_product(product_id)   # detail + all list caches
        return Response({"success": True, "message": "product removed successfully"})


class InventoryView(APIView):
    def get(self, request, product_id):
        inv = inventory_col().find_one({"product_id": product_id})
        if not inv:
            return Response({"success": False, "message": "inventory record not found"}, status=404)
        return Response({
            "success": True,
            "data": {
                "product_id": product_id,
                "quantity":   inv["quantity"],
                "updated_at": inv["updated_at"],
            }
        })

    @require_role("vendor")
    def patch(self, request, product_id):
        product = products_col().find_one({"_id": to_object_id(product_id)})
        if not product:
            return Response({"success": False, "message": "product not found"}, status=404)

        vendor = get_vendor(request.user.pk)
        if not vendor or str(vendor["_id"]) != product["vendor_id"]:
            return Response(
                {"success": False, "message": "you can only update inventory for your own products"},
                status=403,
            )

        serializer = InventorySerializer(data=clean(request.data))
        if not serializer.is_valid():
            return Response({"success": False, "message": first_error(serializer)}, status=400)
        quantity = serializer.validated_data["quantity"]

        inventory_col().update_one(
            {"product_id": product_id},
            {"$set": {"quantity": quantity, "updated_at": datetime.utcnow()}},
            upsert=True,
        )

        bust_product_detail(product_id)   # stock changed in detail view
        return Response({
            "success": True,
            "message": "inventory updated successfully",
            "data": {"product_id": product_id, "quantity": quantity}
        })


class ImageUploadView(APIView):
    @require_role("vendor")
    def post(self, request):
        image = request.FILES.get("image")
        if not image:
            return Response({"success": False, "message": "image file is required"}, status=400)

        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        )

        result = cloudinary.uploader.upload(
            image,
            folder="ecommerce/products",
            transformation=[{"width": 800, "height": 800, "crop": "limit"}],
        )

        return Response({
            "success": True,
            "message": "image uploaded successfully",
            "data":    {"url": result["secure_url"]}
        })


class ProductReviewsView(APIView):
    def get_permissions(self):
        return [AllowAny()]

    def get(self, request, product_id):
        """fetch all reviews for a product"""
        product = products_col().find_one({"_id": to_object_id(product_id)})
        if not product:
            return Response({"success": False, "message": "product not found"}, status=404)

        page  = max(int(request.query_params.get("page",  1)), 1)
        limit = min(int(request.query_params.get("limit", 10)), 50)
        skip  = (page - 1) * limit

        raw = list(
            reviews_col()
            .find({"product_id": product_id})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )

        reviews = [to_str_id(r) for r in raw]
        total   = reviews_col().count_documents({"product_id": product_id})

        return Response({
            "success": True,
            "data": {
                "reviews": reviews,
                "total":   total,
                "page":    page,
                "pages":   max((total + limit - 1) // limit, 1),
            }
        })

    @require_role("customer")
    def post(self, request, product_id):
        """submit a review — one per customer per product"""
        product = products_col().find_one({
            "_id":       to_object_id(product_id),
            "is_active": True,
        })
        if not product:
            return Response({"success": False, "message": "product not found"}, status=404)

        user_id = request.user.pk

        # one review per customer per product
        existing = reviews_col().find_one({
            "product_id": product_id,
            "user_id":    user_id,
        })
        if existing:
            return Response({
                "success": False,
                "message": "you have already reviewed this product"
            }, status=400)

        serializer = ReviewSerializer(data=clean(request.data))
        if not serializer.is_valid():
            return Response({"success": False, "message": first_error(serializer)}, status=400)
        rating  = serializer.validated_data["rating"]
        comment = serializer.validated_data["comment"].strip()

        review_doc = {
            "product_id": product_id,
            "user_id":    user_id,
            "user_name":  request.user.name if hasattr(request.user, "name") else "Customer",
            "rating":     rating,
            "comment":    comment,
            "created_at": datetime.utcnow(),
        }

        result = reviews_col().insert_one(review_doc)
        review_doc["id"] = str(result.inserted_id)
        review_doc.pop("_id", None)

        bust_product_detail(product_id)   # avg_rating / review_count changed
        return Response({
            "success": True,
            "message": "review submitted successfully",
            "data":    review_doc
        }, status=201)
