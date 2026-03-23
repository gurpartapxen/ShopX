"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { vendorsAPI, productsAPI, ordersAPI } from "@/lib/api";

export default function AdminDashboard() {
    const [vendors,  setVendors]  = useState([]);
    const [products, setProducts] = useState([]);
    const [coupons,  setCoupons]  = useState([]);
    const [tab,      setTab]      = useState("vendors");
    const [loading,  setLoading]  = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    const [showCouponModal, setShowCouponModal] = useState(false);
    const [couponForm,  setCouponForm]  = useState({
        code: "", description: "", discount_type: "percentage",
        discount_value: "", min_order_amount: "", max_uses: "", expires_at: ""
    });
    const [couponSaving, setCouponSaving] = useState(false);
    const [couponError,  setCouponError]  = useState("");

    const { user, logout, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.push("/login"); return; }
        if (user.role !== "admin") { router.push("/store"); return; }
        fetchAll();
    }, [user, authLoading]);

    const fetchAll = async (isRetry = false) => {
    setLoading(true);
    try {
        const [vendorsRes, productsRes, couponsRes] = await Promise.all([
            vendorsAPI.list(),
            productsAPI.list({ limit: 100 }),
            ordersAPI.getCoupons(),
        ]);
        setVendors(vendorsRes.data.data.vendors || []);
        setCoupons(couponsRes.data.data.coupons || []);

        const prods = productsRes.data.data.products || [];
        const prodsWithStock = await Promise.all(
            prods.map(async (p) => {
                try {
                    const invRes = await productsAPI.getInventory(p.id);
                    return { ...p, stock: invRes.data.data.quantity };
                } catch {
                    return { ...p, stock: 0 };
                }
            })
        );
        setProducts(prodsWithStock);
    } catch (err) {
        console.error(err);
        if (!isRetry) {
            setTimeout(() => fetchAll(true), 4000);
        }
    } finally {
        setLoading(false);
    }
};
    const handleApprove = async (vendorId) => {
        setActionLoading(vendorId + "_approve");
        try { await vendorsAPI.approve(vendorId); fetchAll(); }
        catch (err) { console.error(err); }
        finally { setActionLoading(null); }
    };

    const handleSuspend = async (vendorId) => {
        setActionLoading(vendorId + "_suspend");
        try { await vendorsAPI.suspend(vendorId); fetchAll(); }
        catch (err) { console.error(err); }
        finally { setActionLoading(null); }
    };

    const handleCreateCoupon = async (e) => {
        e.preventDefault();
        setCouponSaving(true);
        setCouponError("");
        try {
            await ordersAPI.createCoupon({
                ...couponForm,
                discount_value:    parseFloat(couponForm.discount_value),
                min_order_amount:  parseFloat(couponForm.min_order_amount || 0),
                max_uses:          couponForm.max_uses ? parseInt(couponForm.max_uses) : null,
                expires_at:        couponForm.expires_at || null,
            });
            setShowCouponModal(false);
            setCouponForm({ code: "", description: "", discount_type: "percentage", discount_value: "", min_order_amount: "", max_uses: "", expires_at: "" });
            fetchAll();
        } catch (err) {
            setCouponError(err.response?.data?.message || "Failed to create coupon");
        } finally {
            setCouponSaving(false);
        }
    };

    const handleToggleCoupon = async (code, isActive) => {
        try { await ordersAPI.updateCoupon(code, { is_active: !isActive }); fetchAll(); }
        catch (err) { console.error(err); }
    };

    const handleDeleteCoupon = async (code) => {
        try { await ordersAPI.deleteCoupon(code); fetchAll(); }
        catch (err) { console.error(err); }
    };

    const pendingVendors  = vendors.filter(v => !v.is_approved);
    const approvedVendors = vendors.filter(v => v.is_approved);
    const totalValue      = products.reduce((sum, p) => sum + p.price, 0);
    const discountedProducts = products.filter(p => p.discount > 0);
    const activeCoupons   = coupons.filter(c => c.is_active);

    if (authLoading || loading) return (
        <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif", fontSize: 14 }}>
            Loading admin dashboard...
        </div>
    );

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                body { background: #0a0a0a; }
                .dash { min-height: 100vh; background: #0a0a0a; font-family: 'Inter', -apple-system, sans-serif; color: #f5f5f7; }
                .nav { background: rgba(10,10,10,0.9); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.07); position: sticky; top: 0; z-index: 100; }
                .nav-inner { max-width: 1300px; margin: 0 auto; padding: 0 32px; height: 52px; display: flex; align-items: center; justify-content: space-between; }
                .logo { display: flex; align-items: center; gap: 9px; cursor: pointer; }
                .logo-mark { width: 30px; height: 30px; background: linear-gradient(135deg,#4da3ff,#0071e3); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #fff; }
                .logo-name { font-size: 16px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.4px; }
                .nav-badge { font-size: 11px; font-weight: 500; background: rgba(168,85,247,0.15); color: #a78bfa; padding: 3px 10px; border-radius: 20px; border: 1px solid rgba(168,85,247,0.2); margin-left: 4px; }
                .nav-right { display: flex; align-items: center; gap: 16px; }
                .nav-user { font-size: 13px; color: rgba(255,255,255,0.4); }
                .nav-user strong { color: #f5f5f7; }
                .nav-btn { font-size: 13px; font-weight: 500; color: #4da3ff; background: none; border: none; cursor: pointer; font-family: 'Inter', sans-serif; }
                .main { max-width: 1300px; margin: 0 auto; padding: 36px 32px 80px; }
                .dash-header { margin-bottom: 32px; }
                .dash-title { font-size: 28px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.8px; margin-bottom: 4px; }
                .dash-sub { font-size: 14px; color: rgba(255,255,255,0.35); }

                .alert-banner { background: rgba(180,83,9,0.1); border: 1px solid rgba(180,83,9,0.25); border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 28px; }
                .alert-left { display: flex; align-items: center; gap: 12px; }
                .alert-icon { width: 38px; height: 38px; background: rgba(180,83,9,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
                .alert-text { font-size: 14px; font-weight: 500; color: #fbbf24; }
                .alert-sub { font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 2px; }
                .alert-btn { background: rgba(180,83,9,0.2); color: #fbbf24; border: 1px solid rgba(180,83,9,0.3); border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; white-space: nowrap; transition: all 0.15s; }
                .alert-btn:hover { background: rgba(180,83,9,0.3); }

                .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 32px; }
                .stat-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 20px; position: relative; overflow: hidden; }
                .stat-card::before { content: ''; position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; border-radius: 50%; opacity: 0.08; }
                .stat-card.blue::before   { background: #0071e3; }
                .stat-card.green::before  { background: #1a7f4b; }
                .stat-card.orange::before { background: #b45309; }
                .stat-card.purple::before { background: #7c3aed; }
                .stat-card.pink::before   { background: #db2777; }
                .stat-icon { font-size: 20px; margin-bottom: 10px; }
                .stat-label { font-size: 12px; color: rgba(255,255,255,0.35); font-weight: 500; margin-bottom: 6px; }
                .stat-value { font-size: 26px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.8px; line-height: 1; margin-bottom: 4px; }
                .stat-sub { font-size: 12px; color: rgba(255,255,255,0.22); }

                .tabs { display: flex; gap: 2px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 4px; width: fit-content; margin-bottom: 24px; }
                .tab { padding: 9px 20px; border-radius: 9px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; background: none; color: rgba(255,255,255,0.4); font-family: 'Inter', sans-serif; transition: all 0.15s; }
                .tab.active { background: #1a1a1a; color: #f5f5f7; box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
                .tab:hover:not(.active) { color: rgba(255,255,255,0.7); }

                .section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
                .section-title { font-size: 16px; font-weight: 600; color: #f5f5f7; letter-spacing: -0.3px; display: flex; align-items: center; gap: 8px; }
                .count-badge { font-size: 12px; font-weight: 600; background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); padding: 2px 8px; border-radius: 20px; }
                .add-btn { background: linear-gradient(135deg,#7c3aed,#6d28d9); color: #fff; border: none; border-radius: 10px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; box-shadow: 0 2px 10px rgba(124,58,237,0.2); }
                .add-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(124,58,237,0.3); }

                .vendors-grid { display: flex; flex-direction: column; gap: 10px; }
                .vendor-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 18px 20px; display: flex; align-items: center; gap: 16px; transition: border-color 0.15s; }
                .vendor-card:hover { border-color: rgba(255,255,255,0.12); }
                .vendor-avatar { width: 44px; height: 44px; background: linear-gradient(135deg,rgba(77,163,255,0.3),rgba(0,113,227,0.3)); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #4da3ff; flex-shrink: 0; border: 1px solid rgba(77,163,255,0.15); }
                .vendor-info { flex: 1; min-width: 0; }
                .vendor-name { font-size: 15px; font-weight: 600; color: #f5f5f7; margin-bottom: 3px; }
                .vendor-meta { font-size: 12px; color: rgba(255,255,255,0.3); }
                .vendor-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
                .status-pill { font-size: 12px; font-weight: 500; padding: 4px 12px; border-radius: 20px; text-transform: capitalize; white-space: nowrap; }
                .status-pill.approved  { background: rgba(26,127,75,0.15); color: #4ade80; }
                .status-pill.pending   { background: rgba(180,83,9,0.15); color: #fbbf24; }
                .status-pill.suspended { background: rgba(220,38,38,0.15); color: #f87171; }
                .action-btn { font-size: 12px; font-weight: 500; padding: 7px 14px; border-radius: 8px; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; border: 1px solid transparent; white-space: nowrap; }
                .approve-btn { background: rgba(26,127,75,0.15); color: #4ade80; border-color: rgba(26,127,75,0.25); }
                .approve-btn:hover { background: rgba(26,127,75,0.25); }
                .suspend-btn { background: rgba(220,38,38,0.1); color: #f87171; border-color: rgba(220,38,38,0.2); }
                .suspend-btn:hover { background: rgba(220,38,38,0.2); }

                .products-table { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; overflow: hidden; }
                .table { width: 100%; border-collapse: collapse; }
                .table th { padding: 13px 16px; text-align: left; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.25); letter-spacing: 0.5px; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); }
                .table td { padding: 14px 16px; font-size: 14px; color: #f5f5f7; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; }
                .table tr:last-child td { border-bottom: none; }
                .table tr:hover td { background: rgba(255,255,255,0.02); }
                .product-cell { display: flex; align-items: center; gap: 12px; }
                .product-thumb { width: 40px; height: 40px; border-radius: 8px; background: #1a1a1a; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); }
                .product-thumb img { width: 100%; height: 100%; object-fit: cover; }
                .product-name { font-weight: 500; color: #f5f5f7; }
                .empty-state { text-align: center; padding: 48px; color: rgba(255,255,255,0.25); font-size: 14px; }
                .discount-pill { font-size: 11px; font-weight: 600; background: rgba(26,127,75,0.15); color: #4ade80; padding: 3px 9px; border-radius: 6px; }

                /* ── Coupon cards ── */
                .coupon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
                .coupon-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 20px; transition: border-color 0.15s; position: relative; overflow: hidden; }
                .coupon-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg,#7c3aed,#a855f7); }
                .coupon-card:hover { border-color: rgba(168,85,247,0.2); }
                .coupon-card.inactive { opacity: 0.5; }
                .coupon-code-text { font-size: 18px; font-weight: 800; color: #f5f5f7; letter-spacing: 2px; margin-bottom: 6px; font-family: monospace; }
                .coupon-desc { font-size: 13px; color: rgba(255,255,255,0.4); margin-bottom: 14px; }
                .coupon-details { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
                .coupon-detail-pill { font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 20px; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.08); }
                .coupon-detail-pill.highlight { background: rgba(124,58,237,0.15); color: #a78bfa; border-color: rgba(124,58,237,0.2); }
                .coupon-footer { display: flex; align-items: center; justify-content: space-between; }
                .coupon-usage { font-size: 12px; color: rgba(255,255,255,0.3); }
                .coupon-actions { display: flex; gap: 8px; }

                /* ── Modal ── */
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 24px; backdrop-filter: blur(8px); }
                .modal { background: #141414; border: 1px solid rgba(255,255,255,0.1); border-radius: 22px; width: 100%; max-width: 480px; padding: 28px; box-shadow: 0 24px 80px rgba(0,0,0,0.6); max-height: 90vh; overflow-y: auto; }
                .modal-title { font-size: 18px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.4px; margin-bottom: 20px; }
                .modal-field { margin-bottom: 14px; }
                .modal-field label { display: block; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); margin-bottom: 7px; text-transform: uppercase; letter-spacing: 0.5px; }
                .modal-field input, .modal-field select { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 11px 14px; font-size: 14px; color: #f5f5f7; font-family: 'Inter', sans-serif; outline: none; transition: all 0.15s; }
                .modal-field input::placeholder { color: rgba(255,255,255,0.2); }
                .modal-field input:focus, .modal-field select:focus { background: rgba(255,255,255,0.09); border-color: rgba(168,85,247,0.5); box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
                .modal-field select option { background: #1a1a1a; color: #f5f5f7; }
                .modal-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .modal-error { background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.25); color: #f87171; border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }
                .modal-btns { display: flex; gap: 10px; margin-top: 6px; }
                .btn-primary { flex: 1; background: linear-gradient(135deg,#7c3aed,#6d28d9); color: #fff; border: none; border-radius: 12px; padding: 13px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; }
                .btn-primary:hover:not(:disabled) { transform: translateY(-1px); }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .btn-cancel { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 13px 20px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; }
                .btn-cancel:hover { background: rgba(255,255,255,0.1); }

                @media (max-width: 768px) {
    .main { padding: 20px 16px 60px; }
    .stats-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
    .stat-value { font-size: 20px; }
    .coupon-grid { grid-template-columns: 1fr; }
    .tabs { overflow-x: auto; width: 100%; }
    .vendor-card { flex-wrap: wrap; gap: 10px; }
    .vendor-actions { width: 100%; justify-content: flex-end; }
}
            `}</style>

            <div className="dash">
                <nav className="nav">
                    <div className="nav-inner">
                        <div className="logo" onClick={() => router.push("/store")}>
                            <div className="logo-mark">S</div>
                            <span className="logo-name">ShopX</span>
                            <span className="nav-badge">Admin</span>
                        </div>
                        <div className="nav-right">
                            {user && <span className="nav-user"><strong>{user.name}</strong></span>}
                            <button className="nav-btn" onClick={() => router.push("/store")}>← Store</button>
                            <button className="nav-btn" onClick={logout}>Sign out</button>
                        </div>
                    </div>
                </nav>

                <div className="main">
                    <div className="dash-header">
                        <h1 className="dash-title">Admin Dashboard</h1>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <p className="dash-sub">Manage vendors, products, coupons and platform activity</p>
    <button onClick={() => fetchAll()} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all 0.15s" }}
        onMouseEnter={e => e.target.style.color = "#f5f5f7"}
        onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.5)"}
    >
        ↻ Refresh
    </button>
                 </div>
                    </div>

                    {pendingVendors.length > 0 && (
                        <div className="alert-banner">
                            <div className="alert-left">
                                <div className="alert-icon">⚠</div>
                                <div>
                                    <div className="alert-text">{pendingVendors.length} vendor{pendingVendors.length > 1 ? "s" : ""} pending approval</div>
                                    <div className="alert-sub">Review and approve vendor applications</div>
                                </div>
                            </div>
                            <button className="alert-btn" onClick={() => setTab("pending")}>Review now →</button>
                        </div>
                    )}

                    <div className="stats-grid">
                        <div className="stat-card blue">
                            <div className="stat-icon">🏪</div>
                            <div className="stat-label">Total vendors</div>
                            <div className="stat-value">{vendors.length}</div>
                            <div className="stat-sub">{approvedVendors.length} approved</div>
                        </div>
                        <div className="stat-card orange">
                            <div className="stat-icon">⏳</div>
                            <div className="stat-label">Pending</div>
                            <div className="stat-value">{pendingVendors.length}</div>
                            <div className="stat-sub">need review</div>
                        </div>
                        <div className="stat-card green">
                            <div className="stat-icon">📦</div>
                            <div className="stat-label">Products</div>
                            <div className="stat-value">{products.length}</div>
                            <div className="stat-sub">{discountedProducts.length} on discount</div>
                        </div>
                        <div className="stat-card purple">
                            <div className="stat-icon">💰</div>
                            <div className="stat-label">Platform value</div>
                            <div className="stat-value">₹{(totalValue / 1000).toFixed(0)}k</div>
                            <div className="stat-sub">total listing value</div>
                        </div>
                        <div className="stat-card pink">
                            <div className="stat-icon">🏷</div>
                            <div className="stat-label">Coupons</div>
                            <div className="stat-value">{activeCoupons.length}</div>
                            <div className="stat-sub">{coupons.length} total</div>
                        </div>
                    </div>

                    <div className="tabs">
                        {[
                            { id: "vendors",  label: "Vendors" },
                            { id: "pending",  label: `Pending (${pendingVendors.length})` },
                            { id: "products", label: "Products" },
                            { id: "coupons",  label: "Coupons" },
                        ].map(t => (
                            <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Vendors tab ── */}
                    {tab === "vendors" && (
                        <div>
                            <div className="section-head">
                                <div className="section-title">All vendors <span className="count-badge">{vendors.length}</span></div>
                            </div>
                            <div className="vendors-grid">
                                {vendors.length === 0 ? (
                                    <div className="empty-state">No vendors yet</div>
                                ) : vendors.map((vendor) => (
                                    <div className="vendor-card" key={vendor.id}>
                                        <div className="vendor-avatar">{vendor.store_name?.[0]?.toUpperCase() || "V"}</div>
                                        <div className="vendor-info">
                                            <div className="vendor-name">{vendor.store_name}</div>
                                            <div className="vendor-meta">
                                                {vendor.slug} · Joined {new Date(vendor.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                            </div>
                                        </div>
                                        <div className="vendor-actions">
                                            <span className={`status-pill ${vendor.is_approved ? "approved" : vendor.is_active ? "pending" : "suspended"}`}>
                                                {vendor.is_approved ? "Approved" : vendor.is_active ? "Pending" : "Suspended"}
                                            </span>
                                            {!vendor.is_approved && (
                                                <button className="action-btn approve-btn" disabled={actionLoading === vendor.id + "_approve"} onClick={() => handleApprove(vendor.id)}>
                                                    {actionLoading === vendor.id + "_approve" ? "..." : "Approve"}
                                                </button>
                                            )}
                                            {vendor.is_approved && (
                                                <button className="action-btn suspend-btn" disabled={actionLoading === vendor.id + "_suspend"} onClick={() => handleSuspend(vendor.id)}>
                                                    {actionLoading === vendor.id + "_suspend" ? "..." : "Suspend"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Pending tab ── */}
                    {tab === "pending" && (
                        <div>
                            <div className="section-head">
                                <div className="section-title">Pending approval <span className="count-badge">{pendingVendors.length}</span></div>
                            </div>
                            <div className="vendors-grid">
                                {pendingVendors.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: 48, background: "#141414", borderRadius: 14, color: "rgba(255,255,255,0.25)", fontSize: 14 }}>
                                        🎉 All caught up — no pending vendors!
                                    </div>
                                ) : pendingVendors.map((vendor) => (
                                    <div className="vendor-card" key={vendor.id}>
                                        <div className="vendor-avatar">{vendor.store_name?.[0]?.toUpperCase() || "V"}</div>
                                        <div className="vendor-info">
                                            <div className="vendor-name">{vendor.store_name}</div>
                                            <div className="vendor-meta">
                                                Applied {new Date(vendor.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                {vendor.store_description && ` · "${vendor.store_description.slice(0, 60)}${vendor.store_description.length > 60 ? "..." : ""}"`}
                                            </div>
                                        </div>
                                        <div className="vendor-actions">
                                            <span className="status-pill pending">Pending</span>
                                            <button className="action-btn approve-btn" disabled={actionLoading === vendor.id + "_approve"} onClick={() => handleApprove(vendor.id)}>
                                                {actionLoading === vendor.id + "_approve" ? "Approving..." : "✓ Approve"}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Products tab ── */}
                    {tab === "products" && (
                        <div>
                            <div className="section-head">
                                <div className="section-title">All products <span className="count-badge">{products.length}</span></div>
                            </div>
                            <div className="products-table">
                                {products.length === 0 ? (
                                    <div className="empty-state">No products yet</div>
                                ) : (
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>Category</th>
                                                <th>Price</th>
                                                <th>Discount</th>
                                                <th>Stock</th>
                                                <th>Vendor</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {products.map((p) => {
                                                const discounted = p.discount > 0 ? Math.round(p.price * (1 - p.discount / 100)) : null;
                                                return (
                                                    <tr key={p.id}>
                                                        <td>
                                                            <div className="product-cell">
                                                                <div className="product-thumb">
                                                                    {p.images?.[0] ? <img src={p.images[0]} alt={p.name} /> : "📦"}
                                                                </div>
                                                                <div className="product-name">{p.name}</div>
                                                            </div>
                                                        </td>
                                                        <td style={{ color: "#4da3ff", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{p.category}</td>
                                                        <td>
                                                            {discounted ? (
                                                                <div>
                                                                    <div style={{ textDecoration: "line-through", color: "rgba(255,255,255,0.25)", fontSize: 12 }}>₹{p.price.toLocaleString("en-IN")}</div>
                                                                    <div style={{ fontWeight: 600 }}>₹{discounted.toLocaleString("en-IN")}</div>
                                                                </div>
                                                            ) : `₹${p.price.toLocaleString("en-IN")}`}
                                                        </td>
                                                        <td>
                                                            {p.discount > 0
                                                                ? <span className="discount-pill">{p.discount}% off</span>
                                                                : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>
                                                            }
                                                        </td>
                                                        <td>
                                                            <span style={{
                                                                fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: 20,
                                                                background: p.stock === 0 ? "rgba(220,38,38,0.15)" : p.stock < 10 ? "rgba(180,83,9,0.15)" : "rgba(26,127,75,0.15)",
                                                                color: p.stock === 0 ? "#f87171" : p.stock < 10 ? "#fbbf24" : "#4ade80"
                                                            }}>
                                                                {p.stock === 0 ? "Out of stock" : p.stock < 10 ? `${p.stock} left` : `${p.stock} in stock`}
                                                            </span>
                                                        </td>
                                                        <td style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{p.vendor_id?.slice(-6).toUpperCase()}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Coupons tab ── */}
                    {tab === "coupons" && (
                        <div>
                            <div className="section-head">
                                <div className="section-title">Promo codes <span className="count-badge">{coupons.length}</span></div>
                                <button className="add-btn" onClick={() => setShowCouponModal(true)}>+ Create coupon</button>
                            </div>

                            {coupons.length === 0 ? (
                                <div style={{ textAlign: "center", padding: 60, background: "#141414", borderRadius: 16, color: "rgba(255,255,255,0.25)", fontSize: 14, border: "1px solid rgba(255,255,255,0.07)" }}>
                                    <div style={{ fontSize: 36, marginBottom: 12 }}>🏷</div>
                                    <div style={{ fontWeight: 600, color: "#f5f5f7", marginBottom: 6 }}>No coupons yet</div>
                                    Create your first promo code to offer discounts to customers
                                </div>
                            ) : (
                                <div className="coupon-grid">
                                    {coupons.map((c) => (
                                        <div className={`coupon-card ${!c.is_active ? "inactive" : ""}`} key={c.id}>
                                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                                                <div className="coupon-code-text">{c.code}</div>
                                                <span className={`status-pill ${c.is_active ? "approved" : "suspended"}`} style={{ fontSize: 11 }}>
                                                    {c.is_active ? "Active" : "Inactive"}
                                                </span>
                                            </div>
                                            {c.description && <div className="coupon-desc">{c.description}</div>}
                                            <div className="coupon-details">
                                                <span className="coupon-detail-pill highlight">
                                                    {c.discount_type === "percentage" ? `${c.discount_value}% off` : `₹${c.discount_value} flat`}
                                                </span>
                                                {c.min_order_amount > 0 && (
                                                    <span className="coupon-detail-pill">Min ₹{c.min_order_amount}</span>
                                                )}
                                                {c.max_uses && (
                                                    <span className="coupon-detail-pill">{c.used_count}/{c.max_uses} used</span>
                                                )}
                                                {c.expires_at && (
                                                    <span className="coupon-detail-pill">
                                                        Exp {new Date(c.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="coupon-footer">
                                                <div className="coupon-usage">
                                                    Used {c.used_count || 0} time{c.used_count !== 1 ? "s" : ""}
                                                </div>
                                                <div className="coupon-actions">
                                                    <button
                                                        className={`action-btn ${c.is_active ? "suspend-btn" : "approve-btn"}`}
                                                        onClick={() => handleToggleCoupon(c.code, c.is_active)}
                                                    >
                                                        {c.is_active ? "Disable" : "Enable"}
                                                    </button>
                                                    <button
                                                        className="action-btn suspend-btn"
                                                        onClick={() => handleDeleteCoupon(c.code)}
                                                        style={{ padding: "7px 10px" }}
                                                    >
                                                        🗑
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Create coupon modal ── */}
            {showCouponModal && (
                <div className="modal-overlay" onClick={() => setShowCouponModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">Create promo code</h2>
                        {couponError && <div className="modal-error">{couponError}</div>}
                        <form onSubmit={handleCreateCoupon}>
                            <div className="modal-field">
                                <label>Code</label>
                                <input
                                    value={couponForm.code}
                                    onChange={e => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})}
                                    placeholder="e.g. SAVE20"
                                    required
                                    style={{ letterSpacing: 2, fontWeight: 700 }}
                                />
                            </div>
                            <div className="modal-field">
                                <label>Description (optional)</label>
                                <input
                                    value={couponForm.description}
                                    onChange={e => setCouponForm({...couponForm, description: e.target.value})}
                                    placeholder="e.g. 20% off on all orders above ₹500"
                                />
                            </div>
                            <div className="modal-grid-2">
                                <div className="modal-field">
                                    <label>Discount type</label>
                                    <select value={couponForm.discount_type} onChange={e => setCouponForm({...couponForm, discount_type: e.target.value})}>
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="flat">Flat amount (₹)</option>
                                    </select>
                                </div>
                                <div className="modal-field">
                                    <label>Value</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={couponForm.discount_type === "percentage" ? "90" : undefined}
                                        value={couponForm.discount_value}
                                        onChange={e => setCouponForm({...couponForm, discount_value: e.target.value})}
                                        placeholder={couponForm.discount_type === "percentage" ? "20" : "100"}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-grid-2">
                                <div className="modal-field">
                                    <label>Min order amount (₹)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={couponForm.min_order_amount}
                                        onChange={e => setCouponForm({...couponForm, min_order_amount: e.target.value})}
                                        placeholder="0 = no minimum"
                                    />
                                </div>
                                <div className="modal-field">
                                    <label>Max uses</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={couponForm.max_uses}
                                        onChange={e => setCouponForm({...couponForm, max_uses: e.target.value})}
                                        placeholder="Leave blank = unlimited"
                                    />
                                </div>
                            </div>
                            <div className="modal-field">
                                <label>Expiry date (optional)</label>
                                <input
                                    type="date"
                                    value={couponForm.expires_at}
                                    onChange={e => setCouponForm({...couponForm, expires_at: e.target.value})}
                                    style={{ colorScheme: "dark" }}
                                />
                            </div>

                            {couponForm.discount_value && couponForm.discount_type === "percentage" && (
                                <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#a78bfa", marginBottom: 16 }}>
                                    🏷 Code <strong>{couponForm.code || "..."}</strong> gives {couponForm.discount_value}% off
                                    {couponForm.min_order_amount > 0 && ` on orders above ₹${couponForm.min_order_amount}`}
                                </div>
                            )}

                            <div className="modal-btns">
                                <button type="button" className="btn-cancel" onClick={() => { setShowCouponModal(false); setCouponError(""); }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={couponSaving}>
                                    {couponSaving ? "Creating..." : "Create coupon"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}