"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ordersAPI } from "@/lib/api";

export default function OrderTrackingPage({ params }) {
    const { id } = use(params);
    const [order,          setOrder]          = useState(null);
    const [loading,        setLoading]        = useState(true);
    const [cancelModal,    setCancelModal]    = useState(false);
    const [returnModal,    setReturnModal]    = useState(false);
    const [cancelReason,   setCancelReason]   = useState("");
    const [returnReason,   setReturnReason]   = useState("");
    const [actionLoading,  setActionLoading]  = useState(false);
    const [actionError,    setActionError]    = useState("");
    const [successMsg,     setSuccessMsg]     = useState("");
    const router = useRouter();

    useEffect(() => { fetchOrder(); }, []);

    const fetchOrder = async () => {
        try {
            const res = await ordersAPI.getById(id);
            setOrder(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!cancelReason.trim()) { setActionError("Please provide a reason"); return; }
        setActionLoading(true);
        setActionError("");
        try {
            await ordersAPI.cancelOrder(id, { reason: cancelReason });
            setCancelModal(false);
            setSuccessMsg("Order cancelled successfully. Refund will be processed in 5-7 business days.");
            fetchOrder();
        } catch (err) {
            setActionError(err.response?.data?.message || "Failed to cancel order");
        } finally {
            setActionLoading(false);
        }
    };

    const handleReturn = async () => {
        if (!returnReason.trim()) { setActionError("Please provide a reason"); return; }
        setActionLoading(true);
        setActionError("");
        try {
            await ordersAPI.requestReturn(id, { reason: returnReason });
            setReturnModal(false);
            setSuccessMsg("Return request submitted! Our team will review it within 24 hours.");
            fetchOrder();
        } catch (err) {
            setActionError(err.response?.data?.message || "Failed to submit return request");
        } finally {
            setActionLoading(false);
        }
    };

    const steps = [
        { key: "pending",    label: "Order Placed",  icon: "✓",  desc: "Successfully placed" },
        { key: "processing", label: "Processing",    icon: "⚙",  desc: "Vendor preparing" },
        { key: "shipped",    label: "Shipped",       icon: "🚚", desc: "On the way" },
        { key: "delivered",  label: "Delivered",     icon: "📦", desc: "Delivered!" },
    ];

    const getStepIndex = (status) => ({ pending: 0, processing: 1, shipped: 2, delivered: 3 })[status] ?? 1;

    const cancelReasons = [
        "Changed my mind",
        "Ordered by mistake",
        "Found a better price elsewhere",
        "Delivery time too long",
        "Other",
    ];

    const returnReasons = [
        "Product damaged or defective",
        "Wrong item delivered",
        "Product not as described",
        "Size/fit issue",
        "Quality not as expected",
        "Other",
    ];

    if (loading) return (
        <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif", fontSize: 14 }}>
            Loading order...
        </div>
    );

    if (!order) return (
        <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "Inter, sans-serif" }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#f5f5f7" }}>Order not found</div>
            <button onClick={() => router.push("/store/orders")} style={{ color: "#4da3ff", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontFamily: "Inter, sans-serif" }}>← Back to orders</button>
        </div>
    );

    const currentStep = getStepIndex(order.status);
    const isCancelled = order.status === "cancelled";
    const isDelivered = order.status === "delivered";
    const canCancel   = ["pending", "processing"].includes(order.status);
    const canReturn   = isDelivered && !order.return_requested;
    const date = new Date(order.created_at).toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    });

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                .page { min-height: 100vh; background: #0a0a0a; font-family: 'Inter', -apple-system, sans-serif; color: #f5f5f7; }
                .nav { background: rgba(10,10,10,0.9); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.07); position: sticky; top: 0; z-index: 100; }
                .nav-inner { max-width: 900px; margin: 0 auto; padding: 0 24px; height: 52px; display: flex; align-items: center; justify-content: space-between; }
                .logo { display: flex; align-items: center; gap: 8px; cursor: pointer; }
                .logo-mark { width: 28px; height: 28px; background: linear-gradient(135deg,#4da3ff,#0071e3); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #fff; }
                .logo-name { font-size: 15px; font-weight: 700; color: #f5f5f7; }
                .back-btn { font-size: 13px; color: #4da3ff; font-weight: 500; background: none; border: none; cursor: pointer; font-family: 'Inter', sans-serif; }
                .container { max-width: 900px; margin: 0 auto; padding: 40px 24px 80px; }
                .page-title { font-size: 28px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.8px; margin-bottom: 4px; }
                .page-sub { font-size: 14px; color: rgba(255,255,255,0.35); margin-bottom: 32px; }

                .success-banner { background: rgba(26,127,75,0.1); border: 1px solid rgba(26,127,75,0.25); border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; gap: 12px; margin-bottom: 24px; font-size: 14px; color: #4ade80; }
                .cancelled-banner { background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.25); border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
                .banner-icon { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
                .cancelled-banner .banner-icon { background: rgba(220,38,38,0.2); }
                .banner-title { font-size: 15px; font-weight: 600; margin-bottom: 3px; }
                .banner-desc { font-size: 13px; color: rgba(255,255,255,0.35); }

                .return-banner { background: rgba(180,83,9,0.1); border: 1px solid rgba(180,83,9,0.25); border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
                .return-banner .banner-icon { background: rgba(180,83,9,0.2); font-size: 16px; width: 38px; height: 38px; }

                .tracking-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 28px; margin-bottom: 16px; }
                .card-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 28px; }
                .steps { display: flex; align-items: flex-start; position: relative; }
                .step { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1; }
                .step-line { position: absolute; top: 20px; left: 50%; right: -50%; height: 2px; background: rgba(255,255,255,0.08); z-index: 0; }
                .step-line.done { background: #1a7f4b; }
                .step-circle { width: 40px; height: 40px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.1); background: #1a1a1a; display: flex; align-items: center; justify-content: center; font-size: 15px; margin-bottom: 10px; position: relative; z-index: 2; transition: all 0.3s; }
                .step-circle.done { background: #1a7f4b; border-color: #1a7f4b; color: #fff; font-size: 13px; }
                .step-circle.active { background: #141414; border-color: #4da3ff; color: #4da3ff; box-shadow: 0 0 0 4px rgba(77,163,255,0.15); }
                .step-label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.25); text-align: center; margin-bottom: 3px; }
                .step-label.done { color: #4ade80; }
                .step-label.active { color: #4da3ff; }
                .step-desc { font-size: 10px; color: rgba(255,255,255,0.2); text-align: center; max-width: 90px; line-height: 1.3; }

                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
                .info-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 20px; }
                .info-title { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.3); letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 14px; }
                .info-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 13px; }
                .info-row:last-child { margin-bottom: 0; }
                .info-row .lbl { color: rgba(255,255,255,0.35); }
                .info-row .val { color: #f5f5f7; font-weight: 500; text-align: right; max-width: 180px; }

                .items-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow: hidden; margin-bottom: 16px; }
                .items-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.5px; padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); }
                .order-item { display: flex; align-items: center; gap: 14px; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .order-item:last-child { border-bottom: none; }
                .item-thumb { width: 56px; height: 56px; background: #1a1a1a; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); }
                .item-thumb img { width: 100%; height: 100%; object-fit: cover; }
                .item-name { font-size: 14px; font-weight: 500; color: #f5f5f7; flex: 1; }
                .item-qty { font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 3px; }
                .item-price { font-size: 14px; font-weight: 600; color: #f5f5f7; white-space: nowrap; }

                .summary-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 20px; margin-bottom: 16px; }
                .summary-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 10px; }
                .summary-row .lbl { color: rgba(255,255,255,0.35); }
                .summary-row .val { color: #f5f5f7; font-weight: 500; }
                .summary-row .val.free { color: #4ade80; }
                .summary-row .val.discount { color: #4ade80; }
                .summary-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 14px 0; }
                .summary-total { display: flex; justify-content: space-between; align-items: center; }
                .summary-total .lbl { font-size: 15px; font-weight: 600; color: #f5f5f7; }
                .summary-total .val { font-size: 22px; font-weight: 800; color: #f5f5f7; letter-spacing: -0.6px; }

                .status-pill { display: inline-block; font-size: 12px; font-weight: 500; padding: 4px 12px; border-radius: 20px; text-transform: capitalize; }

                .actions { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
                .btn-primary { flex: 1; background: linear-gradient(135deg,#0071e3,#0056b3); color: #fff; border: none; border-radius: 12px; padding: 14px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; min-width: 140px; }
                .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,113,227,0.3); }
                .btn-secondary { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px 20px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; white-space: nowrap; }
                .btn-secondary:hover { background: rgba(255,255,255,0.1); color: #f5f5f7; }
                .btn-danger { background: rgba(220,38,38,0.1); color: #f87171; border: 1px solid rgba(220,38,38,0.2); border-radius: 12px; padding: 14px 20px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; white-space: nowrap; }
                .btn-danger:hover { background: rgba(220,38,38,0.2); }
                .btn-return { background: rgba(180,83,9,0.1); color: #fbbf24; border: 1px solid rgba(180,83,9,0.2); border-radius: 12px; padding: 14px 20px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; white-space: nowrap; }
                .btn-return:hover { background: rgba(180,83,9,0.2); }

                /* ── Modal ── */
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 24px; backdrop-filter: blur(8px); }
                .modal { background: #141414; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; width: 100%; max-width: 440px; padding: 28px; box-shadow: 0 24px 80px rgba(0,0,0,0.6); }
                .modal-title { font-size: 18px; font-weight: 700; color: #f5f5f7; margin-bottom: 6px; letter-spacing: -0.4px; }
                .modal-sub { font-size: 13px; color: rgba(255,255,255,0.35); margin-bottom: 20px; line-height: 1.5; }
                .modal-label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 10px; }
                .reason-options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
                .reason-option { display: flex; align-items: center; gap: 10px; padding: 11px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; cursor: pointer; transition: all 0.15s; }
                .reason-option:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); }
                .reason-option.selected { background: rgba(0,113,227,0.12); border-color: rgba(0,113,227,0.3); }
                .reason-option.selected.danger { background: rgba(220,38,38,0.1); border-color: rgba(220,38,38,0.25); }
                .reason-radio { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .reason-radio.selected { border-color: #4da3ff; background: #4da3ff; }
                .reason-radio.selected::after { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #fff; }
                .reason-text { font-size: 13px; color: #f5f5f7; }
                .modal-error { font-size: 13px; color: #f87171; margin-bottom: 12px; }
                .modal-btns { display: flex; gap: 10px; margin-top: 4px; }
                .modal-btn-cancel { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 12px 20px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; }
                .modal-btn-confirm { flex: 1; border: none; border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; }
                .modal-btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
                .modal-btn-confirm.danger { background: linear-gradient(135deg,#dc2626,#b91c1c); color: #fff; }
                .modal-btn-confirm.warning { background: linear-gradient(135deg,#d97706,#b45309); color: #fff; }

                @media (max-width: 768px) {
    .container { padding: 24px 16px 60px; }
    .info-grid { grid-template-columns: 1fr; }
    .steps { gap: 0; }
    .step-circle { width: 32px; height: 32px; font-size: 12px; }
    .step-label { font-size: 10px; }
    .step-desc { display: none; }
    .actions { flex-wrap: wrap; }
    .btn-primary { min-width: unset; }
    .page-title { font-size: 20px; }
}
            `}</style>

            <div className="page">
                <nav className="nav">
                    <div className="nav-inner">
                        <div className="logo" onClick={() => router.push("/store")}>
                            <div className="logo-mark">S</div>
                            <span className="logo-name">ShopX</span>
                        </div>
                        <button className="back-btn" onClick={() => router.push("/store/orders")}>← All orders</button>
                    </div>
                </nav>

                <div className="container">
                    <h1 className="page-title">Order #{order.id.slice(-8).toUpperCase()}</h1>
                    <p className="page-sub">Placed on {date}</p>

                    {successMsg && (
                        <div className="success-banner">
                            ✓ {successMsg}
                        </div>
                    )}

                    {isCancelled && (
                        <div className="cancelled-banner">
                            <div className="banner-icon">✕</div>
                            <div>
                                <div className="banner-title" style={{ color: "#f87171" }}>Order cancelled</div>
                                <div className="banner-desc">
                                    {order.cancel_reason && `Reason: ${order.cancel_reason}. `}
                                    {order.payment_status === "paid" && "Refund will be processed within 5-7 business days."}
                                </div>
                            </div>
                        </div>
                    )}

                    {order.return_requested && (
                        <div className="return-banner">
                            <div className="banner-icon">↩</div>
                            <div>
                                <div className="banner-title" style={{ color: "#fbbf24" }}>
                                    Return requested
                                    <span style={{ fontSize: 11, fontWeight: 500, background: "rgba(180,83,9,0.2)", color: "#fbbf24", padding: "2px 8px", borderRadius: 20, marginLeft: 8, textTransform: "capitalize" }}>
                                        {order.return_status}
                                    </span>
                                </div>
                                <div className="banner-desc">Reason: {order.return_reason}</div>
                            </div>
                        </div>
                    )}

                    {!isCancelled && (
                        <div className="tracking-card">
                            <div className="card-title">Order status</div>
                            <div className="steps">
                                {steps.map((step, idx) => {
                                    const isDone   = idx < currentStep;
                                    const isActive = idx === currentStep;
                                    return (
                                        <div className="step" key={step.key}>
                                            {idx < steps.length - 1 && <div className={`step-line ${isDone ? "done" : ""}`} />}
                                            <div className={`step-circle ${isDone ? "done" : isActive ? "active" : ""}`}>
                                                {isDone ? "✓" : step.icon}
                                            </div>
                                            <div className={`step-label ${isDone ? "done" : isActive ? "active" : ""}`}>{step.label}</div>
                                            <div className="step-desc">{step.desc}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="info-grid">
                        <div className="info-card">
                            <div className="info-title">Order details</div>
                            <div className="info-row">
                                <span className="lbl">Order ID</span>
                                <span className="val">#{order.id.slice(-8).toUpperCase()}</span>
                            </div>
                            <div className="info-row">
                                <span className="lbl">Status</span>
                                <span className="status-pill" style={{
                                    background: isCancelled ? "rgba(220,38,38,0.15)" : isDelivered ? "rgba(26,127,75,0.15)" : order.status === "shipped" ? "rgba(0,113,227,0.15)" : "rgba(180,83,9,0.15)",
                                    color: isCancelled ? "#f87171" : isDelivered ? "#4ade80" : order.status === "shipped" ? "#4da3ff" : "#fbbf24"
                                }}>
                                    {order.status}
                                </span>
                            </div>
                            <div className="info-row">
                                <span className="lbl">Payment</span>
                                <span className="val" style={{ color: order.payment_status === "paid" ? "#4ade80" : "#fbbf24" }}>
                                    {order.payment_status === "paid" ? "✓ Paid" : "Pending"}
                                </span>
                            </div>
                            <div className="info-row">
                                <span className="lbl">Date</span>
                                <span className="val">{new Date(order.created_at).toLocaleDateString("en-IN")}</span>
                            </div>
                        </div>

                        <div className="info-card">
                            <div className="info-title">Shipping address</div>
                            {order.shipping_address ? (
                                <>
                                    <div className="info-row"><span className="lbl">Name</span><span className="val">{order.shipping_address.name}</span></div>
                                    <div className="info-row"><span className="lbl">Address</span><span className="val">{order.shipping_address.address}</span></div>
                                    <div className="info-row"><span className="lbl">City</span><span className="val">{order.shipping_address.city}</span></div>
                                    <div className="info-row"><span className="lbl">Pincode</span><span className="val">{order.shipping_address.pincode}</span></div>
                                    <div className="info-row"><span className="lbl">Phone</span><span className="val">{order.shipping_address.phone}</span></div>
                                </>
                            ) : (
                                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>No address on file</p>
                            )}
                        </div>
                    </div>

                    <div className="items-card">
                        <div className="items-title">Items in this order</div>
                        {order.items?.map((item, i) => (
                            <div className="order-item" key={i}>
                                <div className="item-thumb">
                                    {item.image ? <img src={item.image} alt={item.name} /> : "📦"}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div className="item-name">{item.name}</div>
                                    <div className="item-qty">Qty: {item.quantity}</div>
                                </div>
                                <div className="item-price">₹{(item.price * item.quantity).toLocaleString("en-IN")}</div>
                            </div>
                        ))}
                    </div>

                    <div className="summary-card">
                        <div className="summary-row">
                            <span className="lbl">Subtotal</span>
                            <span className="val">₹{(order.subtotal || order.total)?.toLocaleString("en-IN")}</span>
                        </div>
                        {order.discount_amount > 0 && (
                            <div className="summary-row">
                                <span className="lbl">Promo discount {order.coupon?.code && `(${order.coupon.code})`}</span>
                                <span className="val discount">− ₹{order.discount_amount?.toLocaleString("en-IN")}</span>
                            </div>
                        )}
                        <div className="summary-row">
                            <span className="lbl">Delivery</span>
                            <span className={`val ${order.total >= 999 ? "free" : ""}`}>
                                {order.total >= 999 ? "Free" : "₹99"}
                            </span>
                        </div>
                        <div className="summary-divider" />
                        <div className="summary-total">
                            <span className="lbl">Total</span>
                            <span className="val">₹{order.total?.toLocaleString("en-IN")}</span>
                        </div>
                    </div>

                    <div className="actions">
                        <button className="btn-primary" onClick={() => router.push("/store")}>Continue shopping</button>
                        <button className="btn-secondary" onClick={() => router.push("/store/orders")}>All orders</button>
                        {canCancel && (
                            <button className="btn-danger" onClick={() => { setCancelModal(true); setActionError(""); }}>
                                Cancel order
                            </button>
                        )}
                        {canReturn && (
                            <button className="btn-return" onClick={() => { setReturnModal(true); setActionError(""); }}>
                                ↩ Return order
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Cancel modal ── */}
            {cancelModal && (
                <div className="modal-overlay" onClick={() => setCancelModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">Cancel this order?</h2>
                        <p className="modal-sub">
                            {order.payment_status === "paid"
                                ? "Your payment will be refunded within 5-7 business days."
                                : "This action cannot be undone."
                            }
                        </p>
                        <div className="modal-label">Select a reason</div>
                        <div className="reason-options">
                            {cancelReasons.map(r => (
                                <div
                                    key={r}
                                    className={`reason-option ${cancelReason === r ? "selected danger" : ""}`}
                                    onClick={() => { setCancelReason(r); setActionError(""); }}
                                >
                                    <div className={`reason-radio ${cancelReason === r ? "selected" : ""}`}
                                        style={cancelReason === r ? { borderColor: "#f87171", background: "#f87171" } : {}} />
                                    <span className="reason-text">{r}</span>
                                </div>
                            ))}
                        </div>
                        {actionError && <div className="modal-error">✕ {actionError}</div>}
                        <div className="modal-btns">
                            <button className="modal-btn-cancel" onClick={() => setCancelModal(false)}>Keep order</button>
                            <button className="modal-btn-confirm danger" onClick={handleCancel} disabled={actionLoading}>
                                {actionLoading ? "Cancelling..." : "Yes, cancel order"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Return modal ── */}
            {returnModal && (
                <div className="modal-overlay" onClick={() => setReturnModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">Request a return</h2>
                        <p className="modal-sub">
                            Returns are accepted within 7 days of delivery. Our team will review your request within 24 hours.
                        </p>
                        <div className="modal-label">Reason for return</div>
                        <div className="reason-options">
                            {returnReasons.map(r => (
                                <div
                                    key={r}
                                    className={`reason-option ${returnReason === r ? "selected" : ""}`}
                                    onClick={() => { setReturnReason(r); setActionError(""); }}
                                >
                                    <div className={`reason-radio ${returnReason === r ? "selected" : ""}`} />
                                    <span className="reason-text">{r}</span>
                                </div>
                            ))}
                        </div>
                        {actionError && <div className="modal-error">✕ {actionError}</div>}
                        <div className="modal-btns">
                            <button className="modal-btn-cancel" onClick={() => setReturnModal(false)}>Cancel</button>
                            <button className="modal-btn-confirm warning" onClick={handleReturn} disabled={actionLoading}>
                                {actionLoading ? "Submitting..." : "Submit return request"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}