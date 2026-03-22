from functools import wraps
from rest_framework.response import Response
from apps.users.authentication import MongoJWTAuthentication


def require_role(*roles):
    """
    Decorator that restricts a view to specific roles.

    Usage:
        @require_role("admin")
        def get(self, request): ...

        @require_role("vendor", "admin")
        def post(self, request): ...

    How it works:
        1. Runs MongoJWTAuthentication to read the Bearer token
        2. Extracts the user from MongoDB
        3. Checks if user.role is in the allowed roles
        4. If yes → runs the view normally
        5. If no  → returns 403 Forbidden immediately
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):

            # Step 1: authenticate the request manually
            auth = MongoJWTAuthentication()
            result = auth.authenticate(request)

            if result is None:
                return Response({
                    "success": False,
                    "message": "authentication required — send a Bearer token"
                }, status=401)

            user, token = result

            # Step 2: check role
            if user.role not in roles:
                return Response({
                    "success": False,
                    "message": f"access denied — required role: {' or '.join(roles)}"
                }, status=403)

            # Step 3: attach user to request so the view can use it
            request.user      = user
            request.auth      = token
            request.user_role = user.role

            return func(self, request, *args, **kwargs)
        return wrapper
    return decorator