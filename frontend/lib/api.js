import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL;

// ── In-memory access-token store ──────────────────────────────────────────────
// The access token lives ONLY in JS memory — never localStorage/sessionStorage.
// It vanishes on reload (we re-mint it from the HttpOnly refresh cookie), so XSS
// can't persist it, and the refresh token is never reachable from JS at all.
let _accessToken = null;
export const setAccessToken   = (token) => { _accessToken = token; };
export const clearAccessToken = ()       => { _accessToken = null; };
export const getAccessToken   = ()       =>   _accessToken;

// ── CSRF token (double-submit) ────────────────────────────────────────────────
// Read the non-HttpOnly csrf_token cookie and echo it in the X-CSRF-Token header.
// The server requires header == cookie on the cookie-authenticated /refresh/ call.
export function getCsrfToken() {
    if (typeof document === "undefined") return null;
    const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
}

export function hasSession() {
    // The readable csrf_token cookie is our "a session probably exists" probe —
    // it's set alongside the HttpOnly refresh cookie at login. No token is exposed.
    return getCsrfToken() !== null;
}

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
    baseURL:         BASE,
    headers:         { "Content-Type": "application/json" },
    timeout:         60000,
    withCredentials: true,   // send the HttpOnly refresh cookie on every request
});

// ── Request interceptor — attach Bearer access token + CSRF header ────────────
api.interceptors.request.use(
    (config) => {
        if (_accessToken) config.headers.Authorization = `Bearer ${_accessToken}`;
        const csrf = getCsrfToken();
        if (csrf) config.headers["X-CSRF-Token"] = csrf;
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Deduplicated token refresh ────────────────────────────────────────────────
// Uses a bare axios call (not `api`) to avoid the response interceptor recursing.
// Sends only cookies + the CSRF header — no token in the body.
let _refreshPromise = null;

export function refreshAccessToken() {
    if (!_refreshPromise) {
        _refreshPromise = axios
            .post(`${BASE}/auth/refresh/`, {}, {
                withCredentials: true,
                headers: { "X-CSRF-Token": getCsrfToken() || "" },
            })
            .then((res) => {
                setAccessToken(res.data.data.access);
                return res;
            })
            .finally(() => { _refreshPromise = null; });
    }
    return _refreshPromise;
}

// ── Response interceptor — silent refresh on 401 ─────────────────────────────
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;

        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;
            try {
                await refreshAccessToken();              // sets _accessToken on success
                original.headers.Authorization = `Bearer ${_accessToken}`;
                return api(original);
            } catch {
                clearAccessToken();
                if (typeof window !== "undefined") {
                    window.location.href = "/login";
                }
            }
        }

        return Promise.reject(error);
    }
);

// ── API surface ───────────────────────────────────────────────────────────────
export const authAPI = {
    register:       (data) => api.post("/auth/register/",        data),
    login:          (data) => api.post("/auth/login/",           data),
    refresh:        ()     => refreshAccessToken(),
    logout:         ()     => api.post("/auth/logout/",          {}),
    profile:        ()     => api.get("/auth/profile/"),
    updateProfile:  (data) => api.patch("/auth/profile/",        data),
    changePassword: (data) => api.post("/auth/change-password/", data),
};

export const vendorsAPI = {
    onboard:   (data)   => api.post("/vendors/onboard/",              data),
    myProfile: ()       => api.get("/vendors/me/"),
    update:    (data)   => api.patch("/vendors/me/",                  data),
    getById:   (id)     => api.get(`/vendors/${id}/`),
    list:      (params) => api.get("/vendors/admin/list/",            { params }),
    approve:   (id)     => api.patch(`/vendors/admin/${id}/approve/`, { is_approved: true }),
    suspend:   (id)     => api.patch(`/vendors/admin/${id}/suspend/`, { is_approved: false }),
};

export const productsAPI = {
    list:            (params)     => api.get("/products/",                      { params }),
    getById:         (id)         => api.get(`/products/${id}/`),
    create:          (data)       => api.post("/products/",                     data),
    update:          (id, data)   => api.patch(`/products/${id}/`,              data),
    remove:          (id)         => api.delete(`/products/${id}/`),
    getInventory:    (id)         => api.get(`/products/${id}/inventory/`),
    updateInventory: (id, data)   => api.patch(`/products/${id}/inventory/`,    data),
    getReviews:      (id, params) => api.get(`/products/${id}/reviews/`,        { params }),
    submitReview:    (id, data)   => api.post(`/products/${id}/reviews/`,       data),
};

export const ordersAPI = {
    checkout:      (data)       => api.post("/orders/checkout/",           data),
    verifyPayment: (data)       => api.post("/orders/payment/verify/",     data),
    validateCoupon:(data)       => api.post("/orders/coupon/validate/",    data),
    myOrders:      (params)     => api.get("/orders/",                     { params }),
    getById:       (id)         => api.get(`/orders/${id}/`),
    vendorOrders:  (params)     => api.get("/orders/vendor/",              { params }),
    updateStatus:  (id, data)   => api.patch(`/orders/${id}/status/`,      data),
    cancelOrder:   (id, data)   => api.post(`/orders/${id}/cancel/`,       data),
    requestReturn: (id, data)   => api.post(`/orders/${id}/return/`,       data),
    getReturn:     (id)         => api.get(`/orders/${id}/return/`),
    getCoupons:    ()           => api.get("/orders/admin/coupons/"),
    createCoupon:  (data)       => api.post("/orders/admin/coupons/",      data),
    updateCoupon:  (code, data) => api.patch(`/orders/admin/coupons/${code}/`, data),
    deleteCoupon:  (code)       => api.delete(`/orders/admin/coupons/${code}/`),
};

export default api;
