from django.urls import path
from .views import (
    VendorOnboardView,
    VendorProfileView,
    PublicVendorView,
    AdminVendorListView,
    AdminVendorApproveView,
)

urlpatterns = [
    path("onboard/",                          VendorOnboardView.as_view(),      name="vendor-onboard"),
    path("me/",                               VendorProfileView.as_view(),      name="vendor-profile"),
    path("admin/list/",                       AdminVendorListView.as_view(),    name="vendor-admin-list"),
    path("admin/<str:vendor_id>/approve/",    AdminVendorApproveView.as_view(), name="vendor-admin-approve"),
    path("<str:vendor_id>/",                  PublicVendorView.as_view(),       name="vendor-public"),
]
