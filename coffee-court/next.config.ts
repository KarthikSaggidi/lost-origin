import type { NextConfig } from "next";

const nextConfig = {
  // Vinext also checks raw multipart uploads against this limit before routing.
  // Keep room for multipart headers; the media endpoint enforces a 5 MB image limit.
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
      // Multipart uploads arrive through the dedicated admin relay. The API
      // independently requires its server secret, admin session and CSRF token.
      allowedOrigins: [
        "lost-origin-admin-karthik.dropxcorp2026.chatgpt.site",
        "127.0.0.1:5174",
      ],
    },
  },
} satisfies NextConfig;

export default nextConfig;
