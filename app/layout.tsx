import type { Metadata, Viewport } from "next";
import "./globals.css";

// NEXT_PUBLIC_SITE_URL is set by hand in Railway, so it may arrive without a
// scheme or empty. A bad value must never break the build: fall back to no
// metadataBase, which only affects how absolute social-preview URLs are built.
function siteUrl(): URL | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return undefined;
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return undefined;
  }
}

const base = siteUrl();

export const metadata: Metadata = {
  ...(base ? { metadataBase: base } : {}),
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
