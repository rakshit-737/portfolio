// Performance budget: gzipped JS referenced by exported pages.
// Fails the build when the ceiling is exceeded — raise it only with a
// deliberate commit, never silently.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const BUDGET_KB = 214; // 2026-08: 210 baseline + 4 kB for the lamp (rAF + IO)

const pages = ["out/index.html", "out/projects/warden/index.html"];
let failed = false;

for (const pagePath of pages) {
  const html = readFileSync(pagePath, "utf8");
  const scripts = [...html.matchAll(/src="(\/[^"]+\.js)"/g)].map((m) => m[1]);
  let total = 0;
  for (const s of new Set(scripts)) {
    const buf = readFileSync(join("out", ...s.split("/").filter(Boolean)));
    total += gzipSync(buf, { level: 9 }).length;
  }
  const kb = total / 1024;
  const ok = kb <= BUDGET_KB;
  console.log(
    `${ok ? "OK  " : "FAIL"} ${pagePath}: ${kb.toFixed(1)} kB gzipped JS (budget ${BUDGET_KB} kB)`,
  );
  if (!ok) failed = true;
}

// Image weight on the landing page. Counts the largest srcset candidate
// per plate — the worst case a wide viewport actually downloads.
//
// This Next.js/React build renders the JSX `srcSet` prop verbatim as
// `srcSet="…"` in the exported HTML rather than lowercasing it to the
// standard `srcset` attribute — one of this version's breaking changes
// from upstream React DOM. The match is case-insensitive so the gate
// measures the real attribute either way.
const IMAGE_BUDGET_KB = 3000;
const html = readFileSync("out/index.html", "utf8");
const candidates = new Set();
for (const m of html.matchAll(/srcset="([^"]+)"/gi)) {
  const entries = m[1]
    .split(",")
    .map((s) => s.trim().split(/\s+/))
    .map(([url, w]) => ({ url, w: parseInt(w, 10) || 0 }));
  const widest = entries.sort((a, b) => b.w - a.w)[0];
  if (widest) candidates.add(widest.url);
}
let imageBytes = 0;
for (const url of candidates) {
  const rel = url.replace(/^\/+/, "").split("/");
  // Strip a basePath prefix if one was baked in.
  const artIndex = rel.indexOf("art");
  const path = join("out", ...(artIndex >= 0 ? rel.slice(artIndex) : rel));
  imageBytes += readFileSync(path).length;
}
const imageKb = imageBytes / 1024;
const imagesOk = imageKb <= IMAGE_BUDGET_KB;
console.log(
  `${imagesOk ? "OK  " : "FAIL"} out/index.html: ${imageKb.toFixed(0)} kB images (budget ${IMAGE_BUDGET_KB} kB)`,
);
if (!imagesOk) failed = true;

process.exit(failed ? 1 : 0);
