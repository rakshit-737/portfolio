import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This is a static export (`output: "export"`, `images.unoptimized`
      // in next.config.ts): there is no image optimizer for next/image to
      // hand off to, and every <img> here is a hand-built <picture> with
      // AVIF/WebP sources sized by the art pipeline (scripts/fetch-art.mjs,
      // gen-certificate-thumb.mjs) — the rule's advice does not apply.
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
