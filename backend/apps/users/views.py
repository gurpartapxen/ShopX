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
from utils.helpers import to_str_id, to_object_id, first_error
from utils.sanitize import clean
from utils.csrf import generate_csrf_token, csrf_valid, CSRF_COOKIE_NAME
from apps.users.authentication import MongoJWTAuthentication
from apps.users.serializers import (
    RegisterSerializer, LoginSerializer,
    ChangePasswordSerializer, ProfileUpdateSerializer,
)

REFRESH_MAX_AGE = 60 * 60 * 24 * 7   # 7 days, matches REFRESH_TOKEN_LIFETIME


def _cookie_flags():
    """SameSite/Secure flags shared by all session cookies.

    Production : SameSite=None; Secure  — cross-site (Vercel ↔ Render) needs None.
    Development: SameSite=Lax;  insecure — Chrome rejects None without Secure on
                 HTTP, and Lax is sent on same-site localhost cross-port requests.
    """
    is_prod = not settings.DEBUG
    return {"secure": is_prod, "samesite": "None" if is_prod else "Lax", "path": "/"}


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


def _set_session_cookies(response, refresh_token: str) -> None:
    """Set the session cookies on a login/register response.

    Only two cookies — the access token is NEVER stored in a cookie; it lives in
    the SPA's memory and is sent via the Authorization header.

      refresh_token : HttpOnly  — JS can't read it, so XSS can't steal the long-lived token.
      csrf_token    : readable  — the SPA reads it and echoes it in the X-CSRF-Token
                                  header so /auth/refresh/ can verify the request origin.
    """
    flags = _cookie_flags()
    response.set_cookie("refresh_token", refresh_token, max_age=REFRESH_MAX_AGE,
                        httponly=True, **flags)
    response.set_cookie(CSRF_COOKIE_NAME, generate_csrf_token(), max_age=REFRESH_MAX_AGE,
                        httponly=False, **flags)


def _clear_session_cookies(response) -> None:
    response.delete_cookie("refresh_token", path="/")
    response.delete_cookie(CSRF_COOKIE_NAME, path="/")


class RegisterView(APIView):
    permission_classes  = [AllowAny]
    throttle_classes    = [RegisterRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=clean(request.data))
        if not serializer.is_valid():
            return Response({"success": False, "message": first_error(serializer)}, status=400)
        data = serializer.validated_data

        name     = data["name"]
        email    = data["email"]
        password = data["password"]
        role     = data["role"]

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
                "access": tokens["access"],   # in-memory only; refresh stays in the cookie
            }
        }, status=201)
        _set_session_cookies(response, tokens["refresh"])
        return response


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes   = [LoginRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=clean(request.data))
        if not serializer.is_valid():
            return Response({"success": False, "message": first_error(serializer)}, status=400)
        email    = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

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
                "access": tokens["access"],   # in-memory only; refresh stays in the cookie
            }
        })
        _set_session_cookies(response, tokens["refresh"])
        return response


class RefreshTokenView(APIView):
    permission_classes = [AllowAny]
    throttle_classes   = [RefreshRateThrottle]

    def post(self, request):
        # CSRF gate: this endpoint is authenticated purely by the refresh cookie,
        # so it needs the double-submit token to prove the request came from our SPA.
        if not csrf_valid(request):
            return Response({"success": False, "message": "CSRF validation failed"}, status=403)

        # Refresh token is read ONLY from the HttpOnly cookie — never the body.
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response({"success": False, "message": "no active session"}, status=401)

        try:
            token = RefreshToken(refresh_token)
        except TokenError:
            return Response({"success": False, "message": "session expired — please log in again"}, status=401)

        # Return the authoritative user so the SPA never has to trust client storage.
        user_id = token.get("user_id")
        user = users_col().find_one({"_id": to_object_id(user_id)})
        if not user or not user.get("is_active", True):
            return Response({"success": False, "message": "account not found or deactivated"}, status=401)

        return Response({
            "success": True,
            "data": {
                "access": str(token.access_token),
                "user": {
                    "id":    str(user["_id"]),
                    "name":  user.get("name", ""),
                    "email": user.get("email", ""),
                    "role":  user.get("role", "customer"),
                },
            }
        })


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # Always clear the cookies — logout must never be blockable, otherwise a
        # stale refresh cookie would silently log the user back in on next reload.
        response = Response({"success": True, "message": "logged out successfully"})
        _clear_session_cookies(response)
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
        user_id    = request.user.pk
        serializer = ProfileUpdateSerializer(data=clean(request.data))
        if not serializer.is_valid():
            return Response({"success": False, "message": first_error(serializer)}, status=400)
        data = serializer.validated_data

        allowed_fields = {"name", "phone", "address", "city", "pincode", "state"}
        updates        = {k: v for k, v in data.items() if k in allowed_fields}

        # handle email update separately (check uniqueness)
        new_email = data.get("email")
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
        serializer   = ChangePasswordSerializer(data=clean(request.data))
        if not serializer.is_valid():
            return Response({"success": False, "message": first_error(serializer)}, status=400)
        old_password = serializer.validated_data["old_password"]
        new_password = serializer.validated_data["new_password"]

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
