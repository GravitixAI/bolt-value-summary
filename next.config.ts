import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/bolt-value-summary",
  output: "standalone",
  serverExternalPackages: ["@react-pdf/renderer"],

  // In production, IIS proxies /bolt-rest-engine/* to the REST engine on the same server.
  // In local dev there is no IIS, so Next.js rewrites the same path to the dev server URL.
  // BOLT_REST_ENGINE_DEV_URL is read at dev-server startup only — never inlined into the bundle.
  async rewrites() {
    const devTarget = process.env.BOLT_REST_ENGINE_DEV_URL;
    if (!devTarget) return [];
    return [
      {
        source: "/bolt-rest-engine/:path*",
        destination: `${devTarget}/bolt-rest-engine/:path*`,
      },
    ];
  },
};

export default nextConfig;
