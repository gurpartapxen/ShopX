from django.urls import path
from .views import (
    ProductListCreateView,
    ProductDetailView,
    InventoryView,
    ImageUploadView,
    ProductReviewsView,
)

urlpatterns = [
    path("",                                  ProductListCreateView.as_view(), name="product-list-create"),
    path("upload-image/",                     ImageUploadView.as_view(),       name="product-upload-image"),
    path("<str:product_id>/",                 ProductDetailView.as_view(),     name="product-detail"),
    path("<str:product_id>/inventory/",       InventoryView.as_view(),         name="product-inventory"),
    path("<str:product_id>/reviews/",         ProductReviewsView.as_view(),    name="product-reviews"),
]
