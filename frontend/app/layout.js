import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const geist = Geist({ subsets: ["latin"] });

export const metadata = {
    // %s is replaced by child pages' title — e.g. "Air Max 90 | ShopX"
    title: {
        default:  "ShopX — Multi-Vendor Store",
        template: "%s | ShopX",
    },
    description:
        "ShopX is a modern multi-vendor e-commerce platform. Browse thousands of products " +
        "from verified sellers — electronics, fashion, home goods, and more.",
    keywords: ["ecommerce", "online shopping", "multi-vendor", "ShopX", "India"],
    openGraph: {
        type:        "website",
        siteName:    "ShopX",
        title:       "ShopX — Multi-Vendor Store",
        description: "Browse thousands of products from verified sellers on ShopX.",
    },
    twitter: {
        card:        "summary_large_image",
        title:       "ShopX — Multi-Vendor Store",
        description: "Browse thousands of products from verified sellers on ShopX.",
    },
    robots: {
        index:  true,
        follow: true,
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={geist.className}>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}