import type { NextConfig } from "next";

const apiProxyTarget =
  process.env.API_PROXY_TARGET?.replace(/\/$/, "") ||
  "https://mgl-api.onrender.com";

const nextConfig: NextConfig = {
  // Keep recently visited admin routes compiled between ordinary navigation pauses.
  // This is a development-only bundle cache, not a cache of customer/API data.
  onDemandEntries: {
    maxInactiveAge: 10 * 60 * 1000,
    pagesBufferLength: 20,
  },
  experimental: {
    cpus: process.env.RENDER ? 1 : undefined,
  },
  async rewrites() {
    return [
      {
        source: "/api-proxy/:path*",
        destination: apiProxyTarget + "/:path*",
      },
    ];
  },
};

export default nextConfig;
