import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    return [
      { source: "/", destination: "/classic/index.html" },
      { source: "/invoice", destination: "/classic/index.html" },
      { source: "/classic", destination: "/classic/index.html" },
    ];
  },
};

export default withSerwist(nextConfig);
