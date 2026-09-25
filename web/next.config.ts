import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Monorepo local dev only; on Vercel the project root is `web/`.
  ...(process.env.VERCEL ? {} : { outputFileTracingRoot: path.join(__dirname, "..") }),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.prestocks.com", pathname: "/logos/**" },
      { protocol: "https", hostname: "prestocks.com", pathname: "/logos/**" },
    ],
  },
};

export default nextConfig;
