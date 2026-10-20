import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Receipts are resized in the browser first (usually < 500 KB); this is headroom.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
