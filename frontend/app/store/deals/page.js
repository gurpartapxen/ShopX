"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { productsAPI } from "@/lib/api";

export default function DealsPage() {
    const [products, setProducts] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [filter,   setFilter]   = useState("all");
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && !user) router.push("/login");
        fetchProducts();
    }, [user, authLoading]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await productsAPI.list({ limit: 100, has_discount: true });
            setProducts(res.data.data.products);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const dealCategories = [
        { id: "all",         label: "All Deals",       icon: "" },
        { id: "electronics", label: "Tech Deals",       icon: "" },
        { id: "clothing",    label: "Fashion",          icon: "" },
        { id: "shoes",       label: "Footwear",         icon: "" },
        { id: "accessories", label: "Accessories",      icon: "" },
        { id: "books",       label: "Books",            icon: "" },
    ];

    const filtered = filter === "all" ? products : products.filter(p => p.category === filter);

    const discountedPrice = (price, discount) =>
        discount > 0 ? Math.round(price * (1 - discount / 100)) : price;

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                body { background: #0a0a0a; }
                .page { min-height: 100vh; background: #0a0a0a; font-family: 'Inter', -apple-system, sans-serif; color: #f5f5f7; }
                .nav { background: rgba(10,10,10,0.9); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.07); position: sticky; top: 0; z-index: 100; }
                .nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 52px; display: flex; align-items: center; justify-content: space-between; }
                .logo { display: flex; align-items: center; gap: 8px; cursor: pointer; }
                .logo-mark { width: 28px; height: 28px; background: linear-gradient(135deg, #4da3ff, #0071e3); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #fff; }
                .logo-name { font-size: 15px; font-weight: 700; color: #f5f5f7; }
                .back-btn { font-size: 13px; color: #4da3ff; font-weight: 500; background: none; border: none; cursor: pointer; font-family: 'Inter', sans-serif; }
                .hero { background: linear-gradient(145deg, #1a0808 0%, #2d0a0a 40%, #0a0a0a 100%); padding: 64px 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06); position: relative; overflow: hidden; }
                .hero::before { content: ''; position: absolute; top: -80px; left: 50%; transform: translateX(-50%); width: 500px; height: 300px; background: radial-gradient(ellipse, rgba(220,38,38,0.12) 0%, transparent 70%); }
                .hero-eyebrow { font-size: 11px; font-weight: 600; color: #f87171; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 14px; position: relative; }
                .hero-title { font-size: 52px; font-weight: 800; color: #f5f5f7; letter-spacing: -2px; margin-bottom: 12px; position: relative; }
                .hero-sub { font-size: 16px; color: rgba(255,255,255,0.4); max-width: 380px; margin: 0 auto 24px; font-weight: 300; position: relative; }
                .hero-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(220,38,38,0.15); border: 1px solid rgba(220,38,38,0.3); border-radius: 20px; padding: 6px 16px; font-size: 13px; color: #fca5a5; font-weight: 500; position: relative; }
                .deal-cats { background: #0d0d0d; border-bottom: 1px solid rgba(255,255,255,0.06); padding: 0 24px; }
                .deal-cats-inner { max-width: 1200px; margin: 0 auto; display: flex; gap: 8px; padding: 12px 0; overflow-x: auto; scrollbar-width: none; }
                .deal-cats-inner::-webkit-scrollbar { display: none; }
                .deal-cat { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.45); font-family: 'Inter', sans-serif; transition: all 0.15s; white-space: nowrap; }
                .deal-cat:hover { background: rgba(255,255,255,0.08); color: #f5f5f7; }
                .deal-cat.active { background: rgba(220,38,38,0.15); color: #f87171; border-color: rgba(220,38,38,0.35); }
                .container { max-width: 1200px; margin: 0 auto; padding: 40px 24px 80px; }
                .section-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 24px; }
                .section-title { font-size: 22px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.5px; }
                .section-meta { font-size: 13px; color: rgba(255,255,255,0.3); }
                .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
                .card { background: #141414; border-radius: 18px; overflow: hidden; cursor: pointer; transition: all 0.22s; border: 1px solid rgba(255,255,255,0.07); position: relative; }
                .card:hover { transform: translateY(-5px); box-shadow: 0 20px 56px rgba(0,0,0,0.5); border-color: rgba(255,255,255,0.14); }
                .card-img { width: 100%; height: 220px; background: #1a1a1a; display: flex; align-items: center; justify-content: center; font-size: 52px; overflow: hidden; }
                .card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
                .card:hover .card-img img { transform: scale(1.06); }
                .deal-badge { position: absolute; top: 12px; left: 12px; background: linear-gradient(135deg, #dc2626, #b91c1c); color: #fff; font-size: 10px; font-weight: 700; padding: 4px 9px; border-radius: 6px; }
                .discount-badge { position: absolute; top: 12px; right: 12px; background: rgba(26,127,75,0.9); color: #fff; font-size: 10px; font-weight: 700; padding: 4px 9px; border-radius: 6px; }
                .card-body { padding: 16px 18px 20px; }
                .card-cat { font-size: 11px; font-weight: 600; color: #4da3ff; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 5px; }
                .card-name { font-size: 15px; font-weight: 600; color: #f5f5f7; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .card-desc { font-size: 12px; color: rgba(255,255,255,0.32); line-height: 1.5; margin-bottom: 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 36px; }
                .card-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
                .card-price-wrap { display: flex; flex-direction: column; gap: 1px; }
                .card-price-original { font-size: 11px; color: rgba(255,255,255,0.25); text-decoration: line-through; }
                .card-price { font-size: 17px; font-weight: 700; color: #f5f5f7; }
                .card-price sup { font-size: 11px; vertical-align: super; }
                .savings { font-size: 11px; color: #4ade80; font-weight: 600; margin-top: 2px; }
                .stock { font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 20px; flex-shrink: 0; }
                .stock.in  { background: rgba(26,127,75,0.15); color: #4ade80; }
                .stock.low { background: rgba(180,83,9,0.15); color: #fbbf24; }
                .stock.out { background: rgba(192,57,43,0.15); color: #f87171; }
                .skel-card { background: #141414; border-radius: 18px; overflow: hidden; border: 1px solid rgba(255,255,255,0.07); }
                .skel { background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
                @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
                .empty { grid-column: 1/-1; text-align: center; padding: 80px 20px; background: #141414; border-radius: 18px; border: 1px solid rgba(255,255,255,0.06); }
                .empty-icon { font-size: 40px; margin-bottom: 16px; }
                .empty-h { font-size: 17px; font-weight: 600; color: #f5f5f7; margin-bottom: 6px; }
                .empty-p { font-size: 14px; color: rgba(255,255,255,0.3); }
            `}</style>

            <div className="page">
                <nav className="nav">
                    <div className="nav-inner">
                        <div className="logo" onClick={() => router.push("/store")}>
                            <div className="logo-mark">S</div>
                            <span className="logo-name">ShopX</span>
                        </div>
                        <button className="back-btn" onClick={() => router.push("/store")}>← Back to Store</button>
                    </div>
                </nav>

                <div className="hero">
                    <div className="hero-eyebrow">Limited time offers</div>
                    <h1 className="hero-title">Hot Deals </h1>
                    <p className="hero-sub">Discounted products — save big on your favourites</p>
                    <div className="hero-badge">⚡ Discounts up to 90% off!</div>
                </div>

                <div className="deal-cats">
                    <div className="deal-cats-inner">
                        {dealCategories.map((cat) => (
                            <button key={cat.id} className={`deal-cat ${filter === cat.id ? "active" : ""}`} onClick={() => setFilter(cat.id)}>
                                {cat.icon} {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="container">
                    <div className="section-head">
                        <h2 className="section-title">{filter === "all" ? "All deals" : dealCategories.find(c => c.id === filter)?.label}</h2>
                        <span className="section-meta">{loading ? "Loading..." : `${filtered.length} deals`}</span>
                    </div>
                    <div className="grid">
                        {loading ? (
                            [...Array(8)].map((_, i) => (
                                <div className="skel-card" key={i}>
                                    <div className="skel" style={{ height: 220, borderRadius: 0 }} />
                                    <div style={{ padding: 18 }}>
                                        <div className="skel" style={{ height: 10, width: "35%", marginBottom: 10 }} />
                                        <div className="skel" style={{ height: 15, width: "75%", marginBottom: 8 }} />
                                        <div className="skel" style={{ height: 11, width: "100%", marginBottom: 18 }} />
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <div className="skel" style={{ height: 18, width: "28%" }} />
                                            <div className="skel" style={{ height: 22, width: "22%", borderRadius: 20 }} />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : filtered.length === 0 ? (
                            <div className="empty">
                                <div className="empty-icon">🎉</div>
                                <div className="empty-h">No deals right now</div>
                                <div className="empty-p">Vendors haven't added discounts yet. Check back soon!</div>
                            </div>
                        ) : (
                            filtered.map((p) => (
                                <div className="card" key={p.id} onClick={() => router.push(`/store/product/${p.id}`)}>
                                    <div className="card-img">
                                        {p.images?.[0] ? <img src={p.images[0]} alt={p.name} /> : ""}
                                    </div>
                                    <div className="deal-badge"> DEAL</div>
                                    {p.discount > 0 && <div className="discount-badge">{p.discount}% off</div>}
                                    <div className="card-body">
                                        <div className="card-cat">{p.category}</div>
                                        <div className="card-name">{p.name}</div>
                                        <div className="card-desc">{p.description || "No description available"}</div>
                                        <div className="card-foot">
                                            <div className="card-price-wrap">
                                                {p.discount > 0 && <div className="card-price-original">₹{p.price.toLocaleString("en-IN")}</div>}
                                                <div className="card-price"><sup>₹</sup>{discountedPrice(p.price, p.discount).toLocaleString("en-IN")}</div>
                                                {p.discount > 0 && <div className="savings">You save ₹{(p.price - discountedPrice(p.price, p.discount)).toLocaleString("en-IN")}</div>}
                                            </div>
                                            <span className={`stock ${p.stock === 0 ? "out" : p.stock < 10 ? "low" : "in"}`}>
                                                {p.stock === 0 ? "Out of stock" : p.stock < 10 ? `${p.stock} left` : "In stock"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}