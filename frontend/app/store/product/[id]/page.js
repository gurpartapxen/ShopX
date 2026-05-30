// Server Component — handles SEO metadata, JSON-LD structured data, and ISR caching.
// All interactive UI lives in ProductPageClient.js (a Client Component).
import ProductPageClient from "./ProductPageClient";

const API = process.env.NEXT_PUBLIC_API_URL;

// ISR: cache the rendered page for 1 hour, then re-fetch in the background.
// Products don't need real-time accuracy for SEO crawlers.
export const revalidate = 3600;

async function fetchProduct(id) {
    try {
        const res = await fetch(`${API}/products/${id}/`, {
            next: { revalidate: 3600 },
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data ?? null;
    } catch {
        return null;
    }
}

// ── Open Graph + Twitter metadata ────────────────────────────────────────────
export async function generateMetadata({ params }) {
    const { id } = await params;
    const product = await fetchProduct(id);

    if (!product) {
        return {
            title: "Product Not Found",
            description: "This product could not be found on ShopX.",
        };
    }

    const discountedPrice = product.discount > 0
        ? Math.round(product.price * (1 - product.discount / 100))
        : product.price;

    const title       = product.name;
    const description = product.description
        ? product.description.slice(0, 155)
        : `Shop ${product.name} on ShopX. Price: ₹${discountedPrice.toLocaleString("en-IN")}.`;
    const image = product.images?.[0] ?? null;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: "website",
            ...(image && {
                images: [{ url: image, width: 800, height: 800, alt: product.name }],
            }),
        },
        twitter: {
            card: image ? "summary_large_image" : "summary",
            title,
            description,
            ...(image && { images: [image] }),
        },
    };
}

// ── Page component ────────────────────────────────────────────────────────────
export default async function ProductPage({ params }) {
    const { id } = await params;
    const product = await fetchProduct(id);

    // ── JSON-LD structured data (Schema.org Product) ──────────────────────────
    // Injected into <head> by Next.js. Helps Google show rich results (price,
    // rating, availability) directly in search results.
    const jsonLd = product
        ? {
            "@context": "https://schema.org/",
            "@type": "Product",
            name:        product.name,
            description: product.description ?? "",
            image:       product.images ?? [],
            brand: {
                "@type": "Brand",
                name:    "ShopX",
            },
            offers: {
                "@type":         "Offer",
                priceCurrency:   "INR",
                price:           product.discount > 0
                    ? Math.round(product.price * (1 - product.discount / 100))
                    : product.price,
                availability:    product.stock > 0
                    ? "https://schema.org/InStock"
                    : "https://schema.org/OutOfStock",
                seller: {
                    "@type": "Organization",
                    name:    "ShopX",
                },
            },
            ...(product.avg_rating > 0 && product.review_count > 0 && {
                aggregateRating: {
                    "@type":       "AggregateRating",
                    ratingValue:   product.avg_rating,
                    reviewCount:   product.review_count,
                    bestRating:    5,
                    worstRating:   1,
                },
            }),
        }
        : null;

    return (
        <>
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            )}
            {/* Hand off all interactivity to the Client Component */}
            <ProductPageClient productId={id} />
        </>
    );
}
