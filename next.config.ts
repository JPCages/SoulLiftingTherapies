import type { NextConfig } from "next";

// When the public address is a www host, send the bare domain to it with a
// permanent redirect, so search engines see one copy of each page, not two.
// Derived from NEXT_PUBLIC_SITE_URL, so no client domain is written here.
function bareToWww() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return [];
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!url.hostname.startsWith("www.")) return [];
    return [{
      source: "/:path*",
      has: [{ type: "host" as const, value: url.hostname.slice(4) }],
      destination: `${url.origin}/:path*`,
      permanent: true,
    }];
  } catch {
    return [];
  }
}

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return bareToWww();
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
