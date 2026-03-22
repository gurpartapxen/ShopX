export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) return new Response("Missing url", { status: 400 });

    try {
        const res = await fetch(decodeURIComponent(url), {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; ShopX/1.0)",
            },
        });

        const svg = await res.text();

        return new Response(svg, {
            headers: {
                "Content-Type": "image/svg+xml",
                "Cache-Control": "public, max-age=86400",
                "Access-Control-Allow-Origin": "*",
            },
        });
    } catch (err) {
        return new Response("Failed to fetch", { status: 500 });
    }
}