import type { NextConfig } from "next";

// F11: this file — this repo's one .ts config Node itself has to load,
// before Next's own bundler ever gets a turn — is why package.json pins
// `engines.node` to >=22.18. Node's native TypeScript resolver
// (process.features.typescript, which is what lets `next.config.ts` use
// real ESM/top-level-await instead of only CommonJS-shaped TS) is
// enabled by default starting Node v22.18.0; from v22.10.0 up to v22.17.x
// it exists but needs `NODE_OPTIONS=--experimental-transform-types` set
// manually, and below v22.10.0 it doesn't exist at all. See
// node_modules/next/dist/docs/.../02-typescript.md, "Using Node.js Native
// TypeScript Resolver for next.config.ts".
//
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
