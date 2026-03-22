from django.urls import path
from .views import (
    CheckoutView,
    PaymentVerifyView,
    OrderListView,
    OrderDetailView,
    VendorOrderListView,
    VendorOrderUpdateView,
    CouponValidateView,
    AdminCouponView,
    AdminCouponDetailView,
    OrderCancelView,
    ReturnRequestView,
)

urlpatterns = [
    path("",                              OrderListView.as_view(),         name="order-list"),
    path("checkout/",                     CheckoutView.as_view(),          name="order-checkout"),
    path("payment/verify/",               PaymentVerifyView.as_view(),     name="payment-verify"),
    path("coupon/validate/",              CouponValidateView.as_view(),    name="coupon-validate"),
    path("vendor/",                       VendorOrderListView.as_view(),   name="vendor-order-list"),
    path("admin/coupons/",                AdminCouponView.as_view(),       name="admin-coupons"),
    path("admin/coupons/<str:code>/",     AdminCouponDetailView.as_view(), name="admin-coupon-detail"),
    path("<str:order_id>/",               OrderDetailView.as_view(),       name="order-detail"),
    path("<str:order_id>/status/",        VendorOrderUpdateView.as_view(), name="order-status"),
    path("<str:order_id>/cancel/",        OrderCancelView.as_view(),       name="order-cancel"),
    path("<str:order_id>/return/",        ReturnRequestView.as_view(),     name="order-return"),
]