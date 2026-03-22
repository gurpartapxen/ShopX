"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;
        if (user) {
            if (user.role === "admin")       router.push("/admin");
            else if (user.role === "vendor") router.push("/vendor");
            else                             router.push("/store");
        } else {
            router.push("/login");
        }
    }, [user, loading]);

    return (
        <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            fontSize: "14px",
            fontFamily: "Inter, sans-serif",
            color: "#86868b",
            background: "#f5f5f7"
        }}>
            Loading...
        </div>
    );
}