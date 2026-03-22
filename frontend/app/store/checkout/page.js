"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ordersAPI } from "@/lib/api";

export default function CheckoutPage() {
    const [cart,    setCart]    = useState([]);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState("");
    const [form,    setForm]    = useState({
        name: "", email: "", phone: "", address: "", city: "", state: "", pincode: ""
    });
    const [couponCode,    setCouponCode]    = useState("");
    const [couponData,    setCouponData]    = useState(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError,   setCouponError]   = useState("");

    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && !user) router.push("/login");
        const stored = JSON.parse(localStorage.getItem("cart") || "[]");
        if (stored.length === 0) router.push("/store/cart");
        setCart(stored);
        if (user) setForm(f => ({ ...f, name: user.name || "", email: user.email || "" }));
    }, [user, authLoading]);

    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const delivery = subtotal >= 999 ? 0 : 99;
    const discount = couponData?.discount_amount || 0;
    const total    = subtotal + delivery - discount;

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponLoading(true);
        setCouponError("");
        setCouponData(null);
        try {
            const res = await ordersAPI.validateCoupon({
                code:  couponCode.trim().toUpperCase(),
                total: subtotal,
            });
            setCouponData(res.data.data);
        } catch (err) {
            setCouponError(err.response?.data?.message || "Invalid coupon code");
        } finally {
            setCouponLoading(false);
        }
    };

    const removeCoupon = () => {
        setCouponData(null);
        setCouponCode("");
        setCouponError("");
    };

    const loadRazorpay = () => new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload  = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const loaded = await loadRazorpay();
            if (!loaded) throw new Error("Failed to load Razorpay");

            const orderRes = await ordersAPI.checkout({
                items:            cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
                shipping_address: form,
                coupon_code:      couponData?.code || "",
            });

            const { razorpay_order_id, razorpay_key, amount, currency, order_id } = orderRes.data.data;

            const options = {
                key:         razorpay_key,
                amount,
                currency:    currency || "INR",
                name:        "ShopX",
                description: "Order Payment",
                order_id:    razorpay_order_id,
                prefill:     { name: form.name, email: form.email, contact: form.phone },
                theme:       { color: "#0071e3" },
                handler: async (response) => {
                    try {
                        await ordersAPI.verifyPayment({
                            razorpay_order_id:   response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature:  response.razorpay_signature,
                            order_id,
                        });
                        localStorage.removeItem("cart");
                        router.push(`/store/orders?success=true&order_id=${order_id}`);
                    } catch {
                        setError("Payment verification failed. Contact support.");
                    }
                },
            };

            new window.Razorpay(options).open();
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Checkout failed");
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) return (
        <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif", fontSize: 14 }}>
            Loading...
        </div>
    );

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                .page { min-height: 100vh; background: #0a0a0a; font-family: 'Inter', -apple-system, sans-serif; color: #f5f5f7; }
                .nav { background: rgba(10,10,10,0.9); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.07); position: sticky; top: 0; z-index: 100; }
                .nav-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; height: 52px; display: flex; align-items: center; justify-content: space-between; }
                .logo { display: flex; align-items: center; gap: 8px; cursor: pointer; }
                .logo-mark { width: 28px; height: 28px; background: linear-gradient(135deg,#4da3ff,#0071e3); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #fff; }
                .logo-name { font-size: 15px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.4px; }
                .back-btn { font-size: 13px; color: #4da3ff; font-weight: 500; background: none; border: none; cursor: pointer; font-family: 'Inter', sans-serif; }
                .steps { display: flex; align-items: center; gap: 6px; }
                .step { font-size: 12px; font-weight: 500; padding: 4px 12px; border-radius: 20px; }
                .step.done { color: #4ade80; background: rgba(26,127,75,0.12); }
                .step.active { color: #f5f5f7; background: rgba(255,255,255,0.1); }
                .step.upcoming { color: rgba(255,255,255,0.25); }
                .step-sep { color: rgba(255,255,255,0.15); font-size: 12px; }

                .container { max-width: 1100px; margin: 0 auto; padding: 40px 24px 80px; }
                .page-title { font-size: 28px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.8px; margin-bottom: 32px; }
                .layout { display: grid; grid-template-columns: 1fr 380px; gap: 24px; align-items: start; }

                .form-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; overflow: hidden; }
                .form-section { padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.06); }
                .form-section:last-child { border-bottom: none; }
                .form-section-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 18px; display: flex; align-items: center; gap: 8px; }
                .form-section-icon { width: 26px; height: 26px; background: rgba(0,113,227,0.15); border: 1px solid rgba(0,113,227,0.2); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 12px; }

                .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
                .field { margin-bottom: 12px; }
                .field:last-child { margin-bottom: 0; }
                .field label { display: block; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); margin-bottom: 7px; letter-spacing: 0.4px; text-transform: uppercase; }
                .field input, .field select { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 11px 14px; font-size: 14px; color: #f5f5f7; font-family: 'Inter', sans-serif; outline: none; transition: all 0.15s; }
                .field input::placeholder { color: rgba(255,255,255,0.2); }
                .field input:focus, .field select:focus { background: rgba(255,255,255,0.09); border-color: rgba(77,163,255,0.5); box-shadow: 0 0 0 3px rgba(0,113,227,0.1); }
                .field select option { background: #1a1a1a; color: #f5f5f7; }

                .error-box { background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.25); color: #f87171; border-radius: 12px; padding: 12px 16px; font-size: 13px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }

                /* ── Coupon ── */
                .coupon-row { display: flex; gap: 8px; }
                .coupon-input { flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 11px 14px; font-size: 14px; color: #f5f5f7; font-family: 'Inter', sans-serif; outline: none; transition: all 0.15s; text-transform: uppercase; letter-spacing: 1px; }
                .coupon-input::placeholder { color: rgba(255,255,255,0.2); text-transform: none; letter-spacing: 0; }
                .coupon-input:focus { background: rgba(255,255,255,0.09); border-color: rgba(77,163,255,0.5); box-shadow: 0 0 0 3px rgba(0,113,227,0.1); }
                .apply-btn { background: rgba(0,113,227,0.2); color: #4da3ff; border: 1px solid rgba(0,113,227,0.3); border-radius: 10px; padding: 11px 18px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; white-space: nowrap; transition: all 0.15s; }
                .apply-btn:hover:not(:disabled) { background: rgba(0,113,227,0.3); }
                .apply-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .coupon-success { display: flex; align-items: center; justify-content: space-between; background: rgba(26,127,75,0.1); border: 1px solid rgba(26,127,75,0.25); border-radius: 10px; padding: 12px 14px; margin-top: 10px; }
                .coupon-success-left { display: flex; align-items: center; gap: 8px; }
                .coupon-tag { font-size: 13px; font-weight: 700; color: #4ade80; letter-spacing: 1px; }
                .coupon-savings { font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 2px; }
                .remove-coupon { background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; font-size: 16px; padding: 0; transition: color 0.15s; }
                .remove-coupon:hover { color: #f87171; }
                .coupon-error { font-size: 12px; color: #f87171; margin-top: 8px; display: flex; align-items: center; gap: 5px; }

                /* ── Summary ── */
                .summary-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 24px; position: sticky; top: 80px; }
                .summary-title { font-size: 15px; font-weight: 700; color: #f5f5f7; margin-bottom: 20px; letter-spacing: -0.3px; }
                .order-items { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
                .order-item { display: flex; align-items: center; gap: 12px; }
                .item-img { width: 48px; height: 48px; background: #1a1a1a; border-radius: 10px; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.06); }
                .item-img img { width: 100%; height: 100%; object-fit: cover; }
                .item-info { flex: 1; min-width: 0; }
                .item-name { font-size: 13px; font-weight: 500; color: #f5f5f7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .item-qty { font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 2px; }
                .item-price { font-size: 14px; font-weight: 600; color: #f5f5f7; white-space: nowrap; }
                .summary-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 16px 0; }
                .summary-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 10px; }
                .summary-row .lbl { color: rgba(255,255,255,0.4); }
                .summary-row .val { color: #f5f5f7; font-weight: 500; }
                .summary-row .val.free { color: #4ade80; font-weight: 600; }
                .summary-row .val.discount { color: #4ade80; font-weight: 600; }
                .summary-total { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .summary-total .lbl { font-size: 15px; font-weight: 600; color: #f5f5f7; }
                .summary-total .val { font-size: 22px; font-weight: 800; color: #f5f5f7; letter-spacing: -0.5px; }
                .pay-btn { width: 100%; background: linear-gradient(135deg,#0071e3,#0056b3); color: #fff; border: none; border-radius: 12px; padding: 15px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; box-shadow: 0 4px 20px rgba(0,113,227,0.3); margin-bottom: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; }
                .pay-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(0,113,227,0.4); }
                .pay-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .trust-items { display: flex; flex-direction: column; gap: 8px; }
                .trust-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: rgba(255,255,255,0.3); }
                .free-del-banner { background: rgba(26,127,75,0.1); border: 1px solid rgba(26,127,75,0.2); border-radius: 10px; padding: 10px 14px; font-size: 12px; color: #4ade80; display: flex; align-items: center; gap: 6px; margin-bottom: 16px; }
                .loading-spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }

                @media (max-width: 768px) {
    .layout { grid-template-columns: 1fr; }
    .summary-card { position: static; }
    .container { padding: 24px 16px 60px; }
    .field-row { grid-template-columns: 1fr; }
    .steps { display: none; }
    .page-title { font-size: 22px; }
}
            `}</style>

            <div className="page">
                <nav className="nav">
                    <div className="nav-inner">
                        <div className="logo" onClick={() => router.push("/store")}>
                            <div className="logo-mark">S</div>
                            <span className="logo-name">ShopX</span>
                        </div>
                        <div className="steps">
                            <span className="step done">✓ Cart</span>
                            <span className="step-sep">›</span>
                            <span className="step active">Checkout</span>
                            <span className="step-sep">›</span>
                            <span className="step upcoming">Confirmation</span>
                        </div>
                        <button className="back-btn" onClick={() => router.push("/store/cart")}>← Back to cart</button>
                    </div>
                </nav>

                <div className="container">
                    <h1 className="page-title">Checkout</h1>

                    <div className="layout">
                        <form onSubmit={handleSubmit}>
                            {error && <div className="error-box">✕ {error}</div>}

                            <div className="form-card">
                                {/* Contact */}
                                <div className="form-section">
                                    <div className="form-section-title">
                                        <div className="form-section-icon">👤</div>
                                        Contact information
                                    </div>
                                    <div className="field-row">
                                        <div className="field">
                                            <label>Full name</label>
                                            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your full name" required />
                                        </div>
                                        <div className="field">
                                            <label>Phone number</label>
                                            <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="10-digit mobile" required />
                                        </div>
                                    </div>
                                    <div className="field">
                                        <label>Email address</label>
                                        <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@example.com" required />
                                    </div>
                                </div>

                                {/* Shipping */}
                                <div className="form-section">
                                    <div className="form-section-title">
                                        <div className="form-section-icon">📍</div>
                                        Shipping address
                                    </div>
                                    <div className="field">
                                        <label>Street address</label>
                                        <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="House no., street, area" required />
                                    </div>
                                    <div className="field-row">
                                        <div className="field">
                                            <label>City</label>
                                            <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="City" required />
                                        </div>
                                        <div className="field">
                                            <label>Pincode</label>
                                            <input value={form.pincode} onChange={e => setForm({...form, pincode: e.target.value})} placeholder="6-digit pincode" required maxLength={6} />
                                        </div>
                                    </div>
                                    <div className="field">
                                        <label>State</label>
                                        <select value={form.state} onChange={e => setForm({...form, state: e.target.value})} required>
                                            <option value="">Select state</option>
                                            {["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh","Puducherry"].map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Coupon */}
                                <div className="form-section">
                                    <div className="form-section-title">
                                        <div className="form-section-icon">🏷</div>
                                        Promo code
                                    </div>
                                    {!couponData ? (
                                        <>
                                            <div className="coupon-row">
                                                <input
                                                    className="coupon-input"
                                                    placeholder="Enter promo code"
                                                    value={couponCode}
                                                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                                                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleApplyCoupon())}
                                                />
                                                <button type="button" className="apply-btn" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}>
                                                    {couponLoading ? "..." : "Apply"}
                                                </button>
                                            </div>
                                            {couponError && <div className="coupon-error">✕ {couponError}</div>}
                                        </>
                                    ) : (
                                        <div className="coupon-success">
                                            <div className="coupon-success-left">
                                                <span style={{ fontSize: 18 }}>🎉</span>
                                                <div>
                                                    <div className="coupon-tag">{couponData.code}</div>
                                                    <div className="coupon-savings">You save ₹{couponData.discount_amount.toLocaleString("en-IN")}</div>
                                                </div>
                                            </div>
                                            <button type="button" className="remove-coupon" onClick={removeCoupon}>✕</button>
                                        </div>
                                    )}
                                </div>

                                {/* Payment */}
                                <div className="form-section">
                                    <div className="form-section-title">
                                        <div className="form-section-icon">💳</div>
                                        Payment
                                    </div>
                                    <div style={{ background: "rgba(0,113,227,0.08)", border: "1px solid rgba(0,113,227,0.15)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                                        <div style={{ fontSize: 22 }}>🔒</div>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: "#f5f5f7", marginBottom: 3 }}>Secure payment via Razorpay</div>
                                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>UPI, cards, net banking, wallets — all accepted</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Summary */}
                        <div className="summary-card">
                            <div className="summary-title">Order summary</div>

                            <div className="order-items">
                                {cart.map((item, i) => (
                                    <div className="order-item" key={i}>
                                        <div className="item-img">
                                            {item.image ? <img src={item.image} alt={item.name} /> : "📦"}
                                        </div>
                                        <div className="item-info">
                                            <div className="item-name">{item.name}</div>
                                            <div className="item-qty">Qty: {item.quantity}</div>
                                        </div>
                                        <div className="item-price">₹{(item.price * item.quantity).toLocaleString("en-IN")}</div>
                                    </div>
                                ))}
                            </div>

                            {delivery === 0 && (
                                <div className="free-del-banner">🚚 You qualify for free delivery!</div>
                            )}

                            <div className="summary-row">
                                <span className="lbl">Subtotal</span>
                                <span className="val">₹{subtotal.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="summary-row">
                                <span className="lbl">Delivery</span>
                                <span className={`val ${delivery === 0 ? "free" : ""}`}>{delivery === 0 ? "Free" : `₹${delivery}`}</span>
                            </div>
                            {couponData && (
                                <div className="summary-row">
                                    <span className="lbl">Promo ({couponData.code})</span>
                                    <span className="val discount">− ₹{couponData.discount_amount.toLocaleString("en-IN")}</span>
                                </div>
                            )}

                            <div className="summary-divider" />

                            <div className="summary-total">
                                <span className="lbl">Total</span>
                                <span className="val">₹{total.toLocaleString("en-IN")}</span>
                            </div>

                            <button className="pay-btn" onClick={handleSubmit} disabled={loading}>
                                {loading
                                    ? <><span className="loading-spinner" /> Processing...</>
                                    : <>Pay ₹{total.toLocaleString("en-IN")} →</>
                                }
                            </button>

                            <div className="trust-items">
                                <div className="trust-item">🔒 256-bit SSL encrypted payment</div>
                                <div className="trust-item">✓ Verified by Razorpay</div>
                                <div className="trust-item">↩ 7-day easy returns</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}