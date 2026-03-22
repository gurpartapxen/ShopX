from django.urls import path
from .views import RegisterView, LoginView, RefreshTokenView, ProfileView, ChangePasswordView

urlpatterns = [
    path("register/",         RegisterView.as_view(),       name="auth-register"),
    path("login/",            LoginView.as_view(),          name="auth-login"),
    path("refresh/",          RefreshTokenView.as_view(),   name="auth-refresh"),
    path("profile/",          ProfileView.as_view(),        name="auth-profile"),
    path("change-password/",  ChangePasswordView.as_view(), name="auth-change-password"),
]