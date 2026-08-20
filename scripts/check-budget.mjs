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

// Media weight on the landing page: the plate stills only — the
// scroll-scrubbed motion clips this gate used to also count were removed
// entirely (the owner asked for the zoom to go; see AGENTS.md/DESIGN.md).
// Counts the largest srcset candidate per plate — the worst case a wide
// viewport actually downloads. The `data-src` webm-matching branch below
// is kept (it now matches nothing — no plate emits a motion clip any
// more) rather than deleted, since a future plate could reintroduce a
// non-zoom motion layer under a different mechanism and this branch would
// already count it correctly; it costs nothing while unused.
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
// Important 4 (2026-08 finish review): spec §8 states a 3.0MB landing
// ceiling. This constant was raised to 3500 while the four scroll-scrubbed
// motion clips (~130-190kB each) were part of the media total — a later,
// explicit request (scroll-scrubbed video on the landing page) that
// pushed real weight past the original figure. That request has since
// been reversed: the owner saw the zoom live and asked for it removed
// (2026-08-20, see AGENTS.md/DESIGN.md), so the clips are gone and the
// real media total has dropped well under even the original 3.0MB figure
// (see the implementer's report for the measured number). Left at 3500
// rather than lowered back to 3000 here: this task's brief scoped
// check-budget.mjs to updating the stale comment and reporting the new
// total, not to re-tuning the ceiling — a deliberate ceiling change is
// its own commit, same as raising one.
const MEDIA_BUDGET_KB = 3500;
const html = readFileSync("out/index.html", "utf8");

// A URL's HTML `src`/`srcset` value is site-root-relative and may carry a
// basePath prefix (GitHub Pages) ahead of the real `public/` path — strip
// down to whichever known asset root the URL actually contains, the same
// way for every candidate this file ever resolves, rather than each call
// site re-deriving its own prefix-stripping rule.
const ASSET_ROOTS = ["art", "certificates", "exhibits"];
function resolveOutPath(url) {
  const rel = url.replace(/^\/+/, "").split("/");
  const rootIndex = rel.findIndex((seg) => ASSET_ROOTS.includes(seg));
  return join("out", ...(rootIndex >= 0 ? rel.slice(rootIndex) : rel));
}

// Extracts the real worst-case download set from an HTML slice: the
// widest non-media-gated AVIF `<source>` per `<picture>` (a browser only
// ever fetches one of AVIF/WebP, and AVIF wins wherever it's supported —
// see the long comment above), any `data-src="*.webm"` motion clip (none
// exist today — see the comment above `MEDIA_BUDGET_KB` — but the match
// costs nothing left in place), and — Task 20 fix — every plain
// `<img src>` that sits OUTSIDE a `<picture>`
// entirely. That last rule is what the certificate PNG walked through
// before this fix: a `<picture>`-wrapped `<img>` is already covered by
// its sibling `<source>` (the img is only a same-content fallback, never
// fetched by a browser that understood the `<source>`s at all), but a
// bare `<img src>` has no sibling to be conditional on — its full weight
// is a real, unconditional download for every visitor, so it must always
// count. Scanning for it generically (not "every `<img>` in the
// certifications list") closes the hole for any future non-art asset that
// ships the same way, not just this one.
function mediaCandidates(slice) {
  const candidates = new Set();
  for (const m of slice.matchAll(/<source\b[^>]*>/gi)) {
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
  // downloads exactly this file, once, so it counts toward the real
  // ceiling.
  for (const m of slice.matchAll(/data-src="([^"]+\.webm)"/gi)) {
    candidates.add(m[1]);
  }
  const pictureRanges = [...slice.matchAll(/<picture\b[\s\S]*?<\/picture>/gi)].map(
    (m) => [m.index, m.index + m[0].length],
  );
  const insidePicture = (idx) => pictureRanges.some(([s, e]) => idx >= s && idx < e);
  for (const m of slice.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)) {
    if (insidePicture(m.index)) continue;
    candidates.add(m[1]);
  }
  return candidates;
}

function bytesOf(candidates) {
  let bytes = 0;
  for (const url of candidates) bytes += readFileSync(resolveOutPath(url)).length;
  return bytes;
}

const mediaKb = bytesOf(mediaCandidates(html)) / 1024;
const mediaOk = mediaKb <= MEDIA_BUDGET_KB;
console.log(
  `${mediaOk ? "OK  " : "FAIL"} out/index.html: ${mediaKb.toFixed(0)} kB media (budget ${MEDIA_BUDGET_KB} kB)`,
);
if (!mediaOk) failed = true;

// Above-the-fold: spec §8's second ceiling (700kB), never previously
// gated — only the whole-page media ceiling above was. Scoped to the
// `#hero` act's own markup (the AVIF still; hero is the one plate marked
// `priority`, `fetchPriority="high"`, so it is the only plate a visitor's
// browser fetches before any scroll), using the
// exact same candidate-extraction rules as the whole-page gate above so
// this can't silently drift from what that one counts.
const HERO_BUDGET_KB = 700;
const heroStart = html.indexOf('id="hero"');
const heroEnd = html.indexOf('id="about"');
if (heroStart < 0 || heroEnd < 0 || heroEnd <= heroStart) {
  console.log("FAIL out/index.html: could not locate the #hero act's markup to measure it");
  failed = true;
} else {
  const heroHtml = html.slice(heroStart, heroEnd);
  const heroKb = bytesOf(mediaCandidates(heroHtml)) / 1024;
  const heroOk = heroKb <= HERO_BUDGET_KB;
  console.log(
    `${heroOk ? "OK  " : "FAIL"} out/index.html: ${heroKb.toFixed(0)} kB above-the-fold media (budget ${HERO_BUDGET_KB} kB)`,
  );
  if (!heroOk) failed = true;
}

process.exit(failed ? 1 : 0);
