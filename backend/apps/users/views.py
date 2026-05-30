from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.throttling import AnonRateThrottle
from django.contrib.auth.hashers import make_password, check_password
from django.conf import settings
from datetime import datetime

from utils.db import users_col
from utils.helpers import to_str_id, to_object_id
from utils.sanitize import clean
from apps.users.authentication import MongoJWTAuthentication


# ── Custom throttle scopes ────────────────────────────────────────────────────

class LoginRateThrottle(AnonRateThrottle):
    scope = "login"

class RegisterRateThrottle(AnonRateThrottle):
    scope = "register"

class RefreshRateThrottle(AnonRateThrottle):
    scope = "refresh_token"


# ── Token helpers ─────────────────────────────────────────────────────────────

def generate_tokens(user_id: str) -> dict:
    class FakeUser:
        def __init__(self, pk):
            self.pk        = pk
            self.id        = pk
            self.is_active = True

    token = RefreshToken.for_user(FakeUser(user_id))
    return {
        "access":  str(token.access_token),
        "refresh": str(token),
    }


def _set_auth_cookies(response, tokens: dict) -> None:
    """Attach access + refresh tokens as HttpOnly cookies to a DRF Response.

    SameSite strategy:
      - Production  : SameSite=None; Secure — required for cross-domain (Vercel → Render).
      - Development : SameSite=Lax;  no Secure — Chrome rejects SameSite=None without
        Secure on HTTP. Lax works fine on localhost because localhost:3000 and
        localhost:8000 share the same site (port is not part of the site definition),
        so the cookie IS sent on cross-port requests including POST.
    """
    is_prod  = not settings.DEBUG
    samesite = "None" if is_prod else "Lax"
    common   = dict(httponly=True, secure=is_prod, samesite=samesite, path="/")
    response.set_cookie("access_token",  tokens["access"],  max_age=60 * 15,           **common)
    response.set_cookie("refresh_token", tokens["refresh"], max_age=60 * 60 * 24 * 7,  **common)


def _clear_auth_cookies(response) -> None:
    response.delete_cookie("access_token",  path="/")
    response.delete_cookie("refresh_token", path="/")


class RegisterView(APIView):
    permission_classes  = [AllowAny]
    throttle_classes    = [RegisterRateThrottle]

    def post(self, request):
        data     = clean(request.data)
        name     = data.get("name",     "").strip()
        email    = data.get("email",    "").strip().lower()
        password = data.get("password", "")
        role     = data.get("role",     "customer")

        if not name:
            return Response({"success": False, "message": "name is required"}, status=400)
        if not email:
            return Response({"success": False, "message": "email is required"}, status=400)
        if not password or len(password) < 8:
            return Response({"success": False, "message": "password must be at least 8 characters"}, status=400)
        if role not in ("customer", "vendor", "admin"):
            return Response({"success": False, "message": "role must be customer, vendor, or admin"}, status=400)

        if users_col().find_one({"email": email}):
            return Response({"success": False, "message": "an account with this email already exists"}, status=400)

        user_doc = {
            "name":       name,
            "email":      email,
            "password":   make_password(password),
            "role":       role,
            "is_active":  True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        result  = users_col().insert_one(user_doc)
        user_id = str(result.inserted_id)
        tokens  = generate_tokens(user_id)

        # auto-create vendor profile if role is vendor
        if role == "vendor":
            store_name        = data.get("store_name", "").strip()
            store_description = data.get("store_description", "").strip()
            if store_name:
                from utils.db import vendors_col
                vendors_col().insert_one({
                    "user_id":           user_id,
                    "store_name":        store_name,
                    "store_description": store_description,
                    "slug":              store_name.lower().replace(" ", "-"),
                    "is_approved":       False,
                    "is_active":         True,
                    "created_at":        datetime.utcnow(),
                    "updated_at":        datetime.utcnow(),
                })

        response = Response({
            "success": True,
            "message": "account created successfully",
            "data": {
                "user":   {"id": user_id, "name": name, "email": email, "role": role},
                "tokens": tokens,
            }
        }, status=201)
        _set_auth_cookies(response, tokens)
        return response


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes   = [LoginRateThrottle]

    def post(self, request):
        data     = clean(request.data)
        email    = data.get("email",    "").strip().lower()
        password = data.get("password", "")

        if not email or not password:
            return Response({"success": False, "message": "email and password are required"}, status=400)

        user = users_col().find_one({"email": email})

        if not user or not check_password(password, user["password"]):
            return Response({"success": False, "message": "invalid email or password"}, status=401)

        if not user.get("is_active", True):
            return Response({"success": False, "message": "your account has been deactivated"}, status=403)

        user_id = str(user["_id"])
        tokens  = generate_tokens(user_id)

        response = Response({
            "success": True,
            "message": "login successful",
            "data": {
                "user": {
                    "id":    user_id,
                    "name":  user["name"],
                    "email": user["email"],
                    "role":  user["role"],
                },
                "tokens": tokens,
            }
        })
        _set_auth_cookies(response, tokens)
        return response


class RefreshTokenView(APIView):
    permission_classes = [AllowAny]
    throttle_classes   = [RefreshRateThrottle]

    def post(self, request):
        # Accept refresh token from HttpOnly cookie first, body as fallback
        refresh_token = request.COOKIES.get("refresh_token") or request.data.get("refresh")
        if not refresh_token:
            return Response({"success": False, "message": "refresh token is required"}, status=400)
        try:
            token      = RefreshToken(refresh_token)
            new_access = str(token.access_token)
            response   = Response({"success": True, "data": {"access": new_access}})
            # Rotate the access cookie using the same SameSite strategy as login
            is_prod  = not settings.DEBUG
            samesite = "None" if is_prod else "Lax"
            response.set_cookie(
                "access_token", new_access, max_age=60 * 15,
                httponly=True, secure=is_prod, samesite=samesite, path="/",
            )
            return response
        except TokenError:
            return Response({"success": False, "message": "invalid or expired refresh token"}, status=401)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"success": True, "message": "logged out successfully"})
        _clear_auth_cookies(response)
        return response


class ProfileView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def get(self, request):
        user_id = request.user.pk
        user    = users_col().find_one({"_id": to_object_id(user_id)})
        if not user:
            return Response({"success": False, "message": "user not found"}, status=404)
        user.pop("password", None)
        return Response({"success": True, "data": to_str_id(user)})

    def patch(self, request):
        user_id        = request.user.pk
        data           = clean(request.data)
        allowed_fields = {"name", "phone", "address", "city", "pincode", "state"}
        updates        = {k: v for k, v in data.items() if k in allowed_fields}

        # handle email update separately (check uniqueness)
        new_email = data.get("email", "").strip().lower()
        if new_email:
            existing = users_col().find_one({"email": new_email})
            if existing and str(existing["_id"]) != user_id:
                return Response({"success": False, "message": "email already in use"}, status=400)
            updates["email"] = new_email

        if not updates:
            return Response({"success": False, "message": "no valid fields to update"}, status=400)

        updates["updated_at"] = datetime.utcnow()
        users_col().update_one({"_id": to_object_id(user_id)}, {"$set": updates})

        # return updated user
        updated_user = users_col().find_one({"_id": to_object_id(user_id)})
        updated_user.pop("password", None)

        return Response({
            "success": True,
            "message": "profile updated successfully",
            "data":    to_str_id(updated_user)
        })


class ChangePasswordView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def post(self, request):
        user_id      = request.user.pk
        data         = clean(request.data)
        old_password = data.get("old_password", "")
        new_password = data.get("new_password", "")

        if not old_password or not new_password:
            return Response({"success": False, "message": "old and new password are required"}, status=400)

        if len(new_password) < 8:
            return Response({"success": False, "message": "new password must be at least 8 characters"}, status=400)

        user = users_col().find_one({"_id": to_object_id(user_id)})
        if not user:
            return Response({"success": False, "message": "user not found"}, status=404)

        if not check_password(old_password, user["password"]):
            return Response({"success": False, "message": "current password is incorrect"}, status=400)

        users_col().update_one(
            {"_id": to_object_id(user_id)},
            {"$set": {"password": make_password(new_password), "updated_at": datetime.utcnow()}}
        )

        return Response({"success": True, "message": "password changed successfully"})