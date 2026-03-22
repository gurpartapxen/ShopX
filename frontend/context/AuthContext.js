"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authAPI } from "@/lib/api";

// ── Auth Context ───────────────────────────────────────────────────────────────
// Provides auth state to the entire app.
// Any component can call useAuth() to get:
//   user        → the logged in user object (or null)
//   loading     → true while checking auth state
//   login()     → logs in and saves tokens
//   logout()    → clears tokens and redirects
//   isAuth      → true if user is logged in

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user,    setUser]    = useState(null);
    const [loading, setLoading] = useState(true);

    // on app load — check if tokens exist and fetch profile
    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const res  = await authAPI.login({ email, password });
        const data = res.data.data;

        // save tokens and user to localStorage
        localStorage.setItem("access_token",  data.tokens.access);
        localStorage.setItem("refresh_token", data.tokens.refresh);
        localStorage.setItem("user",          JSON.stringify(data.user));

        setUser(data.user);
        return data.user;
    };

    const register = async (formData) => {
    const res  = await authAPI.register(formData);
    const data = res.data.data;

    localStorage.setItem("access_token",  data.tokens.access);
    localStorage.setItem("refresh_token", data.tokens.refresh);
    localStorage.setItem("user",          JSON.stringify(data.user));

    setUser(data.user);
    return data.user;
};

    const logout = () => {
        localStorage.removeItem("access_token");
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
    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }
    return context;
}