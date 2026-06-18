// Shown instantly by Next.js while the product Server Component renders on the
// server (which awaits the backend product fetch). Without this, navigation
// appears to "freeze" until the server responds; with it, the user gets an
// immediate skeleton so the click feels responsive.
export default function ProductLoading() {
    const box = { background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16 };
    const bar = (w, h = 16) => ({
        background: "linear-gradient(90deg,#1a1a1a 25%,#222 50%,#1a1a1a 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
        borderRadius: 8,
        width: w,
        height: h,
    });

    return (
        <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "Inter, sans-serif" }}>
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
                <div style={{ ...bar("220px", 12), marginBottom: 32 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
                    {/* image */}
                    <div style={{ ...box, aspectRatio: "1", borderRadius: 20 }} />
                    {/* info */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={bar("90px", 12)} />
                        <div style={bar("70%", 32)} />
                        <div style={bar("140px", 28)} />
                        <div style={bar("110px", 18)} />
                        <div style={{ ...bar("100%", 12), marginTop: 8 }} />
                        <div style={bar("95%", 12)} />
                        <div style={bar("60%", 12)} />
                        <div style={{ ...bar("100%", 54), marginTop: 16, borderRadius: 14 }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
