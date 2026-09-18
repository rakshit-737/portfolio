// Fails if the committed vercel.json does not carry exactly the headers in
// scripts/csp.mjs — the policy is written down once, and this keeps the
// deployed copy from drifting. `--write` regenerates vercel.json from it.
// Usage: node scripts/check-vercel-json.mjs [--write]
import { readFileSync, writeFileSync } from "node:fs";
import { vercelJson } from "./csp.mjs";

const expected = `${JSON.stringify(vercelJson(), null, 2)}\n`;

if (process.argv.includes("--write")) {
  writeFileSync("vercel.json", expected);
  console.log("vercel.json written from scripts/csp.mjs");
  process.exit(0);
}

let actual = "";
try {
  actual = readFileSync("vercel.json", "utf8").replace(/\r\n/g, "\n");
} catch {
  console.error("FAIL vercel.json is missing — run: node scripts/check-vercel-json.mjs --write");
  process.exit(1);
}

if (actual !== expected) {
  console.error(
    "FAIL vercel.json differs from scripts/csp.mjs — edit the policy there, then run: node scripts/check-vercel-json.mjs --write",
  );
  process.exit(1);
}
console.log("OK   vercel.json matches scripts/csp.mjs");
