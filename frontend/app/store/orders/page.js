"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ordersAPI } from "@/lib/api";

function OrdersContent() {
    const [orders,  setOrders]  = useState([]);
    const [loading, setLoading] = useState(true);
    const router       = useRouter();
    const searchParams = useSearchParams();
    const success      = searchParams.get("success");
    const orderId      = searchParams.get("order_id");
    const { user, logout, loading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && !user) { router.push("/login"); return; }
        fetchOrders();
    }, [user, authLoading]);

    const fetchOrders = async () => {
        try {
            const res = await ordersAPI.myOrders();
            setOrders(res.data.data.orders);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const statusStyle = (status) => {
        switch(status) {
            case "processing": return { bg: "rgba(180,83,9,0.15)",  color: "#fbbf24" };
            case "shipped":    return { bg: "rgba(0,113,227,0.15)", color: "#4da3ff" };
            case "delivered":  return { bg: "rgba(26,127,75,0.15)", color: "#4ade80" };
            case "cancelled":  return { bg: "rgba(220,38,38,0.15)", color: "#f87171" };
            default:           return { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" };
        }
    };

    const statusIcon = (status) => {
        switch(status) {
            case "processing": return "⚙"; case "shipped": return "🚚";
            case "delivered":  return "✓"; case "cancelled": return "✕";
            default: return "•";
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
                body { background: #0a0a0a; }
                .page { min-height: 100vh; background: #0a0a0a; font-family: 'Inter', -apple-system, sans-serif; color: #f5f5f7; }
                .nav { background: rgba(10,10,10,0.9); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.07); position: sticky; top: 0; z-index: 100; }
                .nav-inner { max-width: 900px; margin: 0 auto; padding: 0 24px; height: 52px; display: flex; align-items: center; justify-content: space-between; }
                .logo { display: flex; align-items: center; gap: 8px; cursor: pointer; }
                .logo-mark { width: 28px; height: 28px; background: linear-gradient(135deg,#4da3ff,#0071e3); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #fff; }
                .logo-name { font-size: 15px; font-weight: 700; color: #f5f5f7; }
                .nav-right { display: flex; align-items: center; gap: 12px; }
                .nav-btn { font-size: 13px; color: #4da3ff; font-weight: 500; background: none; border: none; cursor: pointer; font-family: 'Inter', sans-serif; }
                .nav-btn:hover { opacity: 0.7; }
                .container { max-width: 900px; margin: 0 auto; padding: 40px 24px 80px; }
                .success-banner { background: rgba(26,127,75,0.1); border: 1px solid rgba(26,127,75,0.25); border-radius: 16px; padding: 20px 24px; display: flex; align-items: center; gap: 16px; margin-bottom: 32px; }
                .success-icon { width: 44px; height: 44px; background: rgba(26,127,75,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
                .success-title { font-size: 15px; font-weight: 600; color: #4ade80; margin-bottom: 4px; }
                .success-sub { font-size: 13px; color: rgba(255,255,255,0.35); }
                .success-sub code { font-size: 12px; background: rgba(26,127,75,0.15); color: #4ade80; padding: 2px 8px; border-radius: 4px; font-family: monospace; }
                .page-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 24px; }
                .page-title { font-size: 28px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.8px; }
                .page-sub { font-size: 14px; color: rgba(255,255,255,0.3); margin-top: 4px; }
                .orders-list { display: flex; flex-direction: column; gap: 12px; }
                .order-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow: hidden; cursor: pointer; transition: all 0.18s; }
                .order-card:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,0.4); border-color: rgba(255,255,255,0.14); }
                .order-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .order-id { font-size: 14px; font-weight: 600; color: #f5f5f7; }
                .order-date { font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 3px; }
                .order-right { display: flex; align-items: center; gap: 14px; }
                .status-badge { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 500; padding: 5px 12px; border-radius: 20px; text-transform: capitalize; }
                .order-total { font-size: 15px; font-weight: 700; color: #f5f5f7; }
                .order-body { padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; }
                .order-items-left { display: flex; flex-direction: column; gap: 8px; flex: 1; }
                .order-item-row { display: flex; align-items: center; gap: 10px; }
                .item-thumb { width: 40px; height: 40px; background: #1a1a1a; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); }
                .item-thumb img { width: 100%; height: 100%; object-fit: cover; }
                .item-name { font-size: 13px; font-weight: 500; color: #f5f5f7; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }
                .item-qty { font-size: 12px; color: rgba(255,255,255,0.3); }
                .track-btn { display: flex; align-items: center; gap: 5px; font-size: 13px; color: #4da3ff; font-weight: 500; white-space: nowrap; padding: 8px 16px; background: rgba(0,113,227,0.1); border-radius: 8px; margin-left: 16px; flex-shrink: 0; transition: background 0.15s; }
                .order-card:hover .track-btn { background: rgba(0,113,227,0.18); }
                .empty { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 80px 40px; text-align: center; }
                .empty-icon { font-size: 48px; margin-bottom: 16px; }
                .empty-title { font-size: 20px; font-weight: 600; color: #f5f5f7; margin-bottom: 8px; }
                .empty-sub { font-size: 14px; color: rgba(255,255,255,0.3); margin-bottom: 24px; }
                .shop-btn { background: linear-gradient(135deg,#0071e3,#0056b3); color: #fff; border: none; border-radius: 12px; padding: 12px 28px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; }
                .shop-btn:hover { transform: translateY(-1px); }
                .loading { text-align: center; padding: 60px; color: rgba(255,255,255,0.3); font-size: 14px; }

                @media (max-width: 768px) {
    .container { padding: 24px 16px 60px; }
    .order-header { flex-direction: column; align-items: flex-start; gap: 8px; }
    .order-right { width: 100%; justify-content: space-between; }
    .item-name { max-width: 180px; }
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
                        <div className="nav-right">
                            <button className="nav-btn" onClick={() => router.push("/store")}>← Store</button>
                            <button className="nav-btn" onClick={() => router.push("/store/cart")}>Cart</button>
                        </div>
                    </div>
                </nav>

                <div className="container">
                    {success && (
                        <div className="success-banner">
                            <div className="success-icon">✓</div>
                            <div>
                                <div className="success-title">Payment successful — order confirmed!</div>
                                <div className="success-sub">Order ID: <code>{orderId}</code> — click below to track it.</div>
                            </div>
                        </div>
                    )}

                    <div className="page-header">
                        <div>
                            <h1 className="page-title">My Orders</h1>
                            <p className="page-sub">
                                {loading ? "Loading..." : orders.length === 0
                                    ? "No orders yet"
                                    : `${orders.length} order${orders.length > 1 ? "s" : ""}`
                                }
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading">Loading your orders...</div>
                    ) : orders.length === 0 ? (
                        <div className="empty">
                            <div className="empty-icon">📦</div>
                            <div className="empty-title">No orders yet</div>
                            <div className="empty-sub">Your orders will appear here after you make a purchase</div>
                            <button className="shop-btn" onClick={() => router.push("/store")}>Start shopping</button>
                        </div>
                    ) : (
                        <div className="orders-list">
                            {orders.map((order) => {
                                const style = statusStyle(order.status);
                                const icon  = statusIcon(order.status);
                                const date  = new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                                return (
                                    <div className="order-card" key={order.id} onClick={() => router.push(`/store/orders/${order.id}`)}>
                                        <div className="order-header">
                                            <div>
                                                <div className="order-id">Order #{order.id.slice(-8).toUpperCase()}</div>
                                                <div className="order-date">{date}</div>
                                            </div>
                                            <div className="order-right">
                                                <span className="status-badge" style={{ background: style.bg, color: style.color }}>
                                                    {icon} {order.status}
                                                </span>
                                                <div className="order-total">₹{order.total.toLocaleString("en-IN")}</div>
                                            </div>
                                        </div>
                                        <div className="order-body">
                                            <div className="order-items-left">
                                                {order.items?.slice(0, 2).map((item, i) => (
                                                    <div className="order-item-row" key={i}>
                                                        <div className="item-thumb">
                                                            {item.image ? <img src={item.image} alt={item.name} /> : "📦"}
                                                        </div>
                                                        <div className="item-name">{item.name}</div>
                                                        <div className="item-qty">×{item.quantity}</div>
                                                    </div>
                                                ))}
                                                {order.items?.length > 2 && (
                                                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", paddingLeft: 50 }}>
                                                        +{order.items.length - 2} more item{order.items.length - 2 > 1 ? "s" : ""}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="track-btn">Track order →</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default function OrdersPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif", fontSize: 14 }}>Loading...</div>}>
            <OrdersContent />
        </Suspense>
    );
}