"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
    const [email,    setEmail]    = useState("");
    const [password, setPassword] = useState("");
    const [error,    setError]    = useState("");
    const [loading,  setLoading]  = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [focused, setFocused] = useState("");

    const { login, user, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && user) router.push("/store");
    }, [user, authLoading]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await login(email, password);
            router.push("/store");
        } catch (err) {
            setError(err.response?.data?.message || "Invalid email or password");
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
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    position: relative;
                    overflow: hidden;
                }

                @media (max-width: 768px) {
                    .page { grid-template-columns: 1fr; }
                    .left-section { display: none !important; }
                    .right-section { padding: 20px; }
                }

                .bg-glow-1 {
                    position: absolute;
                    top: -300px;
                    left: -200px;
                    width: 700px;
                    height: 700px;
                    background: radial-gradient(circle, rgba(0,113,227,0.12) 0%, transparent 70%);
                    pointer-events: none;
                }

                .bg-glow-2 {
                    position: absolute;
                    bottom: -300px;
                    right: -200px;
                    width: 600px;
                    height: 600px;
                    background: radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%);
                    pointer-events: none;
                }

                .left-section {
                    background: linear-gradient(135deg, rgba(0,113,227,0.1) 0%, rgba(139,92,246,0.05) 100%);
                    border-right: 1px solid rgba(255,255,255,0.06);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    padding: 60px 40px;
                    position: relative;
                    z-index: 1;
                }

                .benefit-item {
                    margin-bottom: 48px;
                    opacity: 0;
                    animation: slideIn 0.6s ease-out forwards;
                }

                .benefit-item:nth-child(1) { animation-delay: 0.1s; }
                .benefit-item:nth-child(2) { animation-delay: 0.2s; }
                .benefit-item:nth-child(3) { animation-delay: 0.3s; }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .benefit-icon {
                    font-size: 32px;
                    margin-bottom: 12px;
                }

                .benefit-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: #f5f5f7;
                    margin-bottom: 6px;
                }

                .benefit-text {
                    font-size: 13px;
                    color: rgba(255,255,255,0.45);
                    line-height: 1.6;
                }

                .right-section {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 40px;
                    position: relative;
                    z-index: 2;
                }

                .card {
                    background: rgba(17,17,17,0.8);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 28px;
                    padding: 48px;
                    width: 100%;
                    max-width: 420px;
                    box-shadow: 0 20px 80px rgba(0,0,0,0.4);
                }

                .logo {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 36px;
                }

                .logo-mark {
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, #4da3ff, #0071e3);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    font-weight: 800;
                    color: #fff;
                    box-shadow: 0 4px 16px rgba(0,113,227,0.3);
                }

                .logo-name {
                    font-size: 22px;
                    font-weight: 700;
                    color: #f5f5f7;
                    letter-spacing: -0.5px;
                }

                .title {
                    font-size: 32px;
                    font-weight: 700;
                    color: #f5f5f7;
                    letter-spacing: -0.8px;
                    margin-bottom: 8px;
                }

                .subtitle {
                    font-size: 14px;
                    color: rgba(255,255,255,0.45);
                    margin-bottom: 32px;
                    font-weight: 400;
                    line-height: 1.5;
                }

                .error-box {
                    background: rgba(239,68,68,0.12);
                    border: 1px solid rgba(239,68,68,0.3);
                    border-radius: 12px;
                    padding: 12px 16px;
                    font-size: 13px;
                    color: #fca5a5;
                    margin-bottom: 24px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    animation: shake 0.3s ease-in-out;
                }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }

                .field {
                    margin-bottom: 18px;
                }

                .field label {
                    display: block;
                    font-size: 12px;
                    font-weight: 600;
                    color: rgba(255,255,255,0.5);
                    margin-bottom: 8px;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                }

                .field-wrap {
                    position: relative;
                }

                .field input {
                    width: 100%;
                    background: rgba(255,255,255,0.06);
                    border: 1.5px solid rgba(255,255,255,0.08);
                    border-radius: 14px;
                    padding: 14px 16px;
                    font-size: 15px;
                    color: #f5f5f7;
                    font-family: 'Inter', sans-serif;
                    outline: none;
                    transition: all 0.25s;
                }

                .field input::placeholder {
                    color: rgba(255,255,255,0.22);
                }

                .field input:hover {
                    background: rgba(255,255,255,0.09);
                    border-color: rgba(255,255,255,0.12);
                }

                .field input:focus {
                    background: rgba(255,255,255,0.1);
                    border-color: rgba(77,163,255,0.7);
                    box-shadow: 0 0 0 3px rgba(0,113,227,0.15);
                }

                .pass-toggle {
                    position: absolute;
                    right: 16px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: rgba(255,255,255,0.35);
                    cursor: pointer;
                    font-size: 13px;
                    font-family: 'Inter', sans-serif;
                    font-weight: 500;
                    padding: 6px 8px;
                    transition: color 0.2s;
                }

                .pass-toggle:hover {
                    color: rgba(255,255,255,0.7);
                }

                .forgot {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: -6px;
                    margin-bottom: 28px;
                }

                .forgot a {
                    font-size: 13px;
                    color: #60a5fa;
                    cursor: pointer;
                    text-decoration: none;
                    transition: all 0.2s;
                    font-weight: 500;
                }

                .forgot a:hover {
                    color: #93c5fd;
                }

                .submit-btn {
                    width: 100%;
                    background: linear-gradient(135deg, #0071e3 0%, #0056b3 100%);
                    color: #fff;
                    border: none;
                    border-radius: 14px;
                    padding: 14px;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: all 0.2s;
                    box-shadow: 0 4px 20px rgba(0,113,227,0.3);
                    margin-bottom: 20px;
                    letter-spacing: -0.3px;
                }

                .submit-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 32px rgba(0,113,227,0.4);
                }

                .submit-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                .divider {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 20px;
                }

                .divider-line {
                    flex: 1;
                    height: 1px;
                    background: rgba(255,255,255,0.08);
                }

                .divider-text {
                    font-size: 12px;
                    color: rgba(255,255,255,0.3);
                    font-weight: 500;
                }

                .social-buttons {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 20px;
                }

                .social-btn {
                    background: rgba(255,255,255,0.06);
                    border: 1.5px solid rgba(255,255,255,0.08);
                    border-radius: 12px;
                    padding: 12px;
                    font-size: 13px;
                    font-weight: 500;
                    color: #f5f5f7;
                    cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }

                .social-btn:hover {
                    background: rgba(255,255,255,0.1);
                    border-color: rgba(255,255,255,0.15);
                }

                .register-btn {
                    width: 100%;
                    background: rgba(255,255,255,0.05);
                    color: #f5f5f7;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    padding: 13px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: all 0.2s;
                    letter-spacing: -0.2px;
                }

                .register-btn:hover {
                    background: rgba(255,255,255,0.08);
                    border-color: rgba(255,255,255,0.18);
                }

                .footer-text {
                    text-align: center;
                    font-size: 11px;
                    color: rgba(255,255,255,0.25);
                    margin-top: 24px;
                    line-height: 1.6;
                }

                .loading-spinner {
                    display: inline-block;
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: spin 0.7s linear infinite;
                    margin-right: 8px;
                    vertical-align: middle;
                }

                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <div className="page">
                <div className="bg-glow-1" />
                <div className="bg-glow-2" />

                <div className="left-section">
                    <div className="benefit-item">
                        <div className="benefit-icon">🛍️</div>
                        <div className="benefit-title">Discover Amazing Products</div>
                        <div className="benefit-text">Browse thousands of products from verified sellers in every category.</div>
                    </div>

                    <div className="benefit-item">
                        <div className="benefit-icon">✨</div>
                        <div className="benefit-title">Seamless Experience</div>
                        <div className="benefit-text">Fast checkout, secure payments, and real-time order tracking at your fingertips.</div>
                    </div>

                    <div className="benefit-item">
                        <div className="benefit-icon">🏆</div>
                        <div className="benefit-title">Trusted Community</div>
                        <div className="benefit-text">Join millions of shoppers and sellers in the most reliable marketplace.</div>
                    </div>
                </div>

                <div className="right-section">
                    <div className="card">
                        <div className="logo">
                            <div className="logo-mark">S</div>
                            <span className="logo-name">ShopX</span>
                        </div>

                        <h1 className="title">Welcome back</h1>
                        <p className="subtitle">Access your account and continue shopping</p>

                        {error && (
                            <div className="error-box">
                                ⚠ {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="field">
                                <label>Email address</label>
                                <div className="field-wrap">
                                    <input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        onFocus={() => setFocused("email")}
                                        onBlur={() => setFocused("")}
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="field">
                                <label>Password</label>
                                <div className="field-wrap">
                                    <input
                                        type={showPass ? "text" : "password"}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        onFocus={() => setFocused("password")}
                                        onBlur={() => setFocused("")}
                                        required
                                        style={{ paddingRight: 60 }}
                                    />
                                    <button
                                        type="button"
                                        className="pass-toggle"
                                        onClick={() => setShowPass(!showPass)}
                                    >
                                        {showPass ? "Hide" : "Show"}
                                    </button>
                                </div>
                            </div>

                            <div className="forgot">
                                <a href="#forgot">Forgot password?</a>
                            </div>

                            <button type="submit" className="submit-btn" disabled={loading}>
                                {loading ? <><span className="loading-spinner" />Signing in...</> : "Sign in"}
                            </button>
                        </form>

                        <div className="divider">
                            <div className="divider-line" />
                            <span className="divider-text">New to ShopX?</span>
                            <div className="divider-line" />
                        </div>

                        <button className="register-btn" onClick={() => router.push("/register")}>
                            Create an account →
                        </button>

                        <p className="footer-text">
                            By signing in, you agree to ShopX&apos;s Terms of Service and Privacy Policy.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
