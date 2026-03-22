import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("access_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;

        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;

            try {
                const refresh = localStorage.getItem("refresh_token");
                if (!refresh) throw new Error("no refresh token");

                const res = await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh/`,
                    { refresh }
                );

                const newAccess = res.data.data.access;
                localStorage.setItem("access_token", newAccess);
                original.headers.Authorization = `Bearer ${newAccess}`;

                return api(original);
            } catch (err) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                localStorage.removeItem("user");
                window.location.href = "/login";
            }
        }

        return Promise.reject(error);
    }
);
export const authAPI = {
    register:       (data) => api.post("/auth/register/",         data),
    login:          (data) => api.post("/auth/login/",            data),
    profile:        ()     => api.get("/auth/profile/"),
    updateProfile:  (data) => api.patch("/auth/profile/",         data),
    changePassword: (data) => api.post("/auth/change-password/",  data),
};

export const vendorsAPI = {
    onboard:    (data) => api.post("/vendors/onboard/",              data),
    myProfile:  ()     => api.get("/vendors/me/"),
    update:     (data) => api.patch("/vendors/me/",                  data),
    getById:    (id)   => api.get(`/vendors/${id}/`),
    list:       (params) => api.get("/vendors/admin/list/",          { params }),
    approve:    (id)   => api.patch(`/vendors/admin/${id}/approve/`),
    suspend:    (id)   => api.patch(`/vendors/admin/${id}/suspend/`),
};

   export const productsAPI = {
    list:            (params)   => api.get("/products/",                       { params }),
    getById:         (id)       => api.get(`/products/${id}/`),
    create:          (data)     => api.post("/products/",                      data),
    update:          (id, data) => api.patch(`/products/${id}/`,               data),
    remove:          (id)       => api.delete(`/products/${id}/`),
    getInventory:    (id)       => api.get(`/products/${id}/inventory/`),
    updateInventory: (id, data) => api.patch(`/products/${id}/inventory/`,     data),
    getReviews:      (id, params) => api.get(`/products/${id}/reviews/`,       { params }),
    submitReview:    (id, data) => api.post(`/products/${id}/reviews/`,        data),
};

export const ordersAPI = {
    checkout:        (data)     => api.post("/orders/checkout/",        data),
    verifyPayment:   (data)     => api.post("/orders/payment/verify/",  data),
    validateCoupon:  (data)     => api.post("/orders/coupon/validate/", data),
    myOrders:        (params)   => api.get("/orders/",                  { params }),
    getById:         (id)       => api.get(`/orders/${id}/`),
    vendorOrders:    (params)   => api.get("/orders/vendor/",           { params }),
    updateStatus:    (id, data) => api.patch(`/orders/${id}/status/`,   data),
    cancelOrder:     (id, data) => api.post(`/orders/${id}/cancel/`,    data),
    requestReturn:   (id, data) => api.post(`/orders/${id}/return/`,    data),
    getReturn:       (id)       => api.get(`/orders/${id}/return/`),
    getCoupons:      ()         => api.get("/orders/admin/coupons/"),
    createCoupon:    (data)     => api.post("/orders/admin/coupons/",   data),
    updateCoupon:    (code, data) => api.patch(`/orders/admin/coupons/${code}/`, data),
    deleteCoupon:    (code)     => api.delete(`/orders/admin/coupons/${code}/`),
};
export default api;