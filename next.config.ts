import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Dev is bound to 0.0.0.0 so phones on the LAN can reach the desk. Browsers
  // still send Origin 127.0.0.1 (or a LAN host). Next only allows the bind
  // hostname unless it is listed here, and a blocked dev socket prevents the
  // page from becoming interactive.
  allowedDevOrigins: ["127.0.0.1", "*.trycloudflare.com"],
  experimental: {
    // Next 16 enables this by default. Hydration then waits on the dev
    // socket; if that socket is blocked, buttons and forms never attach.
    reactDebugChannel: false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
