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

// Media weight on the landing page: stills plus the scroll-scrubbed motion
// clips (Task 14b). Counts the largest srcset candidate per plate — the
// worst case a wide viewport actually downloads — plus one motion webm per
// plate that has one.
//
// This Next.js/React build renders the JSX `srcSet` prop verbatim as
// `srcSet="…"` in the exported HTML rather than lowercasing it to the
// standard `srcset` attribute — one of this version's breaking changes
// from upstream React DOM. Matches below are case-insensitive so the
// gate measures the real attribute either way.
//
// Each plate's <picture> (there are two, lit and dark, with identical
// URLs — the `candidates` Set collapses that duplication) offers both an
// AVIF and a WebP <source>. A browser only ever fetches ONE of them, so
// counting both — as an earlier version of this script did by matching
// every `srcset=` attribute independently — silently summed two
// downloads that never both happen and inflated the measured weight by
// roughly 80%. AVIF is listed first and wins in every browser that
// supports it, so it is the honest worst case; a WebP-only browser
// downloads strictly less than what is measured here.
//
// Task 14b (narrow crops) adds a second kind of alternative: some plates
// carry a `<source media="(max-width: 48rem)">` serving a narrow crop
// ahead of the landscape one. A narrow and a wide source are exactly as
// mutually exclusive as AVIF and WebP — a given viewport matches one media
// query or the other, never both — so a `media`-gated `<source>` is
// skipped here entirely. That never under-counts the true worst case: the
// narrow variants are strictly smaller (640/960w) than the wide ones they
// sit beside, and the viewport that skips them (anything wider than
// 48rem) is, by construction, the one that downloads the most.
const MEDIA_BUDGET_KB = 3500; // raised from 3000 when scrubbed motion landed
const html = readFileSync("out/index.html", "utf8");
const candidates = new Set();
for (const m of html.matchAll(/<source\b[^>]*>/gi)) {
  const tag = m[0];
  if (/\bmedia="/i.test(tag)) continue;
  if (!/type="image\/avif"/i.test(tag)) continue;
  const srcsetMatch = tag.match(/srcset="([^"]+)"/i);
  if (!srcsetMatch) continue;
  const entries = srcsetMatch[1]
    .split(",")
    .map((s) => s.trim().split(/\s+/))
    .map(([url, w]) => ({ url, w: parseInt(w, 10) || 0 }));
  const widest = entries.sort((a, b) => b.w - a.w)[0];
  if (widest) candidates.add(widest.url);
}
// One motion clip per plate, if it has one. Rendered as `data-src` (not
// `src`) so no browser ever fetches it without JavaScript promoting it —
// see Plate.tsx / Lamp.tsx — but a visitor whose lamp does turn on
// downloads exactly this file, once, so it counts toward the real ceiling.
for (const m of html.matchAll(/data-src="([^"]+\.webm)"/gi)) {
  candidates.add(m[1]);
}
let mediaBytes = 0;
for (const url of candidates) {
  const rel = url.replace(/^\/+/, "").split("/");
  // Strip a basePath prefix if one was baked in.
  const artIndex = rel.indexOf("art");
  const path = join("out", ...(artIndex >= 0 ? rel.slice(artIndex) : rel));
  mediaBytes += readFileSync(path).length;
}
const mediaKb = mediaBytes / 1024;
const mediaOk = mediaKb <= MEDIA_BUDGET_KB;
console.log(
  `${mediaOk ? "OK  " : "FAIL"} out/index.html: ${mediaKb.toFixed(0)} kB media (budget ${MEDIA_BUDGET_KB} kB)`,
);
if (!mediaOk) failed = true;

process.exit(failed ? 1 : 0);
