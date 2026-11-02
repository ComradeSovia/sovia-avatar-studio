import type { NextConfig } from "next";

const config: NextConfig = {
  distDir: process.env.STUDIO_BUILD_DIR ?? ".next",
  poweredByHeader: false,
  agentRules: false,
  devIndicators: false,
  outputFileTracingExcludes: { "/*": ["./projects/**/*", "./work/**/*", "./.git/**/*"] },
  serverExternalPackages: ["pngjs"],
  experimental: { proxyClientMaxBodySize: "24mb" },
};
export default config;
