import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const geist = Geist({ subsets: ["latin"] });

export const metadata = {
    title:       "E-Commerce Store",
    description: "Multi-vendor e-commerce platform",
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