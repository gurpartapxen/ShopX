"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function CartPage() {
    const [cart,    setCart]    = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && !user) router.push("/login");
    }, [user, authLoading]);

    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem("cart") || "[]");
        setCart(stored);
        setLoading(false);
    }, []);

    const updateCart = (newCart) => {
        setCart(newCart);
        localStorage.setItem("cart", JSON.stringify(newCart));
    };

    const updateQty = (index, qty) => {
        if (qty < 1) return;
        const updated = [...cart];
        updated[index].quantity = qty;
        updateCart(updated);
    };

    const removeItem = (index) => {
        const updated = cart.filter((_, i) => i !== index);
        updateCart(updated);
    };

    const subtotal  = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const delivery  = subtotal >= 999 ? 0 : 99;
    const total     = subtotal + delivery;

    if (authLoading || loading) return (
        <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif", fontSize: 14 }}>
            Loading...
        </div>
    );

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                body { background: #0a0a0a; }
                .page { min-height: 100vh; background: #0a0a0a; font-family: 'Inter', -apple-system, sans-serif; color: #f5f5f7; }
                .nav { background: rgba(10,10,10,0.9); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.07); position: sticky; top: 0; z-index: 100; }
                .nav-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; height: 52px; display: flex; align-items: center; justify-content: space-between; }
                .logo { display: flex; align-items: center; gap: 8px; cursor: pointer; }
                .logo-mark { width: 28px; height: 28px; background: linear-gradient(135deg,#4da3ff,#0071e3); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #fff; }
                .logo-name { font-size: 15px; font-weight: 700; color: #f5f5f7; }
                .back-btn { font-size: 13px; color: #4da3ff; font-weight: 500; background: none; border: none; cursor: pointer; font-family: 'Inter', sans-serif; }
                .container { max-width: 1100px; margin: 0 auto; padding: 40px 24px 80px; }
                .page-title { font-size: 32px; font-weight: 700; color: #f5f5f7; letter-spacing: -1px; margin-bottom: 6px; }
                .page-sub { font-size: 14px; color: rgba(255,255,255,0.35); margin-bottom: 32px; }
                .layout { display: grid; grid-template-columns: 1fr 360px; gap: 24px; align-items: start; }
                .cart-list { display: flex; flex-direction: column; gap: 12px; }
                .cart-item { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 20px; display: flex; gap: 16px; align-items: center; transition: border-color 0.15s; }
                .cart-item:hover { border-color: rgba(255,255,255,0.12); }
                .item-img { width: 72px; height: 72px; border-radius: 12px; background: #1a1a1a; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 28px; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.06); }
                .item-img img { width: 100%; height: 100%; object-fit: cover; }
                .item-info { flex: 1; min-width: 0; }
                .item-cat { font-size: 11px; font-weight: 600; color: #4da3ff; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
                .item-name { font-size: 15px; font-weight: 600; color: #f5f5f7; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .item-price { font-size: 16px; font-weight: 700; color: #f5f5f7; }
                .item-controls { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; flex-shrink: 0; }
                .qty-row { display: flex; align-items: center; gap: 0; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; }
                .qty-btn { width: 34px; height: 34px; background: none; border: none; color: rgba(255,255,255,0.6); font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; font-family: 'Inter', sans-serif; }
                .qty-btn:hover { background: rgba(255,255,255,0.08); color: #f5f5f7; }
                .qty-num { width: 32px; text-align: center; font-size: 14px; font-weight: 600; color: #f5f5f7; border-left: 1px solid rgba(255,255,255,0.08); border-right: 1px solid rgba(255,255,255,0.08); line-height: 34px; }
                .remove-btn { font-size: 12px; color: rgba(255,255,255,0.25); background: none; border: none; cursor: pointer; font-family: 'Inter', sans-serif; transition: color 0.15s; padding: 0; }
                .remove-btn:hover { color: #f87171; }
                .item-total { font-size: 15px; font-weight: 700; color: #f5f5f7; }
                .summary-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 24px; position: sticky; top: 80px; }
                .summary-title { font-size: 16px; font-weight: 700; color: #f5f5f7; margin-bottom: 20px; letter-spacing: -0.3px; }
                .summary-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 14px; }
                .summary-row .lbl { color: rgba(255,255,255,0.4); }
                .summary-row .val { color: #f5f5f7; font-weight: 500; }
                .summary-row .val.free { color: #4ade80; font-weight: 600; }
                .summary-row .val.del { color: #fbbf24; }
                .summary-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 16px 0; }
                .summary-total { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .summary-total .lbl { font-size: 15px; font-weight: 600; color: #f5f5f7; }
                .summary-total .val { font-size: 22px; font-weight: 800; color: #f5f5f7; letter-spacing: -0.6px; }
                .checkout-btn { width: 100%; background: linear-gradient(135deg, #0071e3, #0056b3); color: #fff; border: none; border-radius: 12px; padding: 15px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; box-shadow: 0 4px 20px rgba(0,113,227,0.3); margin-bottom: 12px; }
                .checkout-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(0,113,227,0.4); }
                .continue-btn { width: 100%; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 13px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; }
                .continue-btn:hover { background: rgba(255,255,255,0.08); color: #f5f5f7; }
                .free-shipping-bar { background: rgba(77,163,255,0.08); border: 1px solid rgba(77,163,255,0.2); border-radius: 10px; padding: 10px 14px; font-size: 12px; color: #4da3ff; margin-top: 14px; text-align: center; }
                .trust-row { display: flex; justify-content: center; gap: 16px; margin-top: 16px; }
                .trust-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(255,255,255,0.25); }
                .empty { text-align: center; padding: 80px 24px; background: #141414; border-radius: 20px; border: 1px solid rgba(255,255,255,0.07); }
                .empty-icon { font-size: 48px; margin-bottom: 16px; }
                .empty-title { font-size: 20px; font-weight: 600; color: #f5f5f7; margin-bottom: 8px; }
                .empty-sub { font-size: 14px; color: rgba(255,255,255,0.35); margin-bottom: 24px; }
                .shop-btn { background: linear-gradient(135deg,#0071e3,#0056b3); color: #fff; border: none; border-radius: 12px; padding: 12px 28px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; }
                .shop-btn:hover { transform: translateY(-1px); }

                @media (max-width: 768px) {
    .layout { grid-template-columns: 1fr; }
    .summary-card { position: static; }
    .container { padding: 24px 16px 60px; }
    .cart-item { flex-wrap: wrap; }
    .item-img { width: 56px; height: 56px; }
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
                        <button className="back-btn" onClick={() => router.push("/store")}>← Continue shopping</button>
                    </div>
                </nav>

                <div className="container">
                    <h1 className="page-title">Your Cart</h1>
                    <p className="page-sub">{cart.length === 0 ? "Your cart is empty" : `${cart.reduce((s, i) => s + i.quantity, 0)} items`}</p>

                    {cart.length === 0 ? (
                        <div className="empty">
                            <div className="empty-icon">🛒</div>
                            <div className="empty-title">Your cart is empty</div>
                            <div className="empty-sub">Add some products to get started</div>
                            <button className="shop-btn" onClick={() => router.push("/store")}>Browse products</button>
                        </div>
                    ) : (
                        <div className="layout">
                            <div className="cart-list">
                                {cart.map((item, i) => (
                                    <div className="cart-item" key={i}>
                                        <div className="item-img">
                                            {item.image ? <img src={item.image} alt={item.name} /> : "📦"}
                                        </div>
                                        <div className="item-info">
                                            <div className="item-cat">{item.category}</div>
                                            <div className="item-name">{item.name}</div>
                                            <div className="item-price">₹{item.price.toLocaleString("en-IN")}</div>
                                        </div>
                                        <div className="item-controls">
                                            <div className="qty-row">
                                                <button className="qty-btn" onClick={() => updateQty(i, item.quantity - 1)}>−</button>
                                                <div className="qty-num">{item.quantity}</div>
                                                <button className="qty-btn" onClick={() => updateQty(i, item.quantity + 1)}>+</button>
                                            </div>
                                            <div className="item-total">₹{(item.price * item.quantity).toLocaleString("en-IN")}</div>
                                            <button className="remove-btn" onClick={() => removeItem(i)}>Remove</button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="summary-card">
                                <div className="summary-title">Order summary</div>
                                <div className="summary-row">
                                    <span className="lbl">Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                                    <span className="val">₹{subtotal.toLocaleString("en-IN")}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="lbl">Delivery</span>
                                    <span className={`val ${delivery === 0 ? "free" : "del"}`}>
                                        {delivery === 0 ? "Free" : `₹${delivery}`}
                                    </span>
                                </div>
                                <div className="summary-divider" />
                                <div className="summary-total">
                                    <span className="lbl">Total</span>
                                    <span className="val">₹{total.toLocaleString("en-IN")}</span>
                                </div>
                                <button className="checkout-btn" onClick={() => router.push("/store/checkout")}>
                                    Proceed to checkout →
                                </button>
                                <button className="continue-btn" onClick={() => router.push("/store")}>
                                    Continue shopping
                                </button>
                                {subtotal < 999 && (
                                    <div className="free-shipping-bar">
                                        Add ₹{(999 - subtotal).toLocaleString("en-IN")} more for free delivery!
                                    </div>
                                )}
                                <div className="trust-row">
                                    <div className="trust-item">🔒 Secure checkout</div>
                                    <div className="trust-item">↩ Easy returns</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}