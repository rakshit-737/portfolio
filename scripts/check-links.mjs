// Link integrity gate (P15). Crawls every emitted HTML file in `out/` and
// resolves every internal href/src/srcset entry to a real file in the
// export. External GitHub links get a non-blocking HEAD check (network
// flakiness must never fail CI); every other external host (Wikimedia,
// LinkedIn, Skilljar, …) is counted but not dialed, since the brief scopes
// the network check to GitHub specifically. House style: plain Node,
// OK/FAIL/WARN lines, exit 1 only on a genuinely broken internal reference.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const OUT = "out";
if (!existsSync(OUT)) {
  console.error("FAIL out/ does not exist — run: npm run build");
  process.exit(1);
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    else if (entry.endsWith(".html")) files.push(full);
  }
  return files;
}

const htmlFiles = walk(OUT).sort();

// ── basePath detection ─────────────────────────────────────────────────
// Both deploy shapes (Vercel at the domain root, GitHub Pages under
// `/<repo>/`) must resolve correctly — but `out/`'s own directory layout
// is basePath-invariant; only the URL *text* baked into the HTML carries
// the prefix (see next.config.ts). Rather than assume either shape, derive
// the real one straight from this build's own emitted markup: Next always
// writes its `_next` asset URLs as `${basePath}/_next/...`, so whatever
// (possibly empty) segment precedes `/_next/` in the actual files IS this
// build's basePath, for either shape, with no guessing.
let basePath = "";
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const m = html.match(/(?:href|src)="(\/[^"]*?)\/_next\//i);
  if (m) {
    basePath = m[1] === "" ? "" : m[1];
    break;
  }
}
console.log(`link-crawl: detected basePath="${basePath}"`);

// ── attribute extraction ───────────────────────────────────────────────
const ATTR_RE = /\b(?:href|src|srcset)="([^"]*)"/gi;

function urlsIn(html) {
  const urls = [];
  for (const m of html.matchAll(ATTR_RE)) {
    const raw = m[1];
    // srcset (and React's srcSet, rendered verbatim in this Next version —
    // see check-budget.mjs's own note on the same quirk) is a comma-list
    // of "<url> <descriptor>" pairs; href/src are bare URLs. Splitting on
    // comma and taking the first whitespace token handles both uniformly.
    for (const candidate of raw.split(",")) {
      const url = candidate.trim().split(/\s+/)[0];
      if (url) urls.push(url);
    }
  }
  return urls;
}

// ── classification + resolution ────────────────────────────────────────
function resolveInternal(urlPath) {
  const stripped = urlPath.startsWith(basePath) && basePath !== ""
    ? urlPath.slice(basePath.length)
    : urlPath;
  const clean = stripped.split(/[?#]/)[0];
  if (clean === "" || clean === "/") return join(OUT, "index.html");
  if (clean.endsWith("/")) return join(OUT, clean, "index.html");
  const last = clean.split("/").pop() ?? "";
  if (extname(last)) return join(OUT, clean);
  // A route with no trailing slash (shouldn't occur — trailingSlash:true —
  // but resolved defensively rather than assumed unreachable).
  return join(OUT, clean, "index.html");
}

let internalChecked = 0;
let failed = false;
const externalGithub = new Set();
const externalOther = new Set();
const brokenInternal = [];

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  for (const url of urlsIn(html)) {
    if (
      url === "" ||
      url.startsWith("#") ||
      url.startsWith("mailto:") ||
      url.startsWith("tel:") ||
      url.startsWith("javascript:") ||
      url.startsWith("data:")
    ) {
      continue;
    }
    if (/^https?:\/\//i.test(url)) {
      const host = new URL(url).host;
      if (/(^|\.)github\.com$|githubusercontent\.com$/i.test(host)) {
        externalGithub.add(url);
      } else {
        externalOther.add(url);
      }
      continue;
    }
    if (url.startsWith("//")) {
      externalOther.add(url);
      continue;
    }
    if (!url.startsWith("/")) continue; // in-page relative anchors etc.

    internalChecked++;
    const physical = resolveInternal(url);
    if (!existsSync(physical)) {
      failed = true;
      brokenInternal.push(
        `FAIL ${relative(process.cwd(), file)} -> ${url} (resolved ${physical})`,
      );
    }
  }
}

for (const line of brokenInternal) console.error(line);
console.log(
  `${failed ? "FAIL" : "OK  "} internal references: ${internalChecked} checked across ${htmlFiles.length} HTML files, ${brokenInternal.length} broken`,
);

// ── external GitHub links: HEAD, non-blocking ──────────────────────────
console.log(
  `link-crawl: ${externalGithub.size} external GitHub link(s), ${externalOther.size} other external link(s) (not network-checked)`,
);

const results = await Promise.allSettled(
  [...externalGithub].map(async (url) => {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    return { url, status: res.status };
  }),
);

let warned = 0;
for (const r of results) {
  if (r.status === "fulfilled") {
    if (r.value.status >= 400) {
      warned++;
      console.warn(`WARN  ${r.value.url} -> HTTP ${r.value.status} (non-blocking)`);
    }
  } else {
    warned++;
    console.warn(`WARN  network error reaching an external GitHub link (non-blocking): ${r.reason}`);
  }
}
console.log(
  `link-crawl: ${externalGithub.size - warned}/${externalGithub.size} external GitHub links confirmed reachable (non-blocking)`,
);

process.exit(failed ? 1 : 0);
