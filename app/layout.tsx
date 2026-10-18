import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteUrl, DEFAULT_TITLE, DEFAULT_DESCRIPTION } from "@/lib/seo";

const base = siteUrl();

export const metadata: Metadata = {
  ...(base ? { metadataBase: base } : {}),
  // Inner pages set their own short title, e.g. "Treatments | Soul Lifting Therapies".
  title: { default: DEFAULT_TITLE, template: "%s | Soul Lifting Therapies" },
  description: DEFAULT_DESCRIPTION,
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
