"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { productsAPI } from "@/lib/api";

// Receives productId + the server-fetched product from the Server Component
// wrapper (page.js). Seeding state with initialProduct lets the page render
// instantly and avoids re-fetching the same product the server already loaded.
export default function ProductPageClient({ productId, initialProduct = null }) {
    // Alias so the rest of the component is unchanged.
    const id = productId;

    const [product,    setProduct]    = useState(initialProduct);
    const [loading,    setLoading]    = useState(!initialProduct);
    const [imgIdx,     setImgIdx]     = useState(0);
    const [qty,        setQty]        = useState(1);
    const [inWishlist, setInWishlist] = useState(false);
    const [toast,      setToast]      = useState(null);

    const [reviews,        setReviews]        = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [reviewForm,     setReviewForm]     = useState({ rating: 0, comment: "" });
    const [hoverRating,    setHoverRating]    = useState(0);
    const [submitting,     setSubmitting]     = useState(false);
    const [reviewError,    setReviewError]    = useState("");
    const [hasReviewed,    setHasReviewed]    = useState(false);
    const [reviewPage,     setReviewPage]     = useState(1);
    const [reviewTotal,    setReviewTotal]    = useState(0);

    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && !user) router.push("/login");
    }, [user, authLoading]);

    useEffect(() => {
        // The server already provided the product; only fetch if it didn't.
        if (!initialProduct) fetchProduct();
        fetchReviews(1);
        const wl = JSON.parse(localStorage.getItem("wishlist") || "[]");
        setInWishlist(wl.some(i => i.product_id === id));
    }, [id]);

    const fetchProduct = async () => {
        try {
            const res = await productsAPI.getById(id);
            setProduct(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchReviews = async (page = 1) => {
        setReviewsLoading(true);
        try {
            const res = await productsAPI.getReviews(id, { page, limit: 5 });
            if (page === 1) {
                setReviews(res.data.data.reviews);
            } else {
                setReviews(prev => [...prev, ...res.data.data.reviews]);
            }
            setReviewTotal(res.data.data.total);
            setReviewPage(page);
            if (user) {
                const already = res.data.data.reviews.some(r => r.user_id === user.id);
                if (already) setHasReviewed(true);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setReviewsLoading(false);
        }
    };

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 2500);
    };

    const addToCart = () => {
        if (!product || product.stock === 0) return;
        const cart = JSON.parse(localStorage.getItem("cart") || "[]");
        const existing = cart.find(i => i.product_id === id);
        if (existing) {
            existing.quantity += qty;
        } else {
            cart.push({
                product_id: id,
                name:       product.name,
                price:      discountedPrice,
                image:      product.images?.[0] || "",
                category:   product.category,
                quantity:   qty,
            });
        }
        localStorage.setItem("cart", JSON.stringify(cart));
        showToast("Added to cart!");
    };

    const toggleWishlist = () => {
        const wl = JSON.parse(localStorage.getItem("wishlist") || "[]");
        if (inWishlist) {
            const updated = wl.filter(i => i.product_id !== id);
            localStorage.setItem("wishlist", JSON.stringify(updated));
            setInWishlist(false);
            showToast("Removed from wishlist", "info");
        } else {
            wl.push({
                product_id: id,
                name:       product.name,
                price:      discountedPrice,
                image:      product.images?.[0] || "",
                category:   product.category,
            });
            localStorage.setItem("wishlist", JSON.stringify(wl));
            setInWishlist(true);
            showToast("Saved to wishlist ♡");
        }
    };

    const handleSubmitReview = async () => {
        if (!reviewForm.rating) { setReviewError("Please select a star rating"); return; }
        if (!reviewForm.comment.trim()) { setReviewError("Please write a comment"); return; }
        setSubmitting(true);
        setReviewError("");
        try {
            await productsAPI.submitReview(id, reviewForm);
            setHasReviewed(true);
            setReviewForm({ rating: 0, comment: "" });
            showToast("Review submitted! 🎉");
            fetchReviews(1);
            fetchProduct();
        } catch (err) {
            setReviewError(err.response?.data?.message || "Failed to submit review");
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading || loading) return (
        <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif", fontSize: 14 }}>
            Loading...
        </div>
    );

    if (!product) return (
        <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "Inter, sans-serif" }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#f5f5f7" }}>Product not found</div>
            <button onClick={() => router.push("/store")} style={{ color: "#4da3ff", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontFamily: "Inter, sans-serif" }}>← Back to store</button>
        </div>
    );

    const discountedPrice = product.discount > 0
        ? Math.round(product.price * (1 - product.discount / 100))
        : product.price;
    const savings = product.price - discountedPrice;
    const totalReviewPages = Math.ceil(reviewTotal / 5);

    const renderStars = (rating, size = 16) => (
        <div style={{ display: "flex", gap: 2 }}>
            {[1,2,3,4,5].map(star => (
                <span key={star} style={{ fontSize: size, color: star <= rating ? "#fbbf24" : "rgba(255,255,255,0.15)" }}>★</span>
            ))}
        </div>
    );

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                .page { min-height: 100vh; background: #0a0a0a; font-family: 'Inter', -apple-system, sans-serif; color: #f5f5f7; }
                .nav { background: rgba(10,10,10,0.9); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.07); position: sticky; top: 0; z-index: 100; }
                .nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 52px; display: flex; align-items: center; justify-content: space-between; }
                .logo { display: flex; align-items: center; gap: 8px; cursor: pointer; }
                .logo-mark { width: 28px; height: 28px; background: linear-gradient(135deg,#4da3ff,#0071e3); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #fff; }
                .logo-name { font-size: 15px; font-weight: 700; color: #f5f5f7; }
                .back-btn { font-size: 13px; color: #4da3ff; font-weight: 500; background: none; border: none; cursor: pointer; font-family: 'Inter', sans-serif; }
                .nav-right { display: flex; align-items: center; gap: 8px; }
                .nav-icon-btn { position: relative; width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 15px; color: #f5f5f7; transition: all 0.15s; }
                .nav-icon-btn:hover { background: rgba(255,255,255,0.1); }

                .toast-container { position: fixed; bottom: 24px; right: 24px; z-index: 999; }
                .toast { background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); color: #f5f5f7; padding: 12px 18px; border-radius: 12px; font-size: 13px; font-weight: 500; box-shadow: 0 8px 24px rgba(0,0,0,0.4); animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.2s forwards; display: flex; align-items: center; gap: 8px; }
                .toast.success { border-color: rgba(26,127,75,0.3); }
                .toast.info    { border-color: rgba(0,113,227,0.3); }
                @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }

                .container { max-width: 1200px; margin: 0 auto; padding: 40px 24px 80px; }
                .breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 13px; color: rgba(255,255,255,0.3); margin-bottom: 32px; }
                .breadcrumb span { cursor: pointer; transition: color 0.15s; }
                .breadcrumb span:hover { color: #4da3ff; }
                .breadcrumb-sep { color: rgba(255,255,255,0.15); }

                .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: start; margin-bottom: 64px; }
                .images-section { position: sticky; top: 80px; }
                .main-img { width: 100%; aspect-ratio: 1; border-radius: 20px; background: #141414; border: 1px solid rgba(255,255,255,0.07); overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 80px; margin-bottom: 12px; }
                .main-img img { width: 100%; height: 100%; object-fit: cover; }
                .thumb-row { display: flex; gap: 8px; }
                .thumb { width: 72px; height: 72px; border-radius: 10px; background: #141414; border: 1.5px solid rgba(255,255,255,0.07); overflow: hidden; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 22px; transition: border-color 0.15s; flex-shrink: 0; }
                .thumb.active { border-color: #4da3ff; }
                .thumb img { width: 100%; height: 100%; object-fit: cover; }

                .cat-badge { font-size: 12px; font-weight: 600; color: #4da3ff; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
                .product-name { font-size: 32px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.8px; line-height: 1.1; margin-bottom: 12px; }
                .rating-summary { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
                .avg-rating-num { font-size: 22px; font-weight: 800; color: #fbbf24; letter-spacing: -0.5px; }
                .review-count-text { font-size: 13px; color: rgba(255,255,255,0.35); }

                .price-section { margin-bottom: 20px; }
                .original-price { font-size: 15px; color: rgba(255,255,255,0.25); text-decoration: line-through; margin-bottom: 4px; }
                .current-price { font-size: 36px; font-weight: 800; color: #f5f5f7; letter-spacing: -1px; display: flex; align-items: baseline; gap: 4px; }
                .current-price sup { font-size: 18px; font-weight: 600; vertical-align: super; }
                .savings-badge { display: inline-flex; align-items: center; gap: 4px; background: rgba(26,127,75,0.15); border: 1px solid rgba(26,127,75,0.25); color: #4ade80; font-size: 13px; font-weight: 600; padding: 5px 12px; border-radius: 20px; margin-top: 8px; }
                .discount-pct { background: linear-gradient(135deg,#1a7f4b,#166534); color: #fff; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 6px; margin-left: 8px; }

                .stock-row { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }
                .stock-indicator { width: 8px; height: 8px; border-radius: 50%; }
                .stock-indicator.in  { background: #4ade80; box-shadow: 0 0 6px rgba(74,222,128,0.5); }
                .stock-indicator.low { background: #fbbf24; }
                .stock-indicator.out { background: #f87171; }
                .stock-text { font-size: 14px; font-weight: 500; }
                .stock-text.in  { color: #4ade80; }
                .stock-text.low { color: #fbbf24; }
                .stock-text.out { color: #f87171; }

                .desc { font-size: 15px; color: rgba(255,255,255,0.45); line-height: 1.8; margin-bottom: 28px; font-weight: 300; }

                .qty-section { margin-bottom: 20px; }
                .qty-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 10px; }
                .qty-control { display: flex; align-items: center; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; width: fit-content; overflow: hidden; }
                .qty-btn { width: 44px; height: 44px; background: none; border: none; color: rgba(255,255,255,0.6); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
                .qty-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: #f5f5f7; }
                .qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
                .qty-val { width: 48px; text-align: center; font-size: 16px; font-weight: 600; color: #f5f5f7; border-left: 1px solid rgba(255,255,255,0.08); border-right: 1px solid rgba(255,255,255,0.08); }

                .actions { display: flex; gap: 12px; margin-bottom: 14px; }
                .add-cart-btn { flex: 1; background: linear-gradient(135deg,#0071e3,#0056b3); color: #fff; border: none; border-radius: 14px; padding: 16px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; box-shadow: 0 4px 20px rgba(0,113,227,0.25); }
                .add-cart-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(0,113,227,0.35); }
                .add-cart-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
                .wishlist-btn { width: 54px; height: 54px; border-radius: 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
                .wishlist-btn:hover { background: rgba(255,20,147,0.15); border-color: rgba(255,20,147,0.3); }
                .wishlist-btn.active { background: rgba(255,20,147,0.15); border-color: rgba(255,20,147,0.4); }
                .buy-now-btn { width: 100%; background: rgba(255,255,255,0.06); color: #f5f5f7; border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 15px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; margin-bottom: 24px; }
                .buy-now-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
                .buy-now-btn:disabled { opacity: 0.3; cursor: not-allowed; }

                .non-customer-note { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 16px 20px; font-size: 13px; color: rgba(255,255,255,0.35); margin-bottom: 24px; text-align: center; }

                .features { display: flex; flex-direction: column; gap: 12px; padding: 20px; background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; }
                .feature { display: flex; align-items: center; gap: 12px; font-size: 13px; color: rgba(255,255,255,0.45); }
                .feature-icon { font-size: 16px; width: 28px; text-align: center; flex-shrink: 0; }

                /* ── Reviews ── */
                .reviews-section { border-top: 1px solid rgba(255,255,255,0.07); padding-top: 48px; }
                .reviews-header { margin-bottom: 32px; }
                .reviews-title { font-size: 22px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.5px; }
                .reviews-sub { font-size: 14px; color: rgba(255,255,255,0.3); margin-top: 4px; }
                .rating-overview { display: grid; grid-template-columns: auto 1fr; gap: 32px; background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 28px; margin-bottom: 32px; align-items: center; }
                .rating-big { text-align: center; padding-right: 32px; border-right: 1px solid rgba(255,255,255,0.07); }
                .rating-big-num { font-size: 56px; font-weight: 800; color: #fbbf24; letter-spacing: -2px; line-height: 1; margin-bottom: 8px; }
                .rating-big-stars { margin-bottom: 6px; }
                .rating-big-count { font-size: 13px; color: rgba(255,255,255,0.35); }
                .rating-bars { display: flex; flex-direction: column; gap: 8px; }
                .rating-bar-row { display: flex; align-items: center; gap: 10px; }
                .rating-bar-label { font-size: 12px; color: rgba(255,255,255,0.4); width: 32px; flex-shrink: 0; }
                .rating-bar-track { flex: 1; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
                .rating-bar-fill { height: 100%; background: #fbbf24; border-radius: 3px; transition: width 0.4s ease; }
                .rating-bar-count { font-size: 12px; color: rgba(255,255,255,0.3); width: 24px; text-align: right; flex-shrink: 0; }
                .write-review-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 24px; margin-bottom: 32px; }
                .write-review-title { font-size: 15px; font-weight: 600; color: #f5f5f7; margin-bottom: 16px; }
                .star-picker { display: flex; gap: 6px; margin-bottom: 14px; }
                .star-pick { font-size: 28px; cursor: pointer; transition: all 0.1s; line-height: 1; }
                .review-textarea { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 14px; font-size: 14px; color: #f5f5f7; font-family: 'Inter', sans-serif; outline: none; resize: none; transition: all 0.15s; margin-bottom: 12px; }
                .review-textarea::placeholder { color: rgba(255,255,255,0.2); }
                .review-textarea:focus { background: rgba(255,255,255,0.09); border-color: rgba(77,163,255,0.5); box-shadow: 0 0 0 3px rgba(0,113,227,0.1); }
                .review-error { font-size: 13px; color: #f87171; margin-bottom: 10px; }
                .submit-review-btn { background: linear-gradient(135deg,#0071e3,#0056b3); color: #fff; border: none; border-radius: 10px; padding: 11px 24px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; }
                .submit-review-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,113,227,0.3); }
                .submit-review-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .reviewed-badge { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #4ade80; background: rgba(26,127,75,0.1); border: 1px solid rgba(26,127,75,0.2); border-radius: 10px; padding: 12px 16px; }
                .reviews-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
                .review-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 20px; }
                .review-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
                .reviewer-info { display: flex; align-items: center; gap: 10px; }
                .reviewer-avatar { width: 36px; height: 36px; background: linear-gradient(135deg,#4da3ff,#0071e3); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0; }
                .reviewer-name { font-size: 14px; font-weight: 600; color: #f5f5f7; }
                .review-date { font-size: 12px; color: rgba(255,255,255,0.25); margin-top: 2px; }
                .review-comment { font-size: 14px; color: rgba(255,255,255,0.55); line-height: 1.7; margin-top: 8px; }
                .load-more-btn { width: 100%; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 13px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; }
                .load-more-btn:hover { background: rgba(255,255,255,0.09); color: #f5f5f7; }
                .no-reviews { text-align: center; padding: 40px 24px; color: rgba(255,255,255,0.25); font-size: 14px; background: #141414; border-radius: 14px; border: 1px solid rgba(255,255,255,0.07); }

                 @media (max-width: 768px) {
    .layout { grid-template-columns: 1fr; gap: 24px; margin-bottom: 40px; }
    .images-section { position: static; }
    .product-name { font-size: 22px; }
    .current-price { font-size: 26px; }
    .container { padding: 24px 16px 60px; }
    .rating-overview { grid-template-columns: 1fr; gap: 20px; }
    .rating-big { padding-right: 0; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.07); padding-bottom: 20px; }
}
            `}</style>

            <div className="page">
                {toast && (
                    <div className="toast-container">
                        <div className={`toast ${toast.type}`}>
                            {toast.type === "success" ? "✓" : "ℹ"} {toast.msg}
                        </div>
                    </div>
                )}

                <nav className="nav">
                    <div className="nav-inner">
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <div className="logo" onClick={() => router.push("/store")}>
                                <div className="logo-mark">S</div>
                                <span className="logo-name">ShopX</span>
                            </div>
                            <button className="back-btn" onClick={() => router.back()}>← Back</button>
                        </div>
                        <div className="nav-right">
                            {user?.role === "customer" && (
                                <>
                                    <button className="nav-icon-btn" onClick={() => router.push("/store/wishlist")}>♡</button>
                                    <button className="nav-icon-btn" onClick={() => router.push("/store/cart")}>🛒</button>
                                </>
                            )}
                        </div>
                    </div>
                </nav>

                <div className="container">
                    <div className="breadcrumb">
                        <span onClick={() => router.push("/store")}>Store</span>
                        <span className="breadcrumb-sep">›</span>
                        <span onClick={() => router.push(`/store?category=${product.category}`)}>{product.category}</span>
                        <span className="breadcrumb-sep">›</span>
                        <span style={{ color: "rgba(255,255,255,0.6)" }}>{product.name}</span>
                    </div>

                    <div className="layout">
                        {/* Images */}
                        <div className="images-section">
                            <div className="main-img">
                                {product.images?.[imgIdx]
                                    ? <img src={product.images[imgIdx]} alt={product.name} />
                                    : "📦"
                                }
                            </div>
                            {product.images?.length > 1 && (
                                <div className="thumb-row">
                                    {product.images.map((img, i) => (
                                        <div key={i} className={`thumb ${imgIdx === i ? "active" : ""}`} onClick={() => setImgIdx(i)}>
                                            <img src={img} alt={`${product.name} ${i + 1}`} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div>
                            <div className="cat-badge">{product.category}</div>
                            <h1 className="product-name">{product.name}</h1>

                            {product.review_count > 0 && (
                                <div className="rating-summary">
                                    <span className="avg-rating-num">{product.avg_rating}</span>
                                    {renderStars(product.avg_rating)}
                                    <span className="review-count-text">({product.review_count} review{product.review_count > 1 ? "s" : ""})</span>
                                </div>
                            )}

                            <div className="price-section">
                                {product.discount > 0 && (
                                    <div className="original-price">₹{product.price.toLocaleString("en-IN")}</div>
                                )}
                                <div className="current-price">
                                    <sup>₹</sup>
                                    {discountedPrice.toLocaleString("en-IN")}
                                    {product.discount > 0 && (
                                        <span className="discount-pct">{product.discount}% off</span>
                                    )}
                                </div>
                                {product.discount > 0 && (
                                    <div className="savings-badge">🎉 You save ₹{savings.toLocaleString("en-IN")}</div>
                                )}
                            </div>

                            <div className="stock-row">
                                <div className={`stock-indicator ${product.stock === 0 ? "out" : product.stock < 10 ? "low" : "in"}`} />
                                <div className={`stock-text ${product.stock === 0 ? "out" : product.stock < 10 ? "low" : "in"}`}>
                                    {product.stock === 0 ? "Out of stock" : product.stock < 10 ? `Only ${product.stock} left!` : "In stock"}
                                </div>
                            </div>

                            {product.description && <p className="desc">{product.description}</p>}

                            {user?.role === "customer" ? (
                                <>
                                    {product.stock > 0 && (
                                        <div className="qty-section">
                                            <div className="qty-label">Quantity</div>
                                            <div className="qty-control">
                                                <button className="qty-btn" onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1}>−</button>
                                                <div className="qty-val">{qty}</div>
                                                <button className="qty-btn" onClick={() => setQty(Math.min(product.stock, qty + 1))} disabled={qty >= product.stock}>+</button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="actions">
                                        <button className="add-cart-btn" disabled={product.stock === 0} onClick={addToCart}>
                                            {product.stock === 0 ? "Out of stock" : "Add to cart"}
                                        </button>
                                        <button className={`wishlist-btn ${inWishlist ? "active" : ""}`} onClick={toggleWishlist}>
                                            {inWishlist ? "♥" : "♡"}
                                        </button>
                                    </div>
                                    <button className="buy-now-btn" disabled={product.stock === 0}
                                        onClick={() => { addToCart(); router.push("/store/checkout"); }}>
                                        Buy now
                                    </button>
                                </>
                            ) : (
                                <div className="non-customer-note">
                                    {user?.role === "vendor"
                                        ? "👨‍💼 You are viewing as a vendor — switch to a customer account to purchase"
                                        : "🔒 Admin accounts cannot place orders"
                                    }
                                </div>
                            )}

                            <div className="features">
                                <div className="feature"><span className="feature-icon">🚚</span>Free delivery on orders over ₹999</div>
                                <div className="feature"><span className="feature-icon">↩</span>Easy 7-day returns</div>
                                <div className="feature"><span className="feature-icon">🔒</span>Secure payment via Razorpay</div>
                                <div className="feature"><span className="feature-icon">✓</span>Verified vendor product</div>
                            </div>
                        </div>
                    </div>

                    {/* ── Reviews Section ── */}
                    <div className="reviews-section">
                        <div className="reviews-header">
                            <h2 className="reviews-title">Customer Reviews</h2>
                            <p className="reviews-sub">{reviewTotal} review{reviewTotal !== 1 ? "s" : ""} for this product</p>
                        </div>

                        {reviewTotal > 0 && (
                            <div className="rating-overview">
                                <div className="rating-big">
                                    <div className="rating-big-num">{product.avg_rating || "—"}</div>
                                    <div className="rating-big-stars">{renderStars(product.avg_rating, 18)}</div>
                                    <div className="rating-big-count">{reviewTotal} review{reviewTotal !== 1 ? "s" : ""}</div>
                                </div>
                                <div className="rating-bars">
                                    {[5,4,3,2,1].map(star => {
                                        const count = product.rating_breakdown?.[String(star)] || 0;
                                        const pct   = reviewTotal > 0 ? (count / reviewTotal) * 100 : 0;
                                        return (
                                            <div className="rating-bar-row" key={star}>
                                                <span className="rating-bar-label">{star} ★</span>
                                                <div className="rating-bar-track">
                                                    <div className="rating-bar-fill" style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="rating-bar-count">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {user?.role === "customer" && (
                            <div className="write-review-card">
                                {hasReviewed ? (
                                    <div className="reviewed-badge">✓ You&#39;ve already reviewed this product — thank you!</div>
                                ) : (
                                    <>
                                        <div className="write-review-title">Write a review</div>
                                        <div className="star-picker">
                                            {[1,2,3,4,5].map(star => (
                                                <span
                                                    key={star}
                                                    className="star-pick"
                                                    style={{ color: star <= (hoverRating || reviewForm.rating) ? "#fbbf24" : "rgba(255,255,255,0.15)" }}
                                                    onMouseEnter={() => setHoverRating(star)}
                                                    onMouseLeave={() => setHoverRating(0)}
                                                    onClick={() => setReviewForm({...reviewForm, rating: star})}
                                                >★</span>
                                            ))}
                                            {reviewForm.rating > 0 && (
                                                <span style={{ fontSize: 14, color: "#fbbf24", marginLeft: 8, alignSelf: "center", fontWeight: 600 }}>
                                                    {["","Terrible","Poor","Okay","Good","Excellent!"][reviewForm.rating]}
                                                </span>
                                            )}
                                        </div>
                                        <textarea
                                            className="review-textarea"
                                            rows={3}
                                            placeholder="Share your experience with this product..."
                                            value={reviewForm.comment}
                                            onChange={e => setReviewForm({...reviewForm, comment: e.target.value})}
                                            maxLength={1000}
                                        />
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <div>{reviewError && <div className="review-error">✕ {reviewError}</div>}</div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>{reviewForm.comment.length}/1000</span>
                                                <button className="submit-review-btn" onClick={handleSubmitReview} disabled={submitting}>
                                                    {submitting ? "Submitting..." : "Submit review"}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {reviewsLoading && reviewPage === 1 ? (
                            <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.25)", fontSize: 14 }}>Loading reviews...</div>
                        ) : reviews.length === 0 ? (
                            <div className="no-reviews">
                                <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
                                <div style={{ fontWeight: 600, color: "#f5f5f7", marginBottom: 6 }}>No reviews yet</div>
                                <div>Be the first to review this product!</div>
                            </div>
                        ) : (
                            <>
                                <div className="reviews-list">
                                    {reviews.map((review) => {
                                        const date = new Date(review.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                                        return (
                                            <div className="review-card" key={review.id}>
                                                <div className="review-top">
                                                    <div className="reviewer-info">
                                                        <div className="reviewer-avatar">{review.user_name?.[0]?.toUpperCase() || "U"}</div>
                                                        <div>
                                                            <div className="reviewer-name">{review.user_name}</div>
                                                            <div className="review-date">{date}</div>
                                                        </div>
                                                    </div>
                                                    {renderStars(review.rating, 14)}
                                                </div>
                                                {review.comment && <p className="review-comment">{review.comment}</p>}
                                            </div>
                                        );
                                    })}
                                </div>
                                {reviewPage < totalReviewPages && (
                                    <button className="load-more-btn" onClick={() => fetchReviews(reviewPage + 1)} disabled={reviewsLoading}>
                                        {reviewsLoading ? "Loading..." : `Load more reviews (${reviewTotal - reviews.length} remaining)`}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
