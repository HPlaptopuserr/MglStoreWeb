import type { NextConfig } from "next";

const apiProxyTarget =
  process.env.API_PROXY_TARGET?.replace(/\/$/, "") ||
  "https://mgl-api.onrender.com";

const nextConfig: NextConfig = {
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
