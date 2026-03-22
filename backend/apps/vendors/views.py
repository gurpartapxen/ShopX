from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from datetime import datetime
import re

from utils.db import vendors_col, users_col
from utils.helpers import to_str_id, to_object_id
from utils.permissions import require_role
from apps.users.authentication import MongoJWTAuthentication


def slugify(name: str) -> str:
    name = name.lower()
    name = re.sub(r"[^a-z0-9\s-]", "", name)
    name = re.sub(r"\s+", "-", name.strip())
    return name


class VendorOnboardView(APIView):
    @require_role("vendor")
    def post(self, request):
        user_id     = request.user.pk
        store_name  = request.data.get("store_name",  "").strip()
        description = request.data.get("description", "").strip()
        phone       = request.data.get("phone",       "").strip()

        if not store_name:
            return Response({"success": False, "message": "store_name is required"}, status=400)

        if vendors_col().find_one({"user_id": user_id}):
            return Response({"success": False, "message": "you already have a vendor profile"}, status=400)

        slug = slugify(store_name)
        if vendors_col().find_one({"store_slug": slug}):
            slug = f"{slug}-{user_id[-4:]}"

        vendor_doc = {
            "user_id":     user_id,
            "store_name":  store_name,
            "store_slug":  slug,
            "description": description,
            "phone":       phone,
            "logo_url":    "",
            "is_approved": False,
            "is_active":   True,
            "created_at":  datetime.utcnow(),
            "updated_at":  datetime.utcnow(),
        }

        result    = vendors_col().insert_one(vendor_doc)
        vendor_id = str(result.inserted_id)
        vendor_doc["id"] = vendor_id
        vendor_doc.pop("_id", None)

        return Response({
            "success": True,
            "message": "vendor profile created — waiting for admin approval",
            "data": vendor_doc
        }, status=201)


class VendorProfileView(APIView):
    @require_role("vendor")
    def get(self, request):
        vendor = vendors_col().find_one({"user_id": request.user.pk})
        if not vendor:
            return Response({"success": False, "message": "vendor profile not found"}, status=404)
        return Response({"success": True, "data": to_str_id(vendor)})

    @require_role("vendor")
    def patch(self, request):
        user_id = request.user.pk
        vendor  = vendors_col().find_one({"user_id": user_id})
        if not vendor:
            return Response({"success": False, "message": "vendor profile not found"}, status=404)

        allowed = {"store_name", "description", "phone", "logo_url"}
        updates = {k: v for k, v in request.data.items() if k in allowed}

        if not updates:
            return Response({"success": False, "message": "no valid fields to update"}, status=400)

        updates["updated_at"] = datetime.utcnow()
        vendors_col().update_one({"user_id": user_id}, {"$set": updates})
        return Response({"success": True, "message": "store profile updated"})


class PublicVendorView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, vendor_id):
        vendor = vendors_col().find_one({
            "_id":         to_object_id(vendor_id),
            "is_active":   True,
            "is_approved": True,
        })
        if not vendor:
            return Response({"success": False, "message": "vendor not found"}, status=404)

        vendor.pop("user_id", None)
        return Response({"success": True, "data": to_str_id(vendor)})


class AdminVendorListView(APIView):
    @require_role("admin")
    def get(self, request):
        query = {}

        is_approved = request.query_params.get("is_approved")
        if is_approved is not None:
            query["is_approved"] = is_approved.lower() == "true"

        vendors = [to_str_id(v) for v in vendors_col().find(query)]

        return Response({
            "success": True,
            "data": {
                "count":   len(vendors),
                "vendors": vendors,
            }
        })


class AdminVendorApproveView(APIView):
    @require_role("admin")
    def patch(self, request, vendor_id):
        is_approved = request.data.get("is_approved")

        if is_approved is None:
            return Response({"success": False, "message": "is_approved is required"}, status=400)

        # handle both boolean and string
        if isinstance(is_approved, str):
            is_approved = is_approved.lower() == "true"
        else:
            is_approved = bool(is_approved)

        vendor = vendors_col().find_one({"_id": to_object_id(vendor_id)})
        if not vendor:
            return Response({"success": False, "message": "vendor not found"}, status=404)

        vendors_col().update_one(
            {"_id": to_object_id(vendor_id)},
            {"$set": {"is_approved": is_approved, "updated_at": datetime.utcnow()}}
        )

        action = "approved" if is_approved else "suspended"
        return Response({"success": True, "message": f"vendor {action} successfully"})