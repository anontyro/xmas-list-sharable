import type { NextConfig } from "next";

const common = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  // A Content-Security-Policy is a follow-up: MUI/Emotion inline styles and Next's inline scripts need a nonce setup first.
  async headers() {
    return [
      // Recovery links and owner sign-in links (which may carry a PIN) are secrets, so those pages send no referrer at all.
      { source: "/((?!recover|api/recovery|owner/login).*)", headers: [...common, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }] },
      { source: "/recover", headers: [...common, { key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/owner/login", headers: [...common, { key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "no-store" }] },
      { source: "/api/recovery/:path*", headers: [...common, { key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
};

export default nextConfig;
