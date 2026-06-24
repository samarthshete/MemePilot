import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Turbopack doesn't walk up the
  // filesystem inferring a root (which also avoids a spurious multi-root warning).
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
