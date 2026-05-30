from django.conf import settings


class SecurityHeadersMiddleware:
    """
    Adds security headers that Django's built-in SecurityMiddleware doesn't cover:
    Content-Security-Policy, Referrer-Policy, and Permissions-Policy.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Referrer-Policy — don't leak the full URL to third parties
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions-Policy — disable browser features we don't use
        response["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        # Content-Security-Policy
        # Razorpay checkout needs its own domain in script-src / frame-src.
        # Cloudinary images come from res.cloudinary.com.
        # In development we allow 'unsafe-inline' for Next.js hot-reload;
        # tighten these in production via nonce-based CSP if needed.
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://res.cloudinary.com",
            "font-src 'self' data:",
            "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com",
            "frame-src https://api.razorpay.com https://checkout.razorpay.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "upgrade-insecure-requests" if not settings.DEBUG else "",
        ]
        response["Content-Security-Policy"] = "; ".join(d for d in csp_directives if d)

        return response
