import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Local monorepo traces `keys/` under repo root; on Vercel project root is `web/`.
  outputFileTracingRoot: process.env.VERCEL ? path.join(__dirname) : path.join(__dirname, ".."),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.prestocks.com", pathname: "/logos/**" },
      { protocol: "https", hostname: "prestocks.com", pathname: "/logos/**" },
    ],
  },
};

export default nextConfig;
