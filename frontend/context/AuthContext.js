"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authAPI, setAccessToken, clearAccessToken } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user,    setUser]    = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser    = localStorage.getItem("user");
        const savedRefresh = localStorage.getItem("refresh_token");

        // Nothing persisted — user was never logged in or already logged out
        if (!savedUser || !savedRefresh) {
            setLoading(false);
            return;
        }

        // Restore display state immediately so the UI doesn't flash the login page
        setUser(JSON.parse(savedUser));

        // Exchange the refresh token for a fresh access token.
        // Strategy (belt & suspenders):
        //   1. Sends the stored refresh token in the request body (works everywhere,
        //      including local dev where 127.0.0.1 ≠ localhost breaks cookie sending).
        //   2. withCredentials: true also sends the HttpOnly cookie automatically,
        //      so in production (HTTPS, same hostname) the more-secure cookie path
        //      is used by the server if both arrive.
        authAPI.refresh(savedRefresh)
            .then((res) => {
                setAccessToken(res.data.data.access);
            })
            .catch(() => {
                // Token expired or revoked — force a clean state
                clearAccessToken();
                localStorage.removeItem("user");
                localStorage.removeItem("refresh_token");
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    const login = async (email, password) => {
        const res  = await authAPI.login({ email, password });
        const data = res.data.data;

        setAccessToken(data.tokens.access);                              // memory only
        localStorage.setItem("refresh_token", data.tokens.refresh);     // survives reload
        localStorage.setItem("user",          JSON.stringify(data.user)); // non-sensitive UI data
        setUser(data.user);
        return data.user;
    };

    const register = async (formData) => {
        const res  = await authAPI.register(formData);
        const data = res.data.data;

        setAccessToken(data.tokens.access);
        localStorage.setItem("refresh_token", data.tokens.refresh);
        localStorage.setItem("user",          JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    };

    const logout = async () => {
        try {
            await authAPI.logout();   // clears HttpOnly cookies server-side
        } catch {
            // Proceed with client-side cleanup even if the request fails
        }
        clearAccessToken();
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        setUser(null);
        window.location.href = "/login";
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            register,
            logout,
            isAuth: !!user,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside AuthProvider");
    return context;
}
