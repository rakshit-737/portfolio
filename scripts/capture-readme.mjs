// Captures the README's hero images and the repository's social preview
// from the built export, with the lamp lit. Run after `npm run build`:
//   node scripts/capture-readme.mjs
// Outputs (all committed): docs/readme/hero-1440.webp, hero-390.webp and
// social-preview.jpg. Each has a size ceiling this script enforces, so a
// capture that has grown past what GitHub or the README should carry
// fails loudly instead of landing.
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const OUT = join(process.cwd(), "out");
const DEST = join("docs", "readme");
if (!existsSync(OUT)) {
  console.error("capture-readme: out/ does not exist — run: npm run build");
  process.exit(1);
}
mkdirSync(DEST, { recursive: true });

// A minimal static server for the root-shape export (no dependency).
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".txt": "text/plain", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif",
  ".ico": "image/x-icon", ".woff2": "font/woff2", ".pdf": "application/pdf",
};
const server = createServer((req, res) => {
  let p = join(OUT, normalize(decodeURIComponent((req.url ?? "/").split("?")[0])));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  if (!p.startsWith(OUT) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": TYPES[extname(p)] ?? "application/octet-stream" });
  res.end(readFileSync(p));
}).listen(0);
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();

/** Loads the index at a viewport, lights the hero, returns a PNG buffer. */
async function capture({ width, height, pointer }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
    hasTouch: !pointer,
    isMobile: !pointer,
  });
  const page = await ctx.newPage();
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.locator("html[data-lamp='on']").waitFor();
  await page.locator("#hero[data-seen]").waitFor();
  if (pointer) {
    // Beside the name, not on it: the lamp follows the pointer, and the
    // key cursor the site draws there should not sit on the H1.
    const h1 = await page.getByRole("heading", { level: 1 }).boundingBox();
    const x = Math.min(h1.x + h1.width + 60, width - 80);
    await page.mouse.move(x - 200, h1.y + h1.height / 2);
    await page.mouse.move(x, h1.y + h1.height / 2, { steps: 12 });
  }
  // The act's one authored beat (the statement's words landing) and the
  // lamp's lerp both settle within a second and a half.
  await page.waitForTimeout(1800);
  const buf = await page.screenshot({ type: "png" });
  await ctx.close();
  return buf;
}

async function write(buf, name, encode, ceilingKb) {
  const file = join(DEST, name);
  await encode(sharp(buf)).toFile(file);
  const kb = statSync(file).size / 1024;
  console.log(`${file}: ${kb.toFixed(0)} KB (ceiling ${ceilingKb} KB)`);
  if (kb > ceilingKb) throw new Error(`${file} is ${kb.toFixed(0)} KB, over ${ceilingKb} KB`);
}

try {
  await write(await capture({ width: 1440, height: 900, pointer: true }), "hero-1440.webp",
    (s) => s.webp({ quality: 80 }), 250);
  await write(await capture({ width: 390, height: 844, pointer: false }), "hero-390.webp",
    (s) => s.webp({ quality: 80 }), 120);
  // GitHub's social preview: 1280x640, under 1 MB.
  await write(await capture({ width: 1280, height: 640, pointer: true }), "social-preview.jpg",
    (s) => s.jpeg({ quality: 85, mozjpeg: true }), 1000);
} finally {
  await browser.close();
  server.close();
}
