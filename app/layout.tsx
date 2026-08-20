import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://martenbooks.com").replace(/\/$/, "");
const title = "Marten Bookkeeping | Invoice, GST calculator, expenses & payroll";
const description =
  "Free small-business bookkeeping for freelancers and studios. Create invoices, calculate GST, email invoices to clients, track expenses, and run payroll in one workspace.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s · Marten Bookkeeping",
  },
  description,
  applicationName: "Marten Bookkeeping",
  keywords: [
    "invoice generator",
    "GST calculator",
    "email invoice",
    "small business bookkeeping",
    "freelance invoicing",
    "expense tracker",
    "payroll software",
    "paystubs",
    "job estimates",
    "Canada GST invoice",
  ],
  authors: [{ name: "Marten Bookkeeping", url: siteUrl }],
  creator: "Marten Bookkeeping",
  publisher: "Marten Bookkeeping",
  category: "finance",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Marten Bookkeeping",
    title,
    description,
    locale: "en_CA",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "Marten Bookkeeping" }],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/icons/icon-512.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Marten Bookkeeping",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/logo.png", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#b8442a" },
    { media: "(prefers-color-scheme: dark)", color: "#8a3a1c" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Marten Bookkeeping" />
        <meta name="msapplication-TileColor" content="#b8442a" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
