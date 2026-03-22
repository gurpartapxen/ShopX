"""
Root URL configuration.

Right now this only has a health check endpoint so you can verify
the server is running. Each phase will add its own URL includes here.
"""

from django.urls import path, include
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """
    GET /api/health/
    Returns 200 if the server is running.
    We'll also ping MongoDB here so you can confirm DB connection.
    """
    from utils.db import ping_db
    db_status = ping_db()

    return Response({
        "status": "ok",
        "server": "django running",
        "database": "connected" if db_status else "disconnected",
    })


urlpatterns = [
    path("api/health/", health_check, name="health-check"),

    path("api/auth/", include("apps.users.urls")),
    path("api/vendors/", include("apps.vendors.urls")),
    path("api/products/", include("apps.products.urls")),
    path("api/orders/",   include("apps.orders.urls")),
]
