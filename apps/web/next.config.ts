import type { NextConfig } from "next";

const apiProxyTarget =
  process.env.API_PROXY_TARGET?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "https://mgl-api.onrender.com";

const nextConfig: NextConfig = {
  experimental: {
    cpus: process.env.RENDER ? 1 : undefined,
  },
  async rewrites() {
    return [
      {
        source: "/api-proxy/:path*",
        destination: `${apiProxyTarget}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/mgl-water/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2_592_000,
    qualities: [72, 75],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
