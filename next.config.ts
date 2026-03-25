import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/bolt-value-summary",
  output: "standalone",
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
