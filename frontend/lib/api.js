import axios from "axios";

// ── In-memory token store ─────────────────────────────────────────────────────
// Access token lives only in JS memory — not localStorage, not sessionStorage.
// XSS can read memory during the current session but cannot persist it across
// page loads, and cannot access the HttpOnly refresh cookie at all.
let _accessToken = null;
export const setAccessToken   = (token) => { _accessToken = token; };
export const clearAccessToken = ()       => { _accessToken = null; };
export const getAccessToken   = ()       =>   _accessToken;

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
    baseURL:      process.env.NEXT_PUBLIC_API_URL,
    headers:      { "Content-Type": "application/json" },
    timeout:      60000,
    withCredentials: true,   // send HttpOnly cookies on every request
});

// ── Request interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use(
    (config) => {
        if (_accessToken) {
            config.headers.Authorization = `Bearer ${_accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response interceptor — silent token refresh on 401 ───────────────────────
let _refreshPromise = null;   // deduplicate concurrent refresh attempts

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;

        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;

            try {
                // Reuse an in-flight refresh if one is already happening
                if (!_refreshPromise) {
                    const storedRefresh = typeof window !== "undefined"
                        ? localStorage.getItem("refresh_token")
                        : null;
                    _refreshPromise = axios
                        .post(
                            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh/`,
                            storedRefresh ? { refresh: storedRefresh } : {},
                            { withCredentials: true }
                        )
                        .finally(() => { _refreshPromise = null; });
                }

                const res      = await _refreshPromise;
                const newToken = res.data.data.access;
                setAccessToken(newToken);
                original.headers.Authorization = `Bearer ${newToken}`;
                return api(original);
            } catch {
                clearAccessToken();
                if (typeof window !== "undefined") {
                    localStorage.removeItem("user");
                    window.location.href = "/login";
                }
            }
        }

        return Promise.reject(error);
    }
);

// ── API surface ───────────────────────────────────────────────────────────────
export const authAPI = {
    register:       (data)         => api.post("/auth/register/",        data),
    login:          (data)         => api.post("/auth/login/",           data),
    // refreshToken is sent in the body as a fallback for dev (cross-origin localhost).
    // In production the HttpOnly cookie is sent automatically by the browser.
    // The Django view accepts whichever arrives first: cookie → body.
    refresh:        (refreshToken) => api.post("/auth/refresh/", refreshToken ? { refresh: refreshToken } : {}),
    logout:         ()             => api.post("/auth/logout/",          {}),
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
