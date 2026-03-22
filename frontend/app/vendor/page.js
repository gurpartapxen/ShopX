"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { vendorsAPI, productsAPI, ordersAPI } from "@/lib/api";

export default function VendorDashboard() {
    const [vendor,   setVendor]   = useState(null);
    const [products, setProducts] = useState([]);
    const [orders,   setOrders]   = useState([]);
    const [tab,      setTab]      = useState("overview");
    const [loading,  setLoading]  = useState(true);
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [productForm, setProductForm] = useState({
        name: "", description: "", price: "", discount: "", category: "", quantity: "",
        imageFile: null, imagePreview: ""
    });
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState("");

    const { user, logout, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.push("/login"); return; }
        if (user.role !== "vendor") { router.push("/store"); return; }
        fetchAll();
    }, [user, authLoading]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [vendorRes, ordersRes] = await Promise.all([
                vendorsAPI.myProfile(),
                ordersAPI.vendorOrders(),
            ]);
            setVendor(vendorRes.data.data);
            setOrders(ordersRes.data.data.orders);
            const vendorId = vendorRes.data.data.id;
            const productsRes = await productsAPI.list({ vendor_id: vendorId });
            const prods = productsRes.data.data.products;
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
        } finally {
            setLoading(false);
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            let imageUrl = "";
            if (productForm.imageFile) {
                const formData = new FormData();
                formData.append("image", productForm.imageFile);
                const uploadRes = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/products/upload-image/`,
                    {
                        method: "POST",
                        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
                        body: formData,
                    }
                );
                const uploadData = await uploadRes.json();
                if (uploadData.success) imageUrl = uploadData.data.url;
            }

            await productsAPI.create({
                name:        productForm.name,
                description: productForm.description,
                price:       productForm.price,
                discount:    productForm.discount || 0,
                category:    productForm.category,
                images:      imageUrl ? [imageUrl] : [],
                quantity:    productForm.quantity || 0,
            });

            setShowAddProduct(false);
            setProductForm({ name: "", description: "", price: "", discount: "", category: "", quantity: "", imageFile: null, imagePreview: "" });
            fetchAll();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create product");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateInventory = async (productId, quantity) => {
        try {
            await productsAPI.updateInventory(productId, { quantity: parseInt(quantity) });
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const handleUpdateOrderStatus = async (orderId, status) => {
        try {
            await ordersAPI.updateStatus(orderId, { status });
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const totalRevenue = orders
        .filter(o => o.payment_status === "paid")
        .reduce((sum, o) => sum + o.total, 0);

    const statusStyle = (status) => {
        switch(status) {
            case "processing": return { bg: "rgba(180,83,9,0.15)",  color: "#fbbf24" };
            case "shipped":    return { bg: "rgba(0,113,227,0.15)", color: "#4da3ff" };
            case "delivered":  return { bg: "rgba(26,127,75,0.15)", color: "#4ade80" };
            case "cancelled":  return { bg: "rgba(220,38,38,0.15)", color: "#f87171" };
            default:           return { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" };
        }
    };

    if (authLoading || loading) return (
        <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif", fontSize: 14 }}>
            Loading dashboard...
        </div>
    );

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                body { background: #0a0a0a; }
                .dash { min-height: 100vh; background: #0a0a0a; font-family: 'Inter', -apple-system, sans-serif; color: #f5f5f7; }

                /* ── Nav ── */
                .nav { background: rgba(10,10,10,0.9); backdrop-filter: saturate(180%) blur(20px); border-bottom: 1px solid rgba(255,255,255,0.07); position: sticky; top: 0; z-index: 100; }
                .nav-inner { max-width: 1300px; margin: 0 auto; padding: 0 32px; height: 52px; display: flex; align-items: center; justify-content: space-between; }
                .logo { display: flex; align-items: center; gap: 9px; cursor: pointer; }
                .logo-mark { width: 30px; height: 30px; background: linear-gradient(135deg,#4da3ff,#0071e3); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #fff; box-shadow: 0 2px 10px rgba(0,113,227,0.3); }
                .logo-name { font-size: 16px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.4px; }
                .nav-badge { font-size: 11px; font-weight: 500; background: rgba(0,113,227,0.15); color: #4da3ff; padding: 3px 10px; border-radius: 20px; border: 1px solid rgba(0,113,227,0.2); margin-left: 4px; }
                .nav-right { display: flex; align-items: center; gap: 16px; }
                .nav-user { font-size: 13px; color: rgba(255,255,255,0.4); }
                .nav-user strong { color: #f5f5f7; }
                .nav-btn { font-size: 13px; font-weight: 500; color: #4da3ff; background: none; border: none; cursor: pointer; font-family: 'Inter', sans-serif; transition: opacity 0.15s; }
                .nav-btn:hover { opacity: 0.7; }

                /* ── Main ── */
                .main { max-width: 1300px; margin: 0 auto; padding: 36px 32px 80px; }
                .dash-header { margin-bottom: 32px; }
                .dash-title { font-size: 28px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.8px; margin-bottom: 4px; }
                .dash-sub { font-size: 14px; color: rgba(255,255,255,0.35); }

                .warning-banner { background: rgba(180,83,9,0.1); border: 1px solid rgba(180,83,9,0.25); border-radius: 14px; padding: 14px 18px; font-size: 13px; color: #fbbf24; margin-bottom: 28px; display: flex; align-items: center; gap: 10px; }

                /* ── Stats ── */
                .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
                .stat-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 22px; position: relative; overflow: hidden; }
                .stat-card::before { content: ''; position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; border-radius: 50%; opacity: 0.08; }
                .stat-card.blue::before   { background: #0071e3; }
                .stat-card.green::before  { background: #1a7f4b; }
                .stat-card.purple::before { background: #7c3aed; }
                .stat-card.orange::before { background: #b45309; }
                .stat-icon { font-size: 20px; margin-bottom: 12px; }
                .stat-label { font-size: 12px; color: rgba(255,255,255,0.35); font-weight: 500; margin-bottom: 6px; }
                .stat-value { font-size: 28px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.8px; line-height: 1; margin-bottom: 4px; }
                .stat-sub { font-size: 12px; color: rgba(255,255,255,0.22); }

                /* ── Tabs ── */
                .tabs { display: flex; gap: 2px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 4px; width: fit-content; margin-bottom: 28px; }
                .tab { padding: 9px 20px; border-radius: 9px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; background: none; color: rgba(255,255,255,0.4); font-family: 'Inter', sans-serif; transition: all 0.15s; }
                .tab.active { background: #1a1a1a; color: #f5f5f7; box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
                .tab:hover:not(.active) { color: rgba(255,255,255,0.7); }

                /* ── Section head ── */
                .section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
                .section-title { font-size: 16px; font-weight: 600; color: #f5f5f7; letter-spacing: -0.3px; }
                .add-btn { background: linear-gradient(135deg,#0071e3,#0056b3); color: #fff; border: none; border-radius: 10px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; box-shadow: 0 2px 10px rgba(0,113,227,0.2); }
                .add-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,113,227,0.3); }

                /* ── Table ── */
                .table-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow: hidden; margin-bottom: 32px; }
                .table { width: 100%; border-collapse: collapse; }
                .table th { padding: 13px 16px; text-align: left; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.25); letter-spacing: 0.5px; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); }
                .table td { padding: 14px 16px; font-size: 14px; color: #f5f5f7; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; }
                .table tr:last-child td { border-bottom: none; }
                .table tr:hover td { background: rgba(255,255,255,0.02); }

                .product-cell { display: flex; align-items: center; gap: 12px; }
                .product-thumb { width: 42px; height: 42px; border-radius: 10px; background: #1a1a1a; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); }
                .product-thumb img { width: 100%; height: 100%; object-fit: cover; }
                .product-name-text { font-weight: 500; color: #f5f5f7; }
                .product-cat-text { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 2px; }

                .discount-pill { font-size: 11px; font-weight: 600; background: rgba(26,127,75,0.15); color: #4ade80; padding: 3px 9px; border-radius: 6px; border: 1px solid rgba(26,127,75,0.2); }

                .qty-input { width: 72px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 7px 10px; font-size: 14px; color: #f5f5f7; font-family: 'Inter', sans-serif; outline: none; text-align: center; transition: all 0.15s; }
                .qty-input:focus { border-color: rgba(77,163,255,0.5); background: rgba(255,255,255,0.08); }
                .update-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 7px 12px; font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.6); cursor: pointer; font-family: 'Inter', sans-serif; margin-left: 8px; transition: all 0.15s; }
                .update-btn:hover { background: rgba(255,255,255,0.1); color: #f5f5f7; }

                .stock-pill { font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 20px; }
                .stock-pill.in  { background: rgba(26,127,75,0.15);  color: #4ade80; }
                .stock-pill.low { background: rgba(180,83,9,0.15);   color: #fbbf24; }
                .stock-pill.out { background: rgba(220,38,38,0.15);  color: #f87171; }

                /* ── Orders ── */
                .orders-list { display: flex; flex-direction: column; gap: 12px; }
                .order-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 18px 20px; transition: border-color 0.15s; }
                .order-card:hover { border-color: rgba(255,255,255,0.12); }
                .order-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
                .order-id { font-size: 14px; font-weight: 600; color: #f5f5f7; }
                .order-date { font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 2px; }
                .order-right { display: flex; align-items: center; gap: 10px; }
                .status-select { border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 7px 12px; font-size: 13px; font-family: 'Inter', sans-serif; outline: none; cursor: pointer; appearance: none; transition: all 0.15s; }
                .order-total { font-size: 15px; font-weight: 700; color: #f5f5f7; }
                .order-items-row { display: flex; flex-wrap: wrap; gap: 8px; }
                .order-item-pill { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 6px 12px; font-size: 12px; color: rgba(255,255,255,0.7); display: flex; align-items: center; gap: 6px; }
                .order-item-pill span { color: rgba(255,255,255,0.3); }

                /* ── Modal ── */
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 24px; overflow-y: auto; backdrop-filter: blur(8px); }
                .modal { background: #141414; border: 1px solid rgba(255,255,255,0.1); border-radius: 22px; width: 100%; max-width: 480px; padding: 28px; box-shadow: 0 24px 80px rgba(0,0,0,0.6); margin: auto; }
                .modal-title { font-size: 18px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.4px; margin-bottom: 20px; }
                .field { margin-bottom: 14px; }
                .field label { display: block; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); margin-bottom: 7px; text-transform: uppercase; letter-spacing: 0.5px; }
                .field input, .field select, .field textarea { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 11px 14px; font-size: 14px; color: #f5f5f7; font-family: 'Inter', sans-serif; outline: none; transition: all 0.15s; resize: none; }
                .field input::placeholder, .field textarea::placeholder { color: rgba(255,255,255,0.2); }
                .field input:focus, .field select:focus, .field textarea:focus { background: rgba(255,255,255,0.09); border-color: rgba(77,163,255,0.5); box-shadow: 0 0 0 3px rgba(0,113,227,0.1); }
                .field select option { background: #1a1a1a; color: #f5f5f7; }
                .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .discount-hint { font-size: 12px; color: #4ade80; margin-top: 5px; display: flex; align-items: center; gap: 5px; }
                .upload-zone { border: 2px dashed rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; background: rgba(255,255,255,0.02); transition: all 0.15s; }
                .upload-zone:hover { border-color: rgba(77,163,255,0.4); background: rgba(0,113,227,0.05); }
                .modal-error { background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.25); color: #f87171; border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }
                .modal-btns { display: flex; gap: 10px; margin-top: 6px; }
                .btn-save { flex: 1; background: linear-gradient(135deg,#0071e3,#0056b3); color: #fff; border: none; border-radius: 12px; padding: 13px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; box-shadow: 0 2px 12px rgba(0,113,227,0.2); }
                .btn-save:hover:not(:disabled) { transform: translateY(-1px); }
                .btn-save:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .btn-cancel { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 13px 20px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; }
                .btn-cancel:hover { background: rgba(255,255,255,0.1); color: #f5f5f7; }
                .empty-state { text-align: center; padding: 48px 24px; color: rgba(255,255,255,0.25); font-size: 14px; }

                @media (max-width: 768px) {
    .main { padding: 20px 16px 60px; }
    .stats-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
    .stat-value { font-size: 22px; }
    .table th, .table td { padding: 10px 10px; font-size: 12px; }
    .qty-input { width: 56px; }
    .tabs { width: 100%; overflow-x: auto; }
}
@media (max-width: 480px) {
    .stats-grid { grid-template-columns: 1fr 1fr; }
}
            `}</style>

            <div className="dash">
                <nav className="nav">
                    <div className="nav-inner">
                        <div className="logo" onClick={() => router.push("/store")}>
                            <div className="logo-mark">S</div>
                            <span className="logo-name">ShopX</span>
                            <span className="nav-badge">Vendor</span>
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
                        <h1 className="dash-title">{vendor?.store_name || "Your Store"}</h1>
                        <p className="dash-sub">Manage your products, inventory and orders</p>
                    </div>

                    {vendor && !vendor.is_approved && (
                        <div className="warning-banner">
                            ⚠ Your store is pending admin approval. Products won't be visible until approved.
                        </div>
                    )}

                    <div className="stats-grid">
                        <div className="stat-card blue">
                            <div className="stat-icon">📦</div>
                            <div className="stat-label">Total products</div>
                            <div className="stat-value">{products.length}</div>
                            <div className="stat-sub">in your store</div>
                        </div>
                        <div className="stat-card green">
                            <div className="stat-icon">🛒</div>
                            <div className="stat-label">Total orders</div>
                            <div className="stat-value">{orders.length}</div>
                            <div className="stat-sub">all time</div>
                        </div>
                        <div className="stat-card purple">
                            <div className="stat-icon">💰</div>
                            <div className="stat-label">Revenue</div>
                            <div className="stat-value">₹{(totalRevenue / 1000).toFixed(1)}k</div>
                            <div className="stat-sub">from paid orders</div>
                        </div>
                        <div className="stat-card orange">
                            <div className="stat-icon">⏳</div>
                            <div className="stat-label">Pending orders</div>
                            <div className="stat-value">{orders.filter(o => o.status === "processing").length}</div>
                            <div className="stat-sub">need attention</div>
                        </div>
                    </div>

                    <div className="tabs">
                        {["overview", "products", "orders"].map(t => (
                            <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>

                    {(tab === "products" || tab === "overview") && (
                        <div>
                            <div className="section-head">
                                <h2 className="section-title">Products</h2>
                                <button className="add-btn" onClick={() => setShowAddProduct(true)}>+ Add product</button>
                            </div>
                            <div className="table-card">
                                {products.length === 0 ? (
                                    <div className="empty-state">No products yet — add your first product!</div>
                                ) : (
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>Price</th>
                                                <th>Discount</th>
                                                <th>Stock</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {products.map((p) => (
                                                <ProductRow key={p.id} product={p} onUpdateInventory={handleUpdateInventory} />
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {(tab === "orders" || tab === "overview") && (
                        <div>
                            <div className="section-head">
                                <h2 className="section-title">Orders</h2>
                            </div>
                            {orders.length === 0 ? (
                                <div className="table-card"><div className="empty-state">No orders yet</div></div>
                            ) : (
                                <div className="orders-list">
                                    {orders.map((order) => {
                                        const colors = statusStyle(order.status);
                                        const date = new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                                        return (
                                            <div className="order-card" key={order.id}>
                                                <div className="order-top">
                                                    <div>
                                                        <div className="order-id">Order #{order.id.slice(-8).toUpperCase()}</div>
                                                        <div className="order-date">{date}</div>
                                                    </div>
                                                    <div className="order-right">
                                                        <select
                                                            className="status-select"
                                                            value={order.status}
                                                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                                            style={{ background: colors.bg, color: colors.color }}
                                                        >
                                                            <option value="processing">Processing</option>
                                                            <option value="shipped">Shipped</option>
                                                            <option value="delivered">Delivered</option>
                                                            <option value="cancelled">Cancelled</option>
                                                        </select>
                                                        <div className="order-total">₹{order.total.toLocaleString("en-IN")}</div>
                                                    </div>
                                                </div>
                                                <div className="order-items-row">
                                                    {order.items.map((item, i) => (
                                                        <div className="order-item-pill" key={i}>
                                                            {item.name}<span>×{item.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showAddProduct && (
                <div className="modal-overlay" onClick={() => setShowAddProduct(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">Add new product</h2>
                        {error && <div className="modal-error">{error}</div>}
                        <form onSubmit={handleAddProduct}>
                            <div className="field">
                                <label>Product image</label>
                                <div className="upload-zone" onClick={() => document.getElementById("img-upload").click()}>
                                    {productForm.imagePreview ? (
                                        <img src={productForm.imagePreview} alt="preview" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 8 }} />
                                    ) : (
                                        <div>
                                            <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
                                            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Click to upload image</div>
                                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>PNG, JPG up to 5MB</div>
                                        </div>
                                    )}
                                    <input id="img-upload" type="file" accept="image/*" style={{ display: "none" }}
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) setProductForm({ ...productForm, imageFile: file, imagePreview: URL.createObjectURL(file) });
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="field">
                                <label>Product name</label>
                                <input value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="e.g. iPhone 15 Case" required />
                            </div>

                            <div className="field">
                                <label>Description</label>
                                <textarea rows={2} value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} placeholder="Brief product description..." />
                            </div>

                            <div className="field-row">
                                <div className="field">
                                    <label>Price (₹)</label>
                                    <input type="number" min="0" step="0.01" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} placeholder="999" required />
                                </div>
                                <div className="field">
                                    <label>Initial stock</label>
                                    <input type="number" min="0" value={productForm.quantity} onChange={e => setProductForm({...productForm, quantity: e.target.value})} placeholder="100" required />
                                </div>
                            </div>

                            <div className="field">
                                <label>Discount % (optional)</label>
                                <input type="number" min="0" max="90" value={productForm.discount} onChange={e => setProductForm({...productForm, discount: e.target.value})} placeholder="e.g. 20 for 20% off" />
                                {productForm.discount > 0 && productForm.price > 0 && (
                                    <div className="discount-hint">
                                        🎉 Selling at ₹{Math.round(productForm.price * (1 - productForm.discount / 100)).toLocaleString("en-IN")}
                                        {" — "}saving ₹{Math.round(productForm.price * productForm.discount / 100).toLocaleString("en-IN")}
                                    </div>
                                )}
                            </div>

                            <div className="field">
                                <label>Category</label>
                                <select value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} required>
                                    <option value="">Select category</option>
                                    <option value="electronics">Electronics</option>
                                    <option value="accessories">Accessories</option>
                                    <option value="clothing">Clothing</option>
                                    <option value="shoes">Shoes</option>
                                    <option value="books">Books</option>
                                </select>
                            </div>

                            <div className="modal-btns">
                                <button type="button" className="btn-cancel" onClick={() => {
                                    setShowAddProduct(false);
                                    setProductForm({ name: "", description: "", price: "", discount: "", category: "", quantity: "", imageFile: null, imagePreview: "" });
                                    setError("");
                                }}>Cancel</button>
                                <button type="submit" className="btn-save" disabled={saving}>
                                    {saving ? "Saving..." : "Add product"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

function ProductRow({ product, onUpdateInventory }) {
    const [qty, setQty] = useState(product.stock ?? 0);
    const stockStatus   = qty === 0 ? "out" : qty < 10 ? "low" : "in";
    const discounted    = product.discount > 0 ? Math.round(product.price * (1 - product.discount / 100)) : null;

    return (
        <tr>
            <td>
                <div className="product-cell">
                    <div className="product-thumb">
                        {product.images?.[0]
                            ? <img src={product.images[0]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : "📦"
                        }
                    </div>
                    <div>
                        <div className="product-name-text">{product.name}</div>
                        <div className="product-cat-text">{product.category}</div>
                    </div>
                </div>
            </td>
            <td>
                {discounted ? (
                    <div>
                        <div style={{ textDecoration: "line-through", color: "rgba(255,255,255,0.25)", fontSize: 12 }}>₹{product.price.toLocaleString("en-IN")}</div>
                        <div style={{ fontWeight: 600, color: "#f5f5f7" }}>₹{discounted.toLocaleString("en-IN")}</div>
                    </div>
                ) : (
                    <span>₹{product.price.toLocaleString("en-IN")}</span>
                )}
            </td>
            <td>
                {product.discount > 0
                    ? <span className="discount-pill">{product.discount}% off</span>
                    : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>
                }
            </td>
            <td>
                <div style={{ display: "flex", alignItems: "center" }}>
                    <input className="qty-input" type="number" min="0" value={qty} onChange={e => setQty(e.target.value)} />
                    <button className="update-btn" onClick={() => onUpdateInventory(product.id, qty)}>Update</button>
                </div>
            </td>
            <td>
                <span className={`stock-pill ${stockStatus}`}>
                    {qty === 0 ? "Out of stock" : qty < 10 ? "Low stock" : "In stock"}
                </span>
            </td>
        </tr>
    );
}