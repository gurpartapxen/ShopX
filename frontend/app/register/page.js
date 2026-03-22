"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
    const [form,    setForm]    = useState({ name: "", email: "", password: "", role: "customer", store_name: "", store_description: "" });
    const [error,   setError]   = useState("");
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [step,    setStep]    = useState(1);

    const { register, user, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && user) router.push("/store");
    }, [user, authLoading]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (step === 1 && form.role === "vendor") { setStep(2); return; }
        setLoading(true);
        setError("");
        try {
            await register(form);
            router.push("/store");
        } catch (err) {
            setError(err.response?.data?.message || "Registration failed. Please try again.");
            setStep(1);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                body { background: #0a0a0a; }

                .page {
                    min-height: 100vh;
                    background: #0a0a0a;
                    font-family: 'Inter', -apple-system, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                    position: relative;
                    overflow: hidden;
                }

                .bg-glow-1 { position: absolute; top: -200px; right: -100px; width: 600px; height: 600px; background: radial-gradient(circle, rgba(0,113,227,0.07) 0%, transparent 70%); pointer-events: none; }
                .bg-glow-2 { position: absolute; bottom: -200px; left: -100px; width: 500px; height: 500px; background: radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%); pointer-events: none; }

                .card {
                    background: #111;
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 24px;
                    padding: 40px;
                    width: 100%;
                    max-width: 440px;
                    box-shadow: 0 24px 80px rgba(0,0,0,0.5);
                    position: relative;
                    z-index: 1;
                }

                .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; justify-content: center; }
                .logo-mark { width: 36px; height: 36px; background: linear-gradient(135deg, #4da3ff, #0071e3); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: #fff; box-shadow: 0 4px 16px rgba(0,113,227,0.3); }
                .logo-name { font-size: 20px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.5px; }

                .step-indicator { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 24px; }
                .step-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.15); transition: all 0.2s; }
                .step-dot.active { width: 24px; border-radius: 4px; background: #0071e3; }
                .step-dot.done { background: #1a7f4b; }

                .title { font-size: 24px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.7px; margin-bottom: 6px; text-align: center; }
                .subtitle { font-size: 14px; color: rgba(255,255,255,0.38); text-align: center; margin-bottom: 28px; font-weight: 300; line-height: 1.5; }

                .error-box { background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.25); border-radius: 10px; padding: 12px 14px; font-size: 13px; color: #f87171; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }

                .role-selector { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
                .role-card { border: 1.5px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 16px; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.03); text-align: center; }
                .role-card:hover { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.06); }
                .role-card.selected { border-color: #0071e3; background: rgba(0,113,227,0.1); }
                .role-card.selected.vendor { border-color: #a78bfa; background: rgba(139,92,246,0.1); }
                .role-icon { font-size: 24px; margin-bottom: 6px; }
                .role-label { font-size: 14px; font-weight: 600; color: #f5f5f7; margin-bottom: 2px; }
                .role-desc { font-size: 11px; color: rgba(255,255,255,0.35); }

                .field { margin-bottom: 14px; }
                .field label { display: block; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.45); margin-bottom: 7px; letter-spacing: 0.4px; text-transform: uppercase; }
                .field-wrap { position: relative; }
                .field input, .field textarea { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 13px 16px; font-size: 15px; color: #f5f5f7; font-family: 'Inter', sans-serif; outline: none; transition: all 0.15s; resize: none; }
                .field input::placeholder, .field textarea::placeholder { color: rgba(255,255,255,0.2); }
                .field input:focus, .field textarea:focus { background: rgba(255,255,255,0.09); border-color: rgba(77,163,255,0.6); box-shadow: 0 0 0 3px rgba(0,113,227,0.12); }
                .pass-toggle { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; font-size: 13px; font-family: 'Inter', sans-serif; font-weight: 500; padding: 4px; transition: color 0.15s; }
                .pass-toggle:hover { color: rgba(255,255,255,0.6); }

                .vendor-info { background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.2); border-radius: 12px; padding: 14px; margin-bottom: 20px; font-size: 13px; color: rgba(255,255,255,0.5); line-height: 1.5; }
                .vendor-info strong { color: #a78bfa; }

                .submit-btn { width: 100%; background: linear-gradient(135deg, #0071e3, #0056b3); color: #fff; border: none; border-radius: 12px; padding: 14px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; box-shadow: 0 4px 20px rgba(0,113,227,0.3); margin-bottom: 16px; letter-spacing: -0.2px; }
                .submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(0,113,227,0.4); }
                .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
                .submit-btn.vendor-btn { background: linear-gradient(135deg, #7c3aed, #6d28d9); box-shadow: 0 4px 20px rgba(124,58,237,0.3); }
                .submit-btn.vendor-btn:hover:not(:disabled) { box-shadow: 0 8px 28px rgba(124,58,237,0.4); }

                .back-btn { width: 100%; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 13px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; margin-bottom: 16px; }
                .back-btn:hover { background: rgba(255,255,255,0.08); }

                .divider { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
                .divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.08); }
                .divider-text { font-size: 12px; color: rgba(255,255,255,0.22); }

                .login-btn { width: 100%; background: rgba(255,255,255,0.04); color: #f5f5f7; border: 1px solid rgba(255,255,255,0.09); border-radius: 12px; padding: 13px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; }
                .login-btn:hover { background: rgba(255,255,255,0.08); }

                .footer-text { text-align: center; font-size: 12px; color: rgba(255,255,255,0.18); margin-top: 24px; line-height: 1.6; }

                .loading-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; margin-right: 8px; vertical-align: middle; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <div className="page">
                <div className="bg-glow-1" />
                <div className="bg-glow-2" />

                <div className="card">
                    <div className="logo">
                        <div className="logo-mark">S</div>
                        <span className="logo-name">ShopX</span>
                    </div>

                    {form.role === "vendor" && (
                        <div className="step-indicator">
                            <div className={`step-dot ${step >= 1 ? (step > 1 ? "done" : "active") : ""}`} />
                            <div className={`step-dot ${step >= 2 ? "active" : ""}`} />
                        </div>
                    )}

                    <h1 className="title">
                        {step === 1 ? "Create account" : "Set up your store"}
                    </h1>
                    <p className="subtitle">
                        {step === 1
                            ? "Join thousands of shoppers on ShopX"
                            : "Tell us about your store — admins will review and approve it"
                        }
                    </p>

                    {error && <div className="error-box">✕ {error}</div>}

                    <form onSubmit={handleSubmit}>
                        {step === 1 && (
                            <>
                                <div style={{ marginBottom: 20 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", marginBottom: 10, letterSpacing: "0.4px", textTransform: "uppercase" }}>
                                        I want to
                                    </div>
                                    <div className="role-selector">
                                        <div className={`role-card ${form.role === "customer" ? "selected" : ""}`} onClick={() => setForm({...form, role: "customer"})}>
                                            <div className="role-icon">🛍</div>
                                            <div className="role-label">Shop</div>
                                            <div className="role-desc">Buy products</div>
                                        </div>
                                        <div className={`role-card vendor ${form.role === "vendor" ? "selected vendor" : ""}`} onClick={() => setForm({...form, role: "vendor"})}>
                                            <div className="role-icon">🏪</div>
                                            <div className="role-label">Sell</div>
                                            <div className="role-desc">Start a store</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="field">
                                    <label>Full name</label>
                                    <input
                                        type="text"
                                        placeholder="Your full name"
                                        value={form.name}
                                        onChange={e => setForm({...form, name: e.target.value})}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="field">
                                    <label>Email address</label>
                                    <input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={form.email}
                                        onChange={e => setForm({...form, email: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="field">
                                    <label>Password</label>
                                    <div className="field-wrap">
                                        <input
                                            type={showPass ? "text" : "password"}
                                            placeholder="Min. 8 characters"
                                            value={form.password}
                                            onChange={e => setForm({...form, password: e.target.value})}
                                            required
                                            minLength={6}
                                            style={{ paddingRight: 60 }}
                                        />
                                        <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                                            {showPass ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" className={`submit-btn ${form.role === "vendor" ? "vendor-btn" : ""}`} disabled={loading}>
                                    {loading ? <><span className="loading-spinner" />Creating account...</>
                                        : form.role === "vendor" ? "Continue to store setup →" : "Create account"
                                    }
                                </button>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <div className="vendor-info">
                                    <strong>🏪 Vendor account</strong><br />
                                    Your store will be reviewed by our admin team before it goes live. This usually takes 24 hours.
                                </div>

                                <div className="field">
                                    <label>Store name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Tech Gadgets Store"
                                        value={form.store_name}
                                        onChange={e => setForm({...form, store_name: e.target.value})}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="field">
                                    <label>Store description</label>
                                    <textarea
                                        rows={3}
                                        placeholder="What do you sell? Tell customers about your store..."
                                        value={form.store_description}
                                        onChange={e => setForm({...form, store_description: e.target.value})}
                                    />
                                </div>

                                <button type="submit" className="submit-btn vendor-btn" disabled={loading}>
                                    {loading ? <><span className="loading-spinner" />Creating account...</> : "Create vendor account"}
                                </button>

                                <button type="button" className="back-btn" onClick={() => setStep(1)}>
                                    ← Back
                                </button>
                            </>
                        )}
                    </form>

                    {step === 1 && (
                        <>
                            <div className="divider">
                                <div className="divider-line" />
                                <span className="divider-text">Already have an account?</span>
                                <div className="divider-line" />
                            </div>
                            <button className="login-btn" onClick={() => router.push("/login")}>
                                Sign in instead
                            </button>
                        </>
                    )}

                    <p className="footer-text">
                        By creating an account, you agree to ShopX's<br />
                        Terms of Service and Privacy Policy.
                    </p>
                </div>
            </div>
        </>
    );
}