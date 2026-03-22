"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { productsAPI } from "@/lib/api";

export default function StorePage() {
    const [products,       setProducts]       = useState([]);
    const [loading,        setLoading]        = useState(true);
    const [search,         setSearch]         = useState("");
    const [category,       setCategory]       = useState("");
    const [gender,         setGender]         = useState("");
    const [sidebarOpen,    setSidebarOpen]    = useState(false);
    const [closingSidebar, setClosingSidebar] = useState(false);
    const [wishlistCount,  setWishlistCount]  = useState(0);
    const [cartCount,      setCartCount]      = useState(0);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [dropdownPos,    setDropdownPos]    = useState({ left: 0, top: 0 });
    const [toasts,         setToasts]         = useState([]);
    const dropdownTimeout = useRef(null);

    const { user, logout, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) router.push("/login");
    }, [user, authLoading]);

    useEffect(() => { fetchProducts(); }, [search, category, gender]);

    useEffect(() => {
        const wl   = JSON.parse(localStorage.getItem("wishlist") || "[]");
        const cart = JSON.parse(localStorage.getItem("cart")     || "[]");
        setWishlistCount(wl.length);
        setCartCount(cart.reduce((sum, i) => sum + i.quantity, 0));
    }, []);

    useEffect(() => {
        if (user && !authLoading) {
            const shown = sessionStorage.getItem("login_toast_shown");
            if (!shown) {
                showToast(`Welcome back, ${user.name.split(" ")[0]}! 👋`, "success");
                sessionStorage.setItem("login_toast_shown", "1");
            }
        }
    }, [user, authLoading]);

    const showToast = (message, type = "success") => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = {};
            if (category) params.category = category;
            const res = await productsAPI.list(params);
            let prods = res.data.data.products;

            if (search) {
                const q = search.toLowerCase();
                prods = prods.filter(p =>
                    p.name?.toLowerCase().includes(q) ||
                    p.description?.toLowerCase().includes(q) ||
                    p.category?.toLowerCase().includes(q)
                );
            }

            if (gender && (category === "clothing" || category === "shoes")) {
                prods = prods.filter(p => {
                    const name = p.name?.toLowerCase() || "";
                    const desc = p.description?.toLowerCase() || "";
                    if (gender === "men") {
                        return (
                            (/\bmen\b/.test(name) && !name.includes("women")) ||
                            (/\bmen\b/.test(desc) && !desc.includes("women"))
                        );
                    }
                    return name.includes("women") || desc.includes("women");
                });
            }

            setProducts(prods);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const closeSidebar = () => {
        setClosingSidebar(true);
        setTimeout(() => {
            setSidebarOpen(false);
            setClosingSidebar(false);
        }, 280);
    };

    const categories = [
        { id: "",            label: "All",         icon: "◈" },
        { id: "electronics", label: "Electronics", icon: "⚡" },
        { id: "accessories", label: "Accessories", icon: "◎" },
        { id: "clothing",    label: "Clothing",    icon: "◇" },
        { id: "shoes",       label: "Shoes",       icon: "◉" },
        { id: "books",       label: "Books",       icon: "▣" },
    ];

    const dropdownMenus = {
        Electronics: {
            explore: [
                { label: "Shop Electronics", action: (id) => scrollToProducts(id) },
                { label: "New Arrivals",      action: (id) => router.push(`/store/new-arrivals?category=${id}`) },
                { label: "Best Sellers",      action: (id) => scrollToProducts(id) },
                { label: "Deals",             action: ()   => router.push("/store/deals") },
            ],
            shop: ["Smartphones", "Laptops", "Headphones", "Tablets", "Smart Watches", "Cameras"],
            more: ["Compare Products", "Trade In", "Financing Options", "Gift Cards"],
        },
        Clothing: {
            explore: [
                { label: "Shop Clothing",  action: (id) => scrollToProducts(id) },
                { label: "New Collection", action: (id) => router.push(`/store/new-arrivals?category=${id}`) },
                { label: "Best Sellers",   action: (id) => scrollToProducts(id) },
                { label: "Sale",           action: ()   => router.push("/store/sale") },
            ],
            shop: ["Men's T-shirts", "Women's Dresses", "Hoodies", "Jeans", "Formal Wear", "Activewear"],
            more: ["Size Guide", "Style Guide", "Sustainable Fashion", "Gift Cards"],
        },
        Shoes: {
            explore: [
                { label: "Shop Shoes",   action: (id) => scrollToProducts(id) },
                { label: "New Arrivals", action: (id) => router.push(`/store/new-arrivals?category=${id}`) },
                { label: "Best Sellers", action: (id) => scrollToProducts(id) },
                { label: "Sale",         action: ()   => router.push("/store/sale") },
            ],
            shop: ["Men's Sneakers", "Women's Sneakers", "Formal Shoes", "Sports Shoes", "Sandals", "Boots"],
            more: ["Size Guide", "Shoe Care", "Returns Policy", "Gift Cards"],
        },
        Accessories: {
            explore: [
                { label: "Shop Accessories", action: (id) => scrollToProducts(id) },
                { label: "New Arrivals",      action: (id) => router.push(`/store/new-arrivals?category=${id}`) },
                { label: "Best Sellers",      action: (id) => scrollToProducts(id) },
                { label: "Deals",             action: ()   => router.push("/store/deals") },
            ],
            shop: ["Watches", "Sunglasses", "Wallets", "Bags", "Belts", "Jewellery"],
            more: ["Gift Ideas", "Style Guide", "Returns Policy", "Gift Cards"],
        },
        Books: {
            explore: [
                { label: "Shop Books",    action: (id) => scrollToProducts(id) },
                { label: "New Releases",  action: (id) => router.push(`/store/new-arrivals?category=${id}`) },
                { label: "Best Sellers",  action: (id) => scrollToProducts(id) },
                { label: "Award Winners", action: (id) => scrollToProducts(id) },
            ],
            shop: ["Fiction", "Non-Fiction", "Mythology", "Self Help", "Business", "Children"],
            more: ["Reading Lists", "Author Events", "Gift Cards", "Book Clubs"],
        },
    };

    const categoryIcons = [
        { id: "electronics", label: "Electronics", img: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=200&h=200&fit=crop", fallback: "📱" },
        { id: "clothing",    label: "Clothing",    img: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=200&h=200&fit=crop", fallback: "👗" },
        { id: "shoes",       label: "Shoes",       img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop", fallback: "👟" },
        { id: "accessories", label: "Accessories", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop", fallback: "⌚" },
        { id: "books",       label: "Books",       img: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&h=200&fit=crop", fallback: "📚" },
    ];

    const featuredCards = [
        { id: "electronics", eyebrow: "NEW",  title: "Latest Electronics", sub: "The best in tech, right now.",  price: "From ₹999", img: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=300&fit=crop" },
        { id: "clothing",    eyebrow: "NEW",  title: "Fashion Collection", sub: "Style for every occasion.",     price: "From ₹349", img: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=300&fit=crop" },
        { id: "shoes",       eyebrow: "HOT",  title: "Footwear",           sub: "Step into something new.",      price: "From ₹599", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop" },
        { id: "accessories", eyebrow: "SALE", title: "Accessories",        sub: "Finish the look perfectly.",    price: "From ₹199", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop" },
    ];

    const trustedBrands = ["Apple", "Samsung", "Nike", "Adidas", "Sony", "Levi's", "H&M", "OnePlus", "Puma", "Dell", "Bose", "Uniqlo"];

    const scrollToProducts = (cat) => {
        setCategory(cat);
        setGender("");
        setSearch("");
        setTimeout(() => document.querySelector(".products-anchor")?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    const handleDropdownShopItem = (item, catId) => {
        setCategory(catId);
        setGender("");
        setSearch(item);
        setActiveDropdown(null);
        setTimeout(() => document.querySelector(".products-anchor")?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    const handleDropdownEnter = (label, e) => {
        clearTimeout(dropdownTimeout.current);
        const rect = e.currentTarget.getBoundingClientRect();
        setDropdownPos({ left: rect.left, top: rect.bottom });
        setActiveDropdown(label);
    };

    const handleDropdownLeave = () => {
        dropdownTimeout.current = setTimeout(() => setActiveDropdown(null), 150);
    };

    const handleLogout = () => {
        sessionStorage.removeItem("login_toast_shown");
        closeSidebar();
        setTimeout(() => logout(), 280);
    };

    const discountedPrice = (price, discount) =>
        discount > 0 ? Math.round(price * (1 - discount / 100)) : price;

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                html { scroll-behavior: smooth; }
                .store { min-height: 100vh; background: #0a0a0a; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #f5f5f7; }

                .toast-container { position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; }
                .toast { padding: 12px 18px; border-radius: 12px; font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif; box-shadow: 0 8px 24px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 8px; animation: slideIn 0.3s ease, fadeOut 0.3s ease 3.2s forwards; max-width: 320px; }
                .toast.success { background: rgba(26,127,75,0.95); color: #fff; border: 1px solid rgba(26,127,75,0.3); }
                .toast.error   { background: rgba(192,57,43,0.95); color: #fff; }
                .toast.info    { background: rgba(0,113,227,0.95); color: #fff; }
                @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; transform: translateX(20px); } }

                .offer-bar { background: #111; border-bottom: 1px solid rgba(255,255,255,0.06); padding: 9px 16px; text-align: center; font-size: 12px; color: rgba(255,255,255,0.5); }
                .offer-bar span { color: #4da3ff; font-weight: 500; cursor: pointer; margin-left: 6px; }
                .offer-bar span:hover { text-decoration: underline; }

                .nav { background: rgba(10,10,10,0.92); backdrop-filter: saturate(180%) blur(24px); border-bottom: 1px solid rgba(255,255,255,0.07); position: sticky; top: 0; z-index: 100; }
                .nav-inner { width: 100%; padding: 0 24px; height: 52px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
                .nav-left { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
                .menu-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); cursor: pointer; color: #f5f5f7; padding: 7px 9px; border-radius: 8px; display: flex; align-items: center; transition: all 0.15s; }
                .menu-btn:hover { background: rgba(255,255,255,0.1); }
                .nav-logo { display: flex; align-items: center; gap: 9px; }
                .nav-logo-mark { width: 30px; height: 30px; background: linear-gradient(135deg, #4da3ff, #0071e3); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #fff; box-shadow: 0 2px 12px rgba(0,113,227,0.4); }
                .nav-logo-name { font-size: 16px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.4px; }
                .nav-search { flex: 1; max-width: 400px; position: relative; }
                .nav-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.3); font-size: 13px; pointer-events: none; }
                .nav-search input { width: 100%; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 8px 14px 8px 32px; font-size: 13px; color: #f5f5f7; font-family: 'Inter', sans-serif; outline: none; transition: all 0.15s; }
                .nav-search input::placeholder { color: rgba(255,255,255,0.3); }
                .nav-search input:focus { background: rgba(255,255,255,0.1); border-color: rgba(77,163,255,0.5); box-shadow: 0 0 0 3px rgba(0,113,227,0.15); }
                .nav-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
                .nav-icon-btn { position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); font-size: 15px; color: #f5f5f7; cursor: pointer; transition: all 0.15s; }
                .nav-icon-btn:hover { background: rgba(255,255,255,0.12); }
                .nav-badge { position: absolute; top: -2px; right: -2px; background: #0071e3; color: #fff; font-size: 9px; font-weight: 700; width: 15px; height: 15px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #0a0a0a; }
                .nav-dash-btn { font-size: 12px; font-weight: 500; color: #4da3ff; background: rgba(0,113,227,0.15); border: 1px solid rgba(0,113,227,0.25); border-radius: 8px; padding: 6px 12px; cursor: pointer; font-family: 'Inter', sans-serif; white-space: nowrap; transition: all 0.15s; }
                .nav-dash-btn:hover { background: rgba(0,113,227,0.25); }
                .nav-user { font-size: 12px; color: rgba(255,255,255,0.4); margin-right: 2px; }
                .nav-user strong { color: #f5f5f7; }

                .quick-links { background: rgba(10,10,10,0.98); border-bottom: 1px solid rgba(255,255,255,0.06); position: sticky; top: 52px; z-index: 95; }
                .quick-links-inner { width: 100%; padding: 0 24px; display: flex; align-items: center; overflow-x: auto; scrollbar-width: none; }
                .quick-links-inner::-webkit-scrollbar { display: none; }
                .quick-link-wrap { position: relative; display: inline-block; }
                .quick-link { padding: 12px 16px; font-size: 13px; color: rgba(255,255,255,0.45); cursor: pointer; white-space: nowrap; border: none; background: none; font-family: 'Inter', sans-serif; transition: color 0.15s; border-bottom: 2px solid transparent; display: block; }
                .quick-link:hover { color: #f5f5f7; }
                .quick-link.active { color: #f5f5f7; font-weight: 500; border-bottom-color: #f5f5f7; }
                .quick-link.highlight { color: #ff6b6b; font-weight: 500; }
                .quick-link.highlight:hover { color: #ff8e8e; }
                .quick-link.sale-link { color: #a78bfa; font-weight: 500; }
                .quick-link.sale-link:hover { color: #c4b5fd; }

                .dropdown { background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 28px 32px; box-shadow: 0 24px 60px rgba(0,0,0,0.8); display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; min-width: 680px; animation: dropIn 0.18s ease; }
                @keyframes dropIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
                .dropdown-col-title { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.28); letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 14px; }
                .dropdown-item { display: block; font-size: 15px; color: #f5f5f7; font-weight: 500; margin-bottom: 10px; cursor: pointer; transition: color 0.15s; background: none; border: none; font-family: 'Inter', sans-serif; text-align: left; padding: 0; }
                .dropdown-item:hover { color: #4da3ff; }
                .dropdown-item-sm { display: block; font-size: 13px; color: rgba(255,255,255,0.45); margin-bottom: 8px; cursor: pointer; transition: color 0.15s; background: none; border: none; font-family: 'Inter', sans-serif; text-align: left; padding: 0; }
                .dropdown-item-sm:hover { color: #f5f5f7; }

                /* ── Sidebar slide animation ── */
                .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0); z-index: 200; backdrop-filter: blur(0px); animation: overlayIn 0.32s cubic-bezier(0.32,0.72,0,1) forwards; }
                .sidebar-overlay.closing { animation: overlayOut 0.28s cubic-bezier(0.32,0.72,0,1) forwards; }
                @keyframes overlayIn  { from { background: rgba(0,0,0,0); backdrop-filter: blur(0px); } to { background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); } }
                @keyframes overlayOut { from { background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); } to { background: rgba(0,0,0,0); backdrop-filter: blur(0px); } }

                .sidebar { position: fixed; left: 0; top: 0; bottom: 0; width: 320px; background: #111; border-right: 1px solid rgba(255,255,255,0.08); z-index: 201; overflow-y: auto; box-shadow: 12px 0 60px rgba(0,0,0,0.6); display: flex; flex-direction: column; animation: sidebarIn 0.32s cubic-bezier(0.32,0.72,0,1) forwards; }
                .sidebar.closing { animation: sidebarOut 0.28s cubic-bezier(0.32,0.72,0,1) forwards; }
                @keyframes sidebarIn  { from { transform: translateX(-100%); } to { transform: translateX(0); } }
                @keyframes sidebarOut { from { transform: translateX(0); } to { transform: translateX(-100%); } }

                .sidebar-header { padding: 20px 24px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; }
                .sidebar-user { display: flex; align-items: center; gap: 12px; }
                .sidebar-avatar { width: 44px; height: 44px; background: linear-gradient(135deg, #4da3ff, #0071e3); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #fff; flex-shrink: 0; }
                .sidebar-name { font-size: 15px; font-weight: 600; color: #f5f5f7; }
                .sidebar-role { font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 2px; text-transform: capitalize; background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 20px; display: inline-block; }
                .sidebar-close { background: rgba(255,255,255,0.08); border: none; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; color: rgba(255,255,255,0.5); transition: all 0.15s; }
                .sidebar-close:hover { background: rgba(255,255,255,0.14); color: #f5f5f7; }
                .sidebar-section { padding: 16px 16px 8px; }
                .sidebar-section-title { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.22); letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 4px; padding: 0 8px; }
                .sidebar-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: background 0.15s; border: none; background: none; width: 100%; text-align: left; font-family: 'Inter', sans-serif; }
                .sidebar-item:hover { background: rgba(255,255,255,0.06); }
                .sidebar-item-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); }
                .sidebar-item-label { font-size: 14px; font-weight: 500; color: #f5f5f7; }
                .sidebar-item-sub { font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 1px; }
                .sidebar-item-badge { background: #0071e3; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 20px; margin-left: auto; }
                .sidebar-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 6px 16px; }
                .sidebar-footer { margin-top: auto; padding: 16px; border-top: 1px solid rgba(255,255,255,0.06); }
                .sidebar-signout { width: 100%; background: rgba(192,57,43,0.12); color: #f87171; border: 1px solid rgba(192,57,43,0.2); border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; }
                .sidebar-signout:hover { background: rgba(192,57,43,0.25); }

                .store-header { padding: 56px 40px 48px; display: flex; align-items: flex-end; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); background: #0d0d0d; position: relative; overflow: hidden; }
                .store-header::before { content: ''; position: absolute; top: -80px; right: 0; width: 500px; height: 400px; background: radial-gradient(ellipse, rgba(0,113,227,0.07) 0%, transparent 70%); pointer-events: none; }
                .store-header::after { content: ''; position: absolute; bottom: -60px; left: 200px; width: 300px; height: 300px; background: radial-gradient(ellipse, rgba(77,163,255,0.04) 0%, transparent 70%); pointer-events: none; }
                .store-header-left h1 { font-size: 88px; font-weight: 800; color: #f5f5f7; letter-spacing: -4px; line-height: 0.9; }
                .store-header-left h1 span { background: linear-gradient(135deg, #4da3ff, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
                .store-header-right { text-align: right; max-width: 280px; }
                .store-header-tagline { font-size: 18px; font-weight: 400; color: rgba(255,255,255,0.55); line-height: 1.4; margin-bottom: 20px; }
                .store-header-links { display: flex; flex-direction: column; gap: 8px; }
                .store-header-link { font-size: 14px; color: #4da3ff; cursor: pointer; transition: opacity 0.15s; display: flex; align-items: center; gap: 4px; justify-content: flex-end; }
                .store-header-link:hover { opacity: 0.7; }

                .cat-icons { border-bottom: 1px solid rgba(255,255,255,0.06); background: #0d0d0d; }
                .cat-icons-inner { max-width: 1400px; margin: 0 auto; padding: 28px 40px; display: flex; align-items: center; justify-content: center; overflow-x: auto; scrollbar-width: none; }
                .cat-icons-inner::-webkit-scrollbar { display: none; }
                .cat-icon-item { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 8px 32px; cursor: pointer; flex-shrink: 0; border: none; background: none; font-family: 'Inter', sans-serif; border-right: 1px solid rgba(255,255,255,0.06); transition: all 0.2s; }
                .cat-icon-item:last-child { border-right: none; }
                .cat-icon-item:hover .cat-icon-img-wrap { border-color: rgba(77,163,255,0.5); transform: scale(1.05); }
                .cat-icon-item.active .cat-icon-img-wrap { border-color: #4da3ff; box-shadow: 0 0 0 3px rgba(77,163,255,0.15); }
                .cat-icon-item.active .cat-icon-label { color: #4da3ff; font-weight: 600; }
                .cat-icon-img-wrap { width: 80px; height: 80px; border-radius: 50%; overflow: hidden; border: 2px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; background: #1a1a1a; transition: all 0.2s; }
                .cat-icon-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
                .cat-icon-emoji { font-size: 34px; }
                .cat-icon-label { font-size: 12px; color: rgba(255,255,255,0.5); text-align: center; }

                .offers-bar { background: #0d0d0d; border-bottom: 1px solid rgba(255,255,255,0.06); padding: 14px 40px; }
                .offers-inner { max-width: 1400px; margin: 0 auto; display: flex; align-items: center; justify-content: center; gap: 48px; flex-wrap: wrap; }
                .offer-item { display: flex; align-items: center; gap: 8px; }
                .offer-item-icon { width: 28px; height: 28px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 13px; }
                .offer-item-text { font-size: 13px; color: rgba(255,255,255,0.4); }
                .offer-item-link { font-size: 13px; color: #4da3ff; font-weight: 500; margin-left: 4px; cursor: pointer; }
                .offer-item-link:hover { text-decoration: underline; }

                .latest-section { padding: 52px 0 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
                .latest-header { max-width: 1400px; margin: 0 auto; padding: 0 40px 24px; display: flex; align-items: flex-end; justify-content: space-between; }
                .latest-title { font-size: 26px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.7px; }
                .latest-title span { color: rgba(255,255,255,0.35); font-weight: 400; }
                .latest-see-all { font-size: 13px; color: #4da3ff; font-weight: 500; cursor: pointer; background: none; border: none; font-family: 'Inter', sans-serif; }
                .latest-see-all:hover { text-decoration: underline; }
                .latest-scroll { overflow-x: auto; scrollbar-width: none; padding: 0 40px 40px; }
                .latest-scroll::-webkit-scrollbar { display: none; }
                .latest-track { display: flex; gap: 14px; width: max-content; }
                .feat-card { width: 320px; border-radius: 20px; overflow: hidden; cursor: pointer; border: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; transition: all 0.25s; background: #141414; }
                .feat-card:hover { transform: translateY(-5px); box-shadow: 0 24px 64px rgba(0,0,0,0.6); border-color: rgba(255,255,255,0.15); }
                .feat-card:first-child { background: linear-gradient(145deg, #0d47a1, #1565c0); border-color: rgba(77,163,255,0.25); }
                .feat-card-img { width: 100%; height: 190px; overflow: hidden; }
                .feat-card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
                .feat-card:hover .feat-card-img img { transform: scale(1.07); }
                .feat-card-body { padding: 20px; }
                .feat-card-eyebrow { font-size: 10px; font-weight: 700; color: #4da3ff; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 6px; }
                .feat-card:first-child .feat-card-eyebrow { color: rgba(255,255,255,0.5); }
                .feat-card-title { font-size: 19px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.4px; margin-bottom: 5px; }
                .feat-card-sub { font-size: 13px; color: rgba(255,255,255,0.4); margin-bottom: 12px; line-height: 1.4; }
                .feat-card-price { font-size: 13px; color: rgba(255,255,255,0.5); font-weight: 500; }
                .feat-card-cta { font-size: 13px; color: #4da3ff; font-weight: 600; margin-top: 12px; display: flex; align-items: center; gap: 4px; transition: gap 0.2s; }
                .feat-card:hover .feat-card-cta { gap: 8px; }
                .feat-card:first-child .feat-card-cta { color: rgba(255,255,255,0.85); }

                .filters-bar { background: #0d0d0d; border-bottom: 1px solid rgba(255,255,255,0.06); padding: 0 40px; position: sticky; top: 100px; z-index: 90; }
                .filters-inner { max-width: 1400px; margin: 0 auto; display: flex; align-items: center; gap: 8px; padding: 10px 0; overflow-x: auto; scrollbar-width: none; }
                .filters-inner::-webkit-scrollbar { display: none; }
                .cat-pill { display: flex; align-items: center; gap: 5px; padding: 7px 16px; border-radius: 980px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: all 0.15s; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.45); font-family: 'Inter', sans-serif; }
                .cat-pill:hover { background: rgba(255,255,255,0.08); color: #f5f5f7; }
                .cat-pill.active { background: #f5f5f7; color: #0a0a0a; border-color: transparent; font-weight: 600; }
                .filter-divider { width: 1px; height: 22px; background: rgba(255,255,255,0.1); flex-shrink: 0; margin: 0 4px; }
                .gender-pill { display: flex; align-items: center; gap: 5px; padding: 7px 16px; border-radius: 980px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: all 0.15s; border: 1.5px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.45); font-family: 'Inter', sans-serif; }
                .gender-pill.men.active { background: rgba(0,113,227,0.15); color: #4da3ff; border-color: rgba(0,113,227,0.4); }
                .gender-pill.women.active { background: rgba(168,85,247,0.15); color: #c084fc; border-color: rgba(168,85,247,0.4); }

                .products-section { max-width: 1400px; margin: 0 auto; padding: 44px 40px 0; }
                .section-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 24px; }
                .section-title { font-size: 24px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.6px; }
                .section-meta { font-size: 13px; color: rgba(255,255,255,0.3); }
                .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
                .card { background: #141414; border-radius: 18px; overflow: hidden; cursor: pointer; transition: all 0.22s; border: 1px solid rgba(255,255,255,0.07); position: relative; }
                .card:hover { transform: translateY(-5px); box-shadow: 0 20px 56px rgba(0,0,0,0.5); border-color: rgba(255,255,255,0.14); }
                .card-img { width: 100%; height: 220px; background: #1a1a1a; display: flex; align-items: center; justify-content: center; font-size: 52px; overflow: hidden; }
                .card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
                .card:hover .card-img img { transform: scale(1.06); }
                .card-badge { position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); color: #fff; font-size: 10px; font-weight: 600; padding: 4px 9px; border-radius: 6px; text-transform: uppercase; border: 1px solid rgba(255,255,255,0.12); }
                .discount-badge { position: absolute; top: 12px; right: 12px; background: linear-gradient(135deg, #1a7f4b, #166534); color: #fff; font-size: 10px; font-weight: 700; padding: 4px 9px; border-radius: 6px; }
                .card-body { padding: 16px 18px 20px; }
                .card-cat { font-size: 11px; font-weight: 600; color: #4da3ff; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 5px; }
                .card-name { font-size: 15px; font-weight: 600; color: #f5f5f7; letter-spacing: -0.2px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .card-desc { font-size: 12px; color: rgba(255,255,255,0.32); line-height: 1.5; margin-bottom: 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 36px; }
                .card-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
                .card-price-wrap { display: flex; flex-direction: column; gap: 1px; }
                .card-price-original { font-size: 11px; color: rgba(255,255,255,0.25); text-decoration: line-through; }
                .card-price { font-size: 17px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.3px; }
                .card-price sup { font-size: 11px; font-weight: 500; vertical-align: super; }
                .stock { font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 20px; flex-shrink: 0; }
                .stock.in  { background: rgba(26,127,75,0.15); color: #4ade80; }
                .stock.low { background: rgba(180,83,9,0.15); color: #fbbf24; }
                .stock.out { background: rgba(192,57,43,0.15); color: #f87171; }
                .skel-card { background: #141414; border-radius: 18px; overflow: hidden; border: 1px solid rgba(255,255,255,0.07); }
                .skel { background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
                @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
                .empty { grid-column: 1 / -1; text-align: center; padding: 80px 20px; background: #141414; border-radius: 18px; border: 1px solid rgba(255,255,255,0.06); }
                .empty-icon { font-size: 40px; margin-bottom: 16px; }
                .empty-h { font-size: 17px; font-weight: 600; color: #f5f5f7; margin-bottom: 6px; }
                .empty-p { font-size: 14px; color: rgba(255,255,255,0.3); }

                .trusted { background: #0d0d0d; border-top: 1px solid rgba(255,255,255,0.06); padding: 56px 40px; margin-top: 64px; }
                .trusted-inner { max-width: 1400px; margin: 0 auto; text-align: center; }
                .trusted-title { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.2); letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 28px; }
                .trusted-logos { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
                .trusted-pill { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 980px; padding: 8px 20px; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.28); transition: all 0.15s; cursor: default; white-space: nowrap; }
                .trusted-pill:hover { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.6); transform: translateY(-1px); }

                .about { background: #0d0d0d; padding: 96px 40px; border-top: 1px solid rgba(255,255,255,0.06); }
                .about-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
                .about-tag { font-size: 11px; font-weight: 600; color: #4da3ff; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 14px; }
                .about-title { font-size: 44px; font-weight: 700; color: #f5f5f7; letter-spacing: -1.5px; line-height: 1.05; margin-bottom: 18px; }
                .about-title em { font-style: normal; background: linear-gradient(135deg, #4da3ff, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
                .about-desc { font-size: 16px; color: rgba(255,255,255,0.38); line-height: 1.8; margin-bottom: 32px; font-weight: 300; }
                .about-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
                .about-stat { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 20px; }
                .about-stat-num { font-size: 28px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.8px; margin-bottom: 4px; }
                .about-stat-label { font-size: 12px; color: rgba(255,255,255,0.28); }
                .about-values { display: flex; flex-direction: column; gap: 24px; }
                .about-value { display: flex; gap: 16px; align-items: flex-start; }
                .about-value-icon { width: 46px; height: 46px; border-radius: 13px; background: rgba(0,113,227,0.08); border: 1px solid rgba(0,113,227,0.18); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
                .about-value-title { font-size: 15px; font-weight: 600; color: #f5f5f7; margin-bottom: 5px; }
                .about-value-desc { font-size: 13px; color: rgba(255,255,255,0.32); line-height: 1.6; }

                .footer-top { background: #080808; border-top: 1px solid rgba(255,255,255,0.06); padding: 48px 40px; }
                .footer-top-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
                .footer-col-title { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.4); margin-bottom: 14px; }
                .footer-col-link { display: block; font-size: 12px; color: rgba(255,255,255,0.22); margin-bottom: 10px; cursor: pointer; transition: color 0.15s; }
                .footer-col-link:hover { color: rgba(255,255,255,0.6); }
                .footer-bottom { background: #080808; border-top: 1px solid rgba(255,255,255,0.05); padding: 20px 40px; }
                .footer-bottom-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
                .footer-copy { font-size: 12px; color: rgba(255,255,255,0.18); }
                .footer-links { display: flex; gap: 20px; }
                .footer-link { font-size: 12px; color: rgba(255,255,255,0.18); cursor: pointer; transition: color 0.15s; }
                .footer-link:hover { color: rgba(255,255,255,0.45); }

                @media (max-width: 768px) {
    .store-header { padding: 32px 20px 28px; flex-direction: column; align-items: flex-start; gap: 20px; }
    .store-header-left h1 { font-size: 52px; letter-spacing: -2px; }
    .store-header-right { text-align: left; max-width: 100%; }
    .store-header-links { align-items: flex-start; }
    .store-header-link { justify-content: flex-start; }
    .cat-icons-inner { padding: 20px; justify-content: flex-start; }
    .cat-icon-item { padding: 8px 16px; }
    .offers-bar { padding: 12px 20px; }
    .offers-inner { gap: 16px; justify-content: flex-start; }
    .latest-header { padding: 0 20px 16px; }
    .latest-scroll { padding: 0 20px 24px; }
    .filters-bar { padding: 0 16px; top: 88px; }
    .products-section { padding: 28px 16px 0; }
    .grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
    .card-img { height: 160px; }
    .about-inner { grid-template-columns: 1fr; gap: 40px; }
    .about-title { font-size: 28px; }
    .footer-top-inner { grid-template-columns: 1fr 1fr; gap: 24px; }
    .nav-logo-name { display: none; }
    .nav-user { display: none; }
    .trusted { padding: 32px 20px; margin-top: 32px; }
    .about { padding: 48px 20px; }
    .footer-top { padding: 32px 20px; }
    .footer-bottom { padding: 16px 20px; }
}
@media (max-width: 480px) {
    .store-header-left h1 { font-size: 38px; }
    .grid { grid-template-columns: 1fr 1fr; gap: 8px; }
    .card-name { font-size: 13px; }
    .card-price { font-size: 14px; }
    .footer-top-inner { grid-template-columns: 1fr; }
}
            `}</style>

            <div className="store">

                <div className="toast-container">
                    {toasts.map(toast => (
                        <div key={toast.id} className={`toast ${toast.type}`}>
                            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"} {toast.message}
                        </div>
                    ))}
                </div>

                <div className="offer-bar">
                    ✦ Free delivery on orders over ₹999 · No Cost EMI · Easy 7-day returns
                    <span onClick={() => router.push("/store/deals")}>See all offers →</span>
                </div>

                <nav className="nav">
                    <div className="nav-inner">
                        <div className="nav-left">
                            <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
                                <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                                    <path d="M1 1h14M1 6h14M1 11h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                            </button>

                        </div>
                        <div className="nav-search">
                            <span className="nav-search-icon">⌕</span>
                            <input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <div className="nav-right">
                            {user && <span className="nav-user">Hi, <strong>{user.name.split(" ")[0]}</strong></span>}
                            {(user?.role === "vendor" || user?.role === "admin") && (
                                <button className="nav-dash-btn" onClick={() => router.push(user.role === "vendor" ? "/vendor" : "/admin")}>Dashboard</button>
                            )}
                            {user?.role === "customer" && (
    <>
        <button className="nav-icon-btn" onClick={() => router.push("/store/wishlist")}>
            ♡ {wishlistCount > 0 && <span className="nav-badge">{wishlistCount}</span>}
        </button>
        <button className="nav-icon-btn" onClick={() => router.push("/store/cart")}>
            🛒 {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
        </button>
    </>
)}
                        </div>
                    </div>
                </nav>

                <div className="quick-links">
                    <div className="quick-links-inner">
                        <button className={`quick-link ${category === "" ? "active" : ""}`} onClick={() => scrollToProducts("")}>All</button>
                        {Object.keys(dropdownMenus).map((label) => {
                            const catId = label.toLowerCase();
                            return (
                                <div key={label} className="quick-link-wrap"
                                    onMouseEnter={(e) => handleDropdownEnter(label, e)}
                                    onMouseLeave={handleDropdownLeave}
                                >
                                    <button className={`quick-link ${category === catId ? "active" : ""}`} onClick={() => scrollToProducts(catId)}>
                                        {label}
                                    </button>
                                </div>
                            );
                        })}

                    </div>
                </div>

                {activeDropdown && (
                    <div
                        style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, zIndex: 99999 }}
                        onMouseEnter={() => clearTimeout(dropdownTimeout.current)}
                        onMouseLeave={handleDropdownLeave}
                    >
                        <div className="dropdown">
                            <div>
                                <div className="dropdown-col-title">Explore {activeDropdown}</div>
                                {dropdownMenus[activeDropdown].explore.map((item) => (
                                    <button key={item.label} className="dropdown-item"
                                        onClick={() => { item.action(activeDropdown.toLowerCase()); setActiveDropdown(null); }}>
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                            <div>
                                <div className="dropdown-col-title">Shop {activeDropdown}</div>
                                {dropdownMenus[activeDropdown].shop.map((item) => (
                                    <button key={item} className="dropdown-item-sm"
                                        onClick={() => handleDropdownShopItem(item, activeDropdown.toLowerCase())}>
                                        {item}
                                    </button>
                                ))}
                            </div>
                            <div>
                                <div className="dropdown-col-title">More</div>
                                {dropdownMenus[activeDropdown].more.map((item) => (
                                    <button key={item} className="dropdown-item-sm" onClick={() => setActiveDropdown(null)}>
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {sidebarOpen && (
                    <>
                        <div className={`sidebar-overlay ${closingSidebar ? "closing" : ""}`} onClick={closeSidebar} />
                        <div className={`sidebar ${closingSidebar ? "closing" : ""}`}>
                            <div className="sidebar-header">
                                <div className="sidebar-user">
                                    <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase() || "U"}</div>
                                    <div>
                                        <div className="sidebar-name">{user?.name}</div>
                                        <span className="sidebar-role">{user?.role}</span>
                                    </div>
                                </div>
                                <button className="sidebar-close" onClick={closeSidebar}>✕</button>
                            </div>
                            <div className="sidebar-section">
                                <div className="sidebar-section-title">My Account</div>
                                {user?.role === "customer" && (
    <>
        <button className="sidebar-item" onClick={() => { router.push("/store/wishlist"); closeSidebar(); }}>
            <div className="sidebar-item-icon">♡</div>
            <div><div className="sidebar-item-label">Wishlist</div><div className="sidebar-item-sub">Your saved items</div></div>
            {wishlistCount > 0 && <span className="sidebar-item-badge">{wishlistCount}</span>}
        </button>
        <button className="sidebar-item" onClick={() => { router.push("/store/cart"); closeSidebar(); }}>
            <div className="sidebar-item-icon">🛒</div>
            <div><div className="sidebar-item-label">Cart</div><div className="sidebar-item-sub">Review your items</div></div>
            {cartCount > 0 && <span className="sidebar-item-badge">{cartCount}</span>}
        </button>
    </>
)}
                            </div>
                            <div className="sidebar-divider" />
                            <div className="sidebar-section">
                                <div className="sidebar-section-title">Shop by category</div>
                                {categories.filter(c => c.id !== "").map((cat) => (
                                    <button key={cat.id} className="sidebar-item" onClick={() => { scrollToProducts(cat.id); closeSidebar(); }}>
                                        <div className="sidebar-item-icon">{cat.icon}</div>
                                        <div><div className="sidebar-item-label">{cat.label}</div></div>
                                    </button>
                                ))}
                            </div>
                            <div className="sidebar-divider" />
                            <div className="sidebar-section">
                                <div className="sidebar-section-title">Discover</div>
                                <button className="sidebar-item" onClick={() => { router.push("/store/new-arrivals"); closeSidebar(); }}>
                                    <div className="sidebar-item-icon">✨</div>
                                    <div><div className="sidebar-item-label">New Arrivals</div><div className="sidebar-item-sub">Latest products</div></div>
                                </button>
                                <button className="sidebar-item" onClick={() => { router.push("/store/deals"); closeSidebar(); }}>
                                    <div className="sidebar-item-icon">🔥</div>
                                    <div><div className="sidebar-item-label">Hot Deals</div><div className="sidebar-item-sub">Discounted items</div></div>
                                </button>
                                <button className="sidebar-item" onClick={() => { router.push("/store/sale"); closeSidebar(); }}>
                                    <div className="sidebar-item-icon">🏷</div>
                                    <div><div className="sidebar-item-label">Sale & Offers</div><div className="sidebar-item-sub">Best priced items</div></div>
                                </button>
                                <button className="sidebar-item" onClick={() => { router.push("/store/profile"); closeSidebar(); }}>
    <div className="sidebar-item-icon">👤</div>
    <div><div className="sidebar-item-label">My Profile</div><div className="sidebar-item-sub">Edit account details</div></div>
</button>
                            </div>
                            {(user?.role === "vendor" || user?.role === "admin") && (
                                <>
                                    <div className="sidebar-divider" />
                                    <div className="sidebar-section">
                                        <div className="sidebar-section-title">Seller</div>
                                        <button className="sidebar-item" onClick={() => { router.push(user.role === "vendor" ? "/vendor" : "/admin"); closeSidebar(); }}>
                                            <div className="sidebar-item-icon">⚙</div>
                                            <div><div className="sidebar-item-label">Dashboard</div><div className="sidebar-item-sub">Manage your store</div></div>
                                        </button>
                                    </div>
                                </>
                            )}
                            <div className="sidebar-footer">
                                <button className="sidebar-signout" onClick={handleLogout}>Sign out</button>
                            </div>
                        </div>
                    </>
                )}

                <div className="store-header">
                    <div className="store-header-left"><h1>Shop<span>X.</span></h1></div>
                    <div className="store-header-right">
                        <div className="store-header-tagline">The best way to buy the products you love.</div>
                        <div className="store-header-links">
                            <span className="store-header-link" onClick={() => router.push("/store/orders")}>Track your order ↗</span>
                            <span className="store-header-link" onClick={() => router.push("/store/cart")}>View your cart ↗</span>
                            <span className="store-header-link" onClick={() => router.push("/register")}>Become a vendor ↗</span>
                        </div>
                    </div>
                </div>

                <div className="cat-icons">
                    <div className="cat-icons-inner">
                        {categoryIcons.map((cat) => (
                            <button key={cat.id} className={`cat-icon-item ${category === cat.id ? "active" : ""}`} onClick={() => scrollToProducts(cat.id)}>
                                <div className="cat-icon-img-wrap">
                                    <img src={cat.img} alt={cat.label} onError={(e) => { e.target.style.display = "none"; e.target.parentNode.innerHTML = `<span class="cat-icon-emoji">${cat.fallback}</span>`; }} />
                                </div>
                                <span className="cat-icon-label">{cat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="offers-bar">
                    <div className="offers-inner">
                        <div className="offer-item"><div className="offer-item-icon">↩</div><span className="offer-item-text">Free delivery over ₹999</span></div>
                        <div className="offer-item"><div className="offer-item-icon">↩</div><span className="offer-item-text">No Cost EMI</span><span className="offer-item-link" onClick={() => router.push("/store/deals")}>See offers →</span></div>
                        <div className="offer-item"><div className="offer-item-icon">↩</div><span className="offer-item-text">Secure Razorpay</span></div>
                        <div className="offer-item"><div className="offer-item-icon">↩</div><span className="offer-item-text">7-day returns</span></div>
                    </div>
                </div>

                <div className="latest-section">
                    <div className="latest-header">
                        <div className="latest-title">The latest. <span>What's new right now.</span></div>
                        <button className="latest-see-all" onClick={() => router.push("/store/new-arrivals")}>See all →</button>
                    </div>
                    <div className="latest-scroll">
                        <div className="latest-track">
                            {featuredCards.map((card) => (
                                <div key={card.id} className="feat-card" onClick={() => router.push(`/store/new-arrivals?category=${card.id}`)}>
                                    <div className="feat-card-img">
                                        <img src={card.img} alt={card.title} onError={(e) => { e.target.style.display = "none"; }} />
                                    </div>
                                    <div className="feat-card-body">
                                        <div className="feat-card-eyebrow">{card.eyebrow}</div>
                                        <div className="feat-card-title">{card.title}</div>
                                        <div className="feat-card-sub">{card.sub}</div>
                                        <div className="feat-card-price">{card.price}</div>
                                        <div className="feat-card-cta">Shop now →</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="filters-bar">
                    <div className="filters-inner">
                        {categories.map((cat) => (
                            <button key={cat.id} className={`cat-pill ${category === cat.id ? "active" : ""}`}
                                onClick={() => { setCategory(cat.id); setGender(""); setSearch(""); }}>
                                {cat.icon} {cat.label}
                            </button>
                        ))}
                        {(category === "clothing" || category === "shoes") && (
                            <>
                                <div className="filter-divider" />
                                <button className={`gender-pill men ${gender === "men" ? "active" : ""}`} onClick={() => setGender(gender === "men" ? "" : "men")}>♂ Men</button>
                                <button className={`gender-pill women ${gender === "women" ? "active" : ""}`} onClick={() => setGender(gender === "women" ? "" : "women")}>♀ Women</button>
                            </>
                        )}
                    </div>
                </div>

                <div className="products-anchor" />
                <div className="products-section">
                    <div className="section-head">
                        <h2 className="section-title">
                            {search
                                ? `Results for "${search}"`
                                : gender && category
                                    ? `${gender === "men" ? "Men's" : "Women's"} ${categories.find(c => c.id === category)?.label}`
                                    : category ? categories.find(c => c.id === category)?.label : "All products"
                            }
                        </h2>
                        <span className="section-meta">{loading ? "Loading..." : `${products.length} items`}</span>
                    </div>
                    <div className="grid">
                        {loading ? (
                            [...Array(8)].map((_, i) => (
                                <div className="skel-card" key={i}>
                                    <div className="skel" style={{ height: 220, borderRadius: 0 }} />
                                    <div style={{ padding: 18 }}>
                                        <div className="skel" style={{ height: 10, width: "35%", marginBottom: 10 }} />
                                        <div className="skel" style={{ height: 15, width: "75%", marginBottom: 8 }} />
                                        <div className="skel" style={{ height: 11, width: "100%", marginBottom: 5 }} />
                                        <div className="skel" style={{ height: 11, width: "60%", marginBottom: 18 }} />
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <div className="skel" style={{ height: 18, width: "28%" }} />
                                            <div className="skel" style={{ height: 22, width: "22%", borderRadius: 20 }} />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : products.length === 0 ? (
                            <div className="empty">
                                <div className="empty-icon">🛍</div>
                                <div className="empty-h">No products found</div>
                                <div className="empty-p">Try a different search or category</div>
                            </div>
                        ) : (
                            products.map((p) => (
                                <div className="card" key={p.id} onClick={() => router.push(`/store/product/${p.id}`)}>
                                    <div className="card-img">
                                        {p.images?.[0] ? <img src={p.images[0]} alt={p.name} /> : "📦"}
                                        {p.stock < 10 && p.stock > 0 && <div className="card-badge">Low stock</div>}
                                    </div>
                                    {p.discount > 0 && <div className="discount-badge">{p.discount}% off</div>}
                                    <div className="card-body">
                                        <div className="card-cat">{p.category}</div>
                                        <div className="card-name">{p.name}</div>
                                        <div className="card-desc">{p.description || "No description available"}</div>
                                        <div className="card-foot">
                                            <div className="card-price-wrap">
                                                {p.discount > 0 && (
                                                    <div className="card-price-original">₹{p.price.toLocaleString("en-IN")}</div>
                                                )}
                                                <div className="card-price">
                                                    <sup>₹</sup>{discountedPrice(p.price, p.discount).toLocaleString("en-IN")}
                                                </div>
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

                <div className="trusted">
                    <div className="trusted-inner">
                        <div className="trusted-title">Trusted by the world's best brands</div>
                        <div className="trusted-logos">
                            {trustedBrands.map((brand) => (
                                <div key={brand} className="trusted-pill">{brand}</div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="about">
                    <div className="about-inner">
                        <div>
                            <div className="about-tag">About ShopX</div>
                            <h2 className="about-title">India's most trusted <em>marketplace.</em></h2>
                            <p className="about-desc">ShopX was built with one mission — to connect genuine vendors with real customers across India. We verify every vendor, ensure quality products, and provide a seamless shopping experience from browsing to doorstep delivery.</p>
                            <div className="about-stats">
                                <div className="about-stat"><div className="about-stat-num">50+</div><div className="about-stat-label">Verified vendors</div></div>
                                <div className="about-stat"><div className="about-stat-num">500+</div><div className="about-stat-label">Products listed</div></div>
                                <div className="about-stat"><div className="about-stat-num">10k+</div><div className="about-stat-label">Happy customers</div></div>
                                <div className="about-stat"><div className="about-stat-num">4.9★</div><div className="about-stat-label">Average rating</div></div>
                            </div>
                        </div>
                        <div className="about-values">
                            <div className="about-value">
                                <div className="about-value-icon">✓</div>
                                <div><div className="about-value-title">Verified vendors only</div><div className="about-value-desc">Every vendor goes through a manual approval process to ensure quality.</div></div>
                            </div>
                            <div className="about-value">
                                <div className="about-value-icon">🔒</div>
                                <div><div className="about-value-title">Secure payments</div><div className="about-value-desc">All transactions processed through Razorpay with bank-grade encryption.</div></div>
                            </div>
                            <div className="about-value">
                                <div className="about-value-icon">🚚</div>
                                <div><div className="about-value-title">Fast & free delivery</div><div className="about-value-desc">Free delivery on orders above ₹999. Delivered within 3-5 business days.</div></div>
                            </div>
                            <div className="about-value">
                                <div className="about-value-icon">↩</div>
                                <div><div className="about-value-title">Hassle-free returns</div><div className="about-value-desc">Return within 7 days for a full refund. No questions asked.</div></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="footer-top">
                    <div className="footer-top-inner">
                        <div>
                            <div className="footer-col-title">Shop</div>
                            <span className="footer-col-link" onClick={() => scrollToProducts("electronics")}>Electronics</span>
                            <span className="footer-col-link" onClick={() => scrollToProducts("clothing")}>Clothing</span>
                            <span className="footer-col-link" onClick={() => scrollToProducts("shoes")}>Shoes</span>
                            <span className="footer-col-link" onClick={() => scrollToProducts("accessories")}>Accessories</span>
                            <span className="footer-col-link" onClick={() => scrollToProducts("books")}>Books</span>
                        </div>
                        <div>
                            <div className="footer-col-title">Discover</div>
                            <span className="footer-col-link" onClick={() => router.push("/store/new-arrivals")}>New Arrivals</span>
                            <span className="footer-col-link" onClick={() => router.push("/store/deals")}>Hot Deals</span>
                            <span className="footer-col-link" onClick={() => router.push("/store/sale")}>Sale & Offers</span>
                        </div>
                        <div>
                            <div className="footer-col-title">Account</div>
                            <span className="footer-col-link" onClick={() => router.push("/store/orders")}>My Orders</span>
                            <span className="footer-col-link" onClick={() => router.push("/store/wishlist")}>Wishlist</span>
                            <span className="footer-col-link" onClick={() => router.push("/store/cart")}>Cart</span>
                            <span className="footer-col-link" onClick={() => router.push("/register")}>Become a vendor</span>
                        </div>
                        <div>
                            <div className="footer-col-title">ShopX</div>
                            <span className="footer-col-link">About us</span>
                            <span className="footer-col-link">Help centre</span>
                            <span className="footer-col-link">Privacy policy</span>
                            <span className="footer-col-link">Terms of service</span>
                            <span className="footer-col-link">Contact us</span>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <div className="footer-bottom-inner">
                        <span className="footer-copy">Copyright © {new Date().getFullYear()} ShopX. All rights reserved.</span>
                        <div className="footer-links">
                            <span className="footer-link">Privacy Policy</span>
                            <span className="footer-link">Terms of Use</span>
                            <span className="footer-link">Sitemap</span>
                        </div>
                    </div>
                </div>

            </div>
        </>
    );
}