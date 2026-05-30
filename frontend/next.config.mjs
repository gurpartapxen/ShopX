/** @type {import('next').NextConfig} */

// ── Same-origin API proxy (Backend-for-Frontend) ──────────────────────────────
// The browser only ever talks to THIS origin. We reverse-proxy /bff/* to the real
// backend so the backend's auth cookies are FIRST-PARTY to the frontend domain.
//
// Why: in production the frontend (Vercel) and backend (Render) are different
// domains. A cookie set by the Render domain is a third-party cookie from the
// Vercel page's perspective — the browser won't expose it to JS and increasingly
// won't send it at all, so the session is lost on reload. Proxying through the
// frontend origin makes the cookie first-party, so the HttpOnly refresh cookie +
// readable CSRF cookie work on reload exactly like they do locally.
//
// The backend origin is derived from NEXT_PUBLIC_API_URL (e.g.
// "https://shopx-api.onrender.com/api" → "https://shopx-api.onrender.com"),
// so no extra environment variable is required.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const BACKEND_ORIGIN = API_URL.replace(/\/api\/?$/, "");   // strip a trailing /api

const nextConfig = {
  // Don't add/remove trailing slashes on our own routes.
  skipTrailingSlashRedirect: true,

  async rewrites() {
    return {
      // beforeFiles runs before filesystem routes, so /bff never collides with
      // app routes (e.g. the existing /api/logo handler stays untouched).
      //
      // The trailing slash in the destination is deliberate: Next's :path* capture
      // strips the incoming trailing slash, and Django requires it (APPEND_SLASH).
      // Every backend endpoint is slash-terminated, so re-adding it is always correct.
      beforeFiles: [
        { source: "/bff/:path*", destination: `${BACKEND_ORIGIN}/api/:path*/` },
      ],
    };
  },
};

export default nextConfig;
