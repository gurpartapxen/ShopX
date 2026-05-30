// Store-section metadata — applies to /store, /store/cart, /store/checkout, etc.
// Product detail pages override title/description via generateMetadata() in their own page.js.
export const metadata = {
    title: {
        default:  "Shop",
        template: "%s | ShopX",
    },
    description:
        "Browse thousands of products from verified vendors on ShopX. " +
        "Find the best deals on electronics, fashion, home goods, and more.",
    openGraph: {
        type:        "website",
        siteName:    "ShopX",
        title:       "Shop — ShopX",
        description: "Browse thousands of products from verified vendors on ShopX.",
    },
};

export default function StoreLayout({ children }) {
    return children;
}
