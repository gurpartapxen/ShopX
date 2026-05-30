"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authAPI, setAccessToken, clearAccessToken, hasSession } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(() => hasSession());

    useEffect(() => {
        if (!hasSession()) return;   // no cookie → not logged in, loading already false

        authAPI.refresh()
            .then((res) => {
                setUser(res.data.data.user);
            })
            .catch(() => {
                clearAccessToken();
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    const login = async (email, password) => {
        const { data } = (await authAPI.login({ email, password })).data;
        setAccessToken(data.access);   // memory only; refresh + csrf live in cookies
        setUser(data.user);
        return data.user;
    };

    const register = async (formData) => {
        const { data } = (await authAPI.register(formData)).data;
        setAccessToken(data.access);
        setUser(data.user);
        return data.user;
    };

    // Merge updated fields into the in-memory user (e.g. after a profile edit).
    const updateUser = (fields) => setUser((prev) => (prev ? { ...prev, ...fields } : prev));

    const logout = async () => {
        try {
            await authAPI.logout();   // server clears the HttpOnly refresh + csrf cookies
        } catch {
            // Proceed with client cleanup even if the request fails
        }
        clearAccessToken();
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
            updateUser,
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
