import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker (Dokploy) uchun: .next/standalone ichida mustaqil server.js yaratiladi
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
