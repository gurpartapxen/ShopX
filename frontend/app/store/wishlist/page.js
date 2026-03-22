"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function WishlistPage() {
    const [wishlist, setWishlist] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && !user) router.push("/login");
    }, [user, authLoading]);

    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem("wishlist") || "[]");
        setWishlist(stored);
        setLoading(false);
    }, []);

    const removeFromWishlist = (productId) => {
        const updated = wishlist.filter(i => i.product_id !== productId);
        setWishlist(updated);
        localStorage.setItem("wishlist", JSON.stringify(updated));
    };

    const addToCart = (item) => {
        const cart = JSON.parse(localStorage.getItem("cart") || "[]");
        const existing = cart.find(c => c.product_id === item.product_id);
        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({ ...item, quantity: 1 });
        }
        localStorage.setItem("cart", JSON.stringify(cart));
        removeFromWishlist(item.product_id);
        router.push("/store/cart");
    };

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
                .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
                .card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; overflow: hidden; transition: all 0.22s; position: relative; }
                .card:hover { transform: translateY(-4px); box-shadow: 0 20px 56px rgba(0,0,0,0.5); border-color: rgba(255,255,255,0.14); }
                .card-img { width: 100%; height: 220px; background: #1a1a1a; display: flex; align-items: center; justify-content: center; font-size: 48px; overflow: hidden; cursor: pointer; }
                .card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
                .card:hover .card-img img { transform: scale(1.05); }
                .remove-btn { position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; color: rgba(255,255,255,0.6); transition: all 0.15s; }
                .remove-btn:hover { background: rgba(220,38,38,0.7); color: #fff; border-color: transparent; }
                .card-body { padding: 16px 18px 20px; }
                .card-cat { font-size: 11px; font-weight: 600; color: #4da3ff; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 5px; }
                .card-name { font-size: 15px; font-weight: 600; color: #f5f5f7; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .card-price { font-size: 17px; font-weight: 700; color: #f5f5f7; margin-bottom: 14px; }
                .card-price sup { font-size: 11px; vertical-align: super; }
                .add-cart-btn { width: 100%; background: rgba(0,113,227,0.15); color: #4da3ff; border: 1px solid rgba(0,113,227,0.25); border-radius: 10px; padding: 11px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; }
                .add-cart-btn:hover { background: #0071e3; color: #fff; border-color: transparent; }
                .empty { text-align: center; padding: 80px 24px; background: #141414; border-radius: 20px; border: 1px solid rgba(255,255,255,0.07); }
                .empty-icon { font-size: 48px; margin-bottom: 16px; }
                .empty-title { font-size: 20px; font-weight: 600; color: #f5f5f7; margin-bottom: 8px; }
                .empty-sub { font-size: 14px; color: rgba(255,255,255,0.35); margin-bottom: 24px; }
                .shop-btn { background: linear-gradient(135deg,#0071e3,#0056b3); color: #fff; border: none; border-radius: 12px; padding: 12px 28px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; }
                .shop-btn:hover { transform: translateY(-1px); }
                @media (max-width: 768px) {
    .container { padding: 24px 16px 60px; }
    .grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
    .card-img { height: 180px; }
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
                        <button className="back-btn" onClick={() => router.push("/store")}>← Store</button>
                    </div>
                </nav>

                <div className="container">
                    <h1 className="page-title">Wishlist ♡</h1>
                    <p className="page-sub">{wishlist.length === 0 ? "No saved items" : `${wishlist.length} saved item${wishlist.length > 1 ? "s" : ""}`}</p>

                    {wishlist.length === 0 ? (
                        <div className="empty">
                            <div className="empty-icon">♡</div>
                            <div className="empty-title">Your wishlist is empty</div>
                            <div className="empty-sub">Save products you love by tapping the heart icon</div>
                            <button className="shop-btn" onClick={() => router.push("/store")}>Discover products</button>
                        </div>
                    ) : (
                        <div className="grid">
                            {wishlist.map((item) => (
                                <div className="card" key={item.product_id}>
                                    <div className="card-img" onClick={() => router.push(`/store/product/${item.product_id}`)}>
                                        {item.image ? <img src={item.image} alt={item.name} /> : "📦"}
                                    </div>
                                    <button className="remove-btn" onClick={() => removeFromWishlist(item.product_id)} title="Remove">✕</button>
                                    <div className="card-body">
                                        <div className="card-cat">{item.category}</div>
                                        <div className="card-name">{item.name}</div>
                                        <div className="card-price"><sup>₹</sup>{item.price?.toLocaleString("en-IN")}</div>
                                        <button className="add-cart-btn" onClick={() => addToCart(item)}>
                                            Add to cart →
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}