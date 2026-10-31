import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast";
import { CartProvider } from "@/components/cart/cart-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "ATELIER 3D — The Future of Online Shopping",
    template: "%s · ATELIER 3D",
  },
  description:
    "Discover, customize, visualize and purchase beautifully designed furniture through immersive 3D experiences.",
  keywords: ["luxury furniture", "3D configurator", "interior design", "virtual room designer", "online shopping"],
  openGraph: {
    type: "website",
    siteName: "ATELIER 3D",
    title: "ATELIER 3D — The Future of Online Shopping",
    description: "Discover, customize, visualize and purchase beautifully designed furniture through immersive 3D experiences.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ATELIER 3D — The Future of Online Shopping",
    description: "Discover, customize, visualize and purchase beautifully designed furniture through immersive 3D experiences.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#F6F3ED",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen bg-ivory font-body text-ink antialiased">
        <ToastProvider>
          <CartProvider>{children}</CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
