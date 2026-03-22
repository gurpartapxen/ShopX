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
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                    position: relative;
                    overflow: hidden;
                }

                .bg-glow-1 {
                    position: absolute;
                    top: -200px;
                    left: -200px;
                    width: 600px;
                    height: 600px;
                    background: radial-gradient(circle, rgba(0,113,227,0.08) 0%, transparent 70%);
                    pointer-events: none;
                }

                .bg-glow-2 {
                    position: absolute;
                    bottom: -200px;
                    right: -200px;
                    width: 500px;
                    height: 500px;
                    background: radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%);
                    pointer-events: none;
                }

                .card {
                    background: #111;
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 24px;
                    padding: 40px;
                    width: 100%;
                    max-width: 400px;
                    box-shadow: 0 24px 80px rgba(0,0,0,0.5);
                    position: relative;
                    z-index: 1;
                }

                .logo {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 32px;
                    justify-content: center;
                }

                .logo-mark {
                    width: 36px;
                    height: 36px;
                    background: linear-gradient(135deg, #4da3ff, #0071e3);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    font-weight: 800;
                    color: #fff;
                    box-shadow: 0 4px 16px rgba(0,113,227,0.3);
                }

                .logo-name {
                    font-size: 20px;
                    font-weight: 700;
                    color: #f5f5f7;
                    letter-spacing: -0.5px;
                }

                .title {
                    font-size: 26px;
                    font-weight: 700;
                    color: #f5f5f7;
                    letter-spacing: -0.8px;
                    margin-bottom: 6px;
                    text-align: center;
                }

                .subtitle {
                    font-size: 14px;
                    color: rgba(255,255,255,0.4);
                    text-align: center;
                    margin-bottom: 32px;
                    font-weight: 300;
                }

                .error-box {
                    background: rgba(220,38,38,0.1);
                    border: 1px solid rgba(220,38,38,0.25);
                    border-radius: 10px;
                    padding: 12px 14px;
                    font-size: 13px;
                    color: #f87171;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .field {
                    margin-bottom: 16px;
                }

                .field label {
                    display: block;
                    font-size: 12px;
                    font-weight: 600;
                    color: rgba(255,255,255,0.5);
                    margin-bottom: 7px;
                    letter-spacing: 0.4px;
                    text-transform: uppercase;
                }

                .field-wrap {
                    position: relative;
                }

                .field input {
                    width: 100%;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    padding: 13px 16px;
                    font-size: 15px;
                    color: #f5f5f7;
                    font-family: 'Inter', sans-serif;
                    outline: none;
                    transition: all 0.15s;
                }

                .field input::placeholder { color: rgba(255,255,255,0.2); }

                .field input:focus {
                    background: rgba(255,255,255,0.09);
                    border-color: rgba(77,163,255,0.6);
                    box-shadow: 0 0 0 3px rgba(0,113,227,0.12);
                }

                .pass-toggle {
                    position: absolute;
                    right: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: rgba(255,255,255,0.3);
                    cursor: pointer;
                    font-size: 13px;
                    font-family: 'Inter', sans-serif;
                    font-weight: 500;
                    padding: 4px;
                    transition: color 0.15s;
                }

                .pass-toggle:hover { color: rgba(255,255,255,0.6); }

                .forgot {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: -8px;
                    margin-bottom: 24px;
                }

                .forgot a {
                    font-size: 12px;
                    color: #4da3ff;
                    cursor: pointer;
                    text-decoration: none;
                    transition: opacity 0.15s;
                }

                .forgot a:hover { opacity: 0.7; }

                .submit-btn {
                    width: 100%;
                    background: linear-gradient(135deg, #0071e3, #0056b3);
                    color: #fff;
                    border: none;
                    border-radius: 12px;
                    padding: 14px;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: all 0.2s;
                    box-shadow: 0 4px 20px rgba(0,113,227,0.3);
                    margin-bottom: 20px;
                    letter-spacing: -0.2px;
                }

                .submit-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 8px 28px rgba(0,113,227,0.4);
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
                    color: rgba(255,255,255,0.25);
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
                    transition: all 0.15s;
                    letter-spacing: -0.2px;
                }

                .register-btn:hover {
                    background: rgba(255,255,255,0.08);
                    border-color: rgba(255,255,255,0.18);
                }

                .footer-text {
                    text-align: center;
                    font-size: 12px;
                    color: rgba(255,255,255,0.2);
                    margin-top: 28px;
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

                <div className="card">
                    <div className="logo">
                        <div className="logo-mark">S</div>
                        <span className="logo-name">ShopX</span>
                    </div>

                    <h1 className="title">Welcome back</h1>
                    <p className="subtitle">Sign in to your account to continue</p>

                    {error && (
                        <div className="error-box">
                            ✕ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="field">
                            <label>Email address</label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="field">
                            <label>Password</label>
                            <div className="field-wrap">
                                <input
                                    type={showPass ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
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
                            <a>Forgot password?</a>
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
                        Create an account
                    </button>

                    <p className="footer-text">
                        By signing in, you agree to ShopX's Terms of Service and Privacy Policy.
                    </p>
                </div>
            </div>
        </>
    );
}