import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: "Soul Lifting Therapies | Massage & Facial Specialist, Horncastle & Woodhall Spa",
  description:
    "Massage, facials, advanced skin treatments and Lycon waxing with Emma at Soul Lifting Therapies, Horncastle and Woodhall Spa, Lincolnshire.",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png", sizes: "512x512" }],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Soul Lifting Therapies",
    description:
      "Massage, facials, advanced skin treatments and Lycon waxing in Horncastle and Woodhall Spa.",
    siteName: "Soul Lifting Therapies",
    locale: "en_GB",
    type: "website",
    images: [{ url: "/brand/logo-emblem.png", width: 800, height: 800, alt: "Soul Lifting Therapies" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale: blocking pinch-zoom fails WCAG 1.4.4.
  themeColor: "#006f66",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
