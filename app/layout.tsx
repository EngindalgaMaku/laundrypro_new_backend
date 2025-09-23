import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import { Toaster } from "sonner";
import {
  NetworkProvider,
  NavigationBlocker,
} from "@/components/providers/network-provider";
import "./globals.css";

// Import auth interceptor to automatically handle stale tokens
import "@/lib/auth-interceptor";

export const metadata: Metadata = {
  title: "LaundryPro - Profesyonel Temizlik Yönetimi",
  description:
    "Temizlik işletmenizi dijitalleştirin - LaundryPro ile işlerinizi kolaylaştırın",
  generator: "v0.app",
  applicationName: "LaundryPro",
  keywords: [
    "temizlik",
    "çamaşırhane",
    "halı yıkama",
    "döşeme temizlik",
    "laundry",
    "cleaning",
  ],
  authors: [{ name: "LaundryPro Team" }],
  creator: "LaundryPro",
  publisher: "LaundryPro",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [{ url: "/icon", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LaundryPro",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <NetworkProvider>
          <NavigationBlocker>
            <Suspense fallback={null}>{children}</Suspense>
          </NavigationBlocker>
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              },
            }}
          />
        </NetworkProvider>
        <Analytics />
      </body>
    </html>
  );
}
