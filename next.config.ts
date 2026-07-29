import type { NextConfig } from "next";

// Set NEXT_PUBLIC_BASE_PATH (e.g. "/Portfolio") when deploying under a
// sub-path such as GitHub Pages. Leave unset for Vercel / custom domains.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
