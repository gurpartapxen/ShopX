import secrets

CSRF_COOKIE_NAME = "csrf_token"
# Django exposes the "X-CSRF-Token" request header as META["HTTP_X_CSRF_TOKEN"]
CSRF_HEADER_META = "HTTP_X_CSRF_TOKEN"


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def csrf_valid(request) -> bool:
    cookie = request.COOKIES.get(CSRF_COOKIE_NAME)
    header = request.META.get(CSRF_HEADER_META)
    if not cookie or not header:
        return False
    # Constant-time comparison to avoid timing leaks
    return secrets.compare_digest(cookie, header)
