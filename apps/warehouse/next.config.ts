import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    cpus: process.env.RENDER ? 1 : undefined,
  },
  transpilePackages: ["@mgl/ui", "@mgl/types"],
};

export default nextConfig;
