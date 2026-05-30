from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

from utils.db import users_col
from utils.helpers import to_object_id


class MongoUser:
    def __init__(self, user_doc):
        self.pk               = str(user_doc["_id"])
        self.id               = self.pk
        self.name             = user_doc.get("name", "")
        self.email            = user_doc.get("email", "")
        self.role             = user_doc.get("role", "customer")
        self.is_active        = user_doc.get("is_active", True)
        self.is_authenticated = True

    def __str__(self):
        return self.email


class MongoJWTAuthentication(BaseAuthentication):

    def authenticate(self, request):
        # Access tokens are accepted ONLY from the Authorization header (Bearer).
        # We deliberately do NOT read the access token from a cookie: a custom
        # header cannot be forged by a cross-site request, so every data endpoint
        # stays CSRF-proof. Cookies are used solely for the refresh token, and the
        # /auth/refresh/ endpoint guards itself with a double-submit CSRF token.
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None
        raw_token = parts[1]

        try:
            validated_token = AccessToken(raw_token)
        except TokenError as e:
            raise AuthenticationFailed(str(e))

        user_id = validated_token.get("user_id")
        if not user_id:
            raise AuthenticationFailed("Token contains no user_id")

        user_doc = users_col().find_one({"_id": to_object_id(user_id)})
        if not user_doc:
            raise AuthenticationFailed("User not found")
        if not user_doc.get("is_active", True):
            raise AuthenticationFailed("User account is deactivated")

        return MongoUser(user_doc), validated_token
