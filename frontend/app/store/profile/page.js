"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authAPI, ordersAPI } from "@/lib/api";

export default function ProfilePage() {
    const [profile,    setProfile]    = useState(null);
    const [orders,     setOrders]     = useState([]);
    const [tab,        setTab]        = useState("profile");
    const [loading,    setLoading]    = useState(true);
    const [saving,     setSaving]     = useState(false);
    const [success,    setSuccess]    = useState("");
    const [error,      setError]      = useState("");

    const [form, setForm] = useState({
        name: "", email: "", phone: "", address: "", city: "", pincode: "", state: ""
    });

    const [passForm, setPassForm] = useState({
        old_password: "", new_password: "", confirm_password: ""
    });
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);

    const { user, loading: authLoading, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) router.push("/login");
        else if (user) fetchProfile();
    }, [user, authLoading]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const [profileRes, ordersRes] = await Promise.all([
                authAPI.profile(),
                ordersAPI.myOrders(),
            ]);
            const p = profileRes.data.data;
            setProfile(p);
            setForm({
                name:    p.name    || "",
                email:   p.email   || "",
                phone:   p.phone   || "",
                address: p.address || "",
                city:    p.city    || "",
                pincode: p.pincode || "",
                state:   p.state   || "",
            });
            setOrders(ordersRes.data.data.orders || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        setSuccess("");
        try {
            const res = await authAPI.updateProfile(form);
            // update localStorage user
            const updatedUser = { ...user, name: form.name, email: form.email };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            setSuccess("Profile updated successfully!");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passForm.new_password !== passForm.confirm_password) {
            setError("New passwords don't match");
            return;
        }
        setSaving(true);
        setError("");
        setSuccess("");
        try {
            await authAPI.changePassword({
                old_password: passForm.old_password,
                new_password: passForm.new_password,
            });
            setPassForm({ old_password: "", new_password: "", confirm_password: "" });
            setSuccess("Password changed successfully!");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to change password");
        } finally {
            setSaving(false);
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
                .page { min-height: 100vh; background: #0a0a0a; font-family: 'Inter', -apple-system, sans-serif; color: #f5f5f7; }
                .nav { background: rgba(10,10,10,0.9); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.07); position: sticky; top: 0; z-index: 100; }
                .nav-inner { max-width: 900px; margin: 0 auto; padding: 0 24px; height: 52px; display: flex; align-items: center; justify-content: space-between; }
                .logo { display: flex; align-items: center; gap: 8px; cursor: pointer; }
                .logo-mark { width: 28px; height: 28px; background: linear-gradient(135deg,#4da3ff,#0071e3); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #fff; }
                .logo-name { font-size: 15px; font-weight: 700; color: #f5f5f7; }
                .back-btn { font-size: 13px; color: #4da3ff; font-weight: 500; background: none; border: none; cursor: pointer; font-family: 'Inter', sans-serif; }

                .container { max-width: 900px; margin: 0 auto; padding: 40px 24px 80px; }

                .profile-header { display: flex; align-items: center; gap: 20px; margin-bottom: 32px; background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 28px; }
                .avatar-big { width: 72px; height: 72px; background: linear-gradient(135deg,#4da3ff,#0071e3); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: #fff; flex-shrink: 0; }
                .profile-info { flex: 1; }
                .profile-name { font-size: 22px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.5px; margin-bottom: 4px; }
                .profile-email { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 8px; }
                .role-badge { display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; text-transform: capitalize; background: rgba(0,113,227,0.15); color: #4da3ff; border: 1px solid rgba(0,113,227,0.2); }
                .profile-stats { display: flex; gap: 24px; margin-left: auto; }
                .profile-stat { text-align: center; }
                .profile-stat-val { font-size: 22px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.5px; }
                .profile-stat-label { font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 2px; }

                .tabs { display: flex; gap: 2px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 4px; width: fit-content; margin-bottom: 24px; }
                .tab { padding: 9px 20px; border-radius: 9px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; background: none; color: rgba(255,255,255,0.4); font-family: 'Inter', sans-serif; transition: all 0.15s; }
                .tab.active { background: #1a1a1a; color: #f5f5f7; box-shadow: 0 1px 4px rgba(0,0,0,0.3); }

                .card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 24px; margin-bottom: 16px; }
                .card-title { font-size: 15px; font-weight: 600; color: #f5f5f7; margin-bottom: 20px; letter-spacing: -0.3px; }

                .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
                .field { margin-bottom: 14px; }
                .field:last-child { margin-bottom: 0; }
                .field label { display: block; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); margin-bottom: 7px; text-transform: uppercase; letter-spacing: 0.4px; }
                .field input, .field select { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 11px 14px; font-size: 14px; color: #f5f5f7; font-family: 'Inter', sans-serif; outline: none; transition: all 0.15s; }
                .field input::placeholder { color: rgba(255,255,255,0.2); }
                .field input:focus, .field select:focus { background: rgba(255,255,255,0.09); border-color: rgba(77,163,255,0.5); box-shadow: 0 0 0 3px rgba(0,113,227,0.1); }
                .field select option { background: #1a1a1a; color: #f5f5f7; }
                .field-wrap { position: relative; }
                .pass-toggle { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; font-size: 13px; font-family: 'Inter', sans-serif; font-weight: 500; }
                .pass-toggle:hover { color: rgba(255,255,255,0.6); }

                .success-msg { background: rgba(26,127,75,0.1); border: 1px solid rgba(26,127,75,0.25); color: #4ade80; border-radius: 10px; padding: 12px 16px; font-size: 13px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
                .error-msg { background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.25); color: #f87171; border-radius: 10px; padding: 12px 16px; font-size: 13px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }

                .save-btn { background: linear-gradient(135deg,#0071e3,#0056b3); color: #fff; border: none; border-radius: 10px; padding: 12px 28px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; box-shadow: 0 4px 16px rgba(0,113,227,0.2); }
                .save-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,113,227,0.3); }
                .save-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

                .danger-zone { background: rgba(220,38,38,0.05); border: 1px solid rgba(220,38,38,0.15); border-radius: 18px; padding: 24px; }
                .danger-title { font-size: 15px; font-weight: 600; color: #f87171; margin-bottom: 8px; }
                .danger-desc { font-size: 13px; color: rgba(255,255,255,0.35); margin-bottom: 16px; }
                .danger-btn { background: rgba(220,38,38,0.1); color: #f87171; border: 1px solid rgba(220,38,38,0.2); border-radius: 10px; padding: 11px 20px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; }
                .danger-btn:hover { background: rgba(220,38,38,0.2); }

                .orders-list { display: flex; flex-direction: column; gap: 10px; }
                .order-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.15s; }
                .order-card:hover { border-color: rgba(255,255,255,0.14); transform: translateY(-1px); }
                .order-id { font-size: 14px; font-weight: 600; color: #f5f5f7; margin-bottom: 3px; }
                .order-date { font-size: 12px; color: rgba(255,255,255,0.3); }
                .order-right { display: flex; align-items: center; gap: 12px; }
                .status-badge { font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 20px; text-transform: capitalize; }
                .order-total { font-size: 15px; font-weight: 700; color: #f5f5f7; }
                .empty-orders { text-align: center; padding: 48px; color: rgba(255,255,255,0.25); font-size: 14px; }

                @media (max-width: 768px) {
    .container { padding: 24px 16px 60px; }
    .profile-header { flex-direction: column; gap: 16px; }
    .profile-stats { margin-left: 0; }
    .field-grid { grid-template-columns: 1fr; }
    .tabs { width: 100%; overflow-x: auto; }
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
                    {/* Profile header */}
                    <div className="profile-header">
                        <div className="avatar-big">{profile?.name?.[0]?.toUpperCase()}</div>
                        <div className="profile-info">
                            <div className="profile-name">{profile?.name}</div>
                            <div className="profile-email">{profile?.email}</div>
                            <span className="role-badge">{profile?.role}</span>
                        </div>
                        <div className="profile-stats">
                            <div className="profile-stat">
                                <div className="profile-stat-val">{orders.length}</div>
                                <div className="profile-stat-label">Orders</div>
                            </div>
                            <div className="profile-stat">
                                <div className="profile-stat-val">
                                    {orders.filter(o => o.status === "delivered").length}
                                </div>
                                <div className="profile-stat-label">Delivered</div>
                            </div>
                        </div>
                    </div>

                    <div className="tabs">
                        {["profile", "orders", "password"].map(t => (
                            <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => { setTab(t); setError(""); setSuccess(""); }}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* ── Profile tab ── */}
                    {tab === "profile" && (
                        <form onSubmit={handleUpdateProfile}>
                            {success && <div className="success-msg">✓ {success}</div>}
                            {error   && <div className="error-msg">✕ {error}</div>}

                            <div className="card">
                                <div className="card-title">Personal information</div>
                                <div className="field-grid">
                                    <div className="field">
                                        <label>Full name</label>
                                        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your full name" required />
                                    </div>
                                    <div className="field">
                                        <label>Email address</label>
                                        <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@example.com" required />
                                    </div>
                                </div>
                                <div className="field">
                                    <label>Phone number</label>
                                    <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="10-digit mobile number" />
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-title">Delivery address</div>
                                <div className="field">
                                    <label>Street address</label>
                                    <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="House no., street, area" />
                                </div>
                                <div className="field-grid">
                                    <div className="field">
                                        <label>City</label>
                                        <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="City" />
                                    </div>
                                    <div className="field">
                                        <label>Pincode</label>
                                        <input value={form.pincode} onChange={e => setForm({...form, pincode: e.target.value})} placeholder="6-digit pincode" maxLength={6} />
                                    </div>
                                </div>
                                <div className="field">
                                    <label>State</label>
                                    <select value={form.state} onChange={e => setForm({...form, state: e.target.value})}>
                                        <option value="">Select state</option>
                                        {["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh","Puducherry"].map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <button type="submit" className="save-btn" disabled={saving}>
                                    {saving ? "Saving..." : "Save changes"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ── Orders tab ── */}
                    {tab === "orders" && (
                        <div>
                            {orders.length === 0 ? (
                                <div className="card">
                                    <div className="empty-orders">
                                        <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
                                        <div style={{ fontWeight: 600, color: "#f5f5f7", marginBottom: 6 }}>No orders yet</div>
                                        <div>Your order history will appear here</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="orders-list">
                                    {orders.map(order => {
                                        const style = statusStyle(order.status);
                                        const date  = new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                                        return (
                                            <div className="order-card" key={order.id} onClick={() => router.push(`/store/orders/${order.id}`)}>
                                                <div>
                                                    <div className="order-id">Order #{order.id.slice(-8).toUpperCase()}</div>
                                                    <div className="order-date">{date} · {order.items?.length} item{order.items?.length > 1 ? "s" : ""}</div>
                                                </div>
                                                <div className="order-right">
                                                    <span className="status-badge" style={{ background: style.bg, color: style.color }}>{order.status}</span>
                                                    <div className="order-total">₹{order.total?.toLocaleString("en-IN")}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Password tab ── */}
                    {tab === "password" && (
                        <div>
                            {success && <div className="success-msg">✓ {success}</div>}
                            {error   && <div className="error-msg">✕ {error}</div>}

                            <form onSubmit={handleChangePassword}>
                                <div className="card">
                                    <div className="card-title">Change password</div>
                                    <div className="field">
                                        <label>Current password</label>
                                        <div className="field-wrap">
                                            <input type={showOld ? "text" : "password"} value={passForm.old_password} onChange={e => setPassForm({...passForm, old_password: e.target.value})} placeholder="Enter current password" required style={{ paddingRight: 60 }} />
                                            <button type="button" className="pass-toggle" onClick={() => setShowOld(!showOld)}>{showOld ? "Hide" : "Show"}</button>
                                        </div>
                                    </div>
                                    <div className="field">
                                        <label>New password</label>
                                        <div className="field-wrap">
                                            <input type={showNew ? "text" : "password"} value={passForm.new_password} onChange={e => setPassForm({...passForm, new_password: e.target.value})} placeholder="Min 6 characters" required style={{ paddingRight: 60 }} />
                                            <button type="button" className="pass-toggle" onClick={() => setShowNew(!showNew)}>{showNew ? "Hide" : "Show"}</button>
                                        </div>
                                    </div>
                                    <div className="field">
                                        <label>Confirm new password</label>
                                        <input type="password" value={passForm.confirm_password} onChange={e => setPassForm({...passForm, confirm_password: e.target.value})} placeholder="Repeat new password" required />
                                    </div>
                                    <button type="submit" className="save-btn" disabled={saving}>
                                        {saving ? "Changing..." : "Change password"}
                                    </button>
                                </div>
                            </form>

                            <div className="danger-zone">
                                <div className="danger-title">Danger zone</div>
                                <div className="danger-desc">Once you sign out, you&apos;ll need to log back in with your credentials.</div>
                                <button className="danger-btn" onClick={logout}>Sign out of all devices</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}