import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  // The shared types and helpers are TypeScript source in the workspace, not a built package.
  transpilePackages: ["@beasiswa/shared"],
  turbopack: {
    root: fileURLToPath(new URL("..", import.meta.url)),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
