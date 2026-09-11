import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    cpus: process.env.RENDER ? 1 : undefined,
  },
  devIndicators: false,
};

export default nextConfig;
