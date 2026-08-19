import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, ".."),
  serverExternalPackages: ["pdfkit", "sharp"],
  async rewrites() {
    return [
      {
        source: "/artifacts/tuscany-family-august-2026",
        destination: "/artifacts/tuscany-family-august-2026/index.html",
      },
      {
        source: "/artifacts/tuscany-family-august-2026/",
        destination: "/artifacts/tuscany-family-august-2026/index.html",
      },
    ];
  },
};

export default nextConfig;