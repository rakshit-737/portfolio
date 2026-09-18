// Serves ./out with the committed vercel.json response headers applied to
// every response, the way Vercel applies them in production. `next dev`
// and the plain `serve out` the main Playwright config uses send none of
// them, so without this nothing would ever prove the CSP leaves hydration,
// the lamp, the cursor and the sound engine working. Used only by
// playwright.csp.config.ts's webServer.
//
// A deliberately small static server (node:http, no dependency): the
// export is plain files, `trailingSlash: true` means every route is a
// directory with an index.html, and 404.html is the unknown-route page.
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";

const ROOT = join(process.cwd(), "out");
const PORT = Number(process.env.CSP_PORT ?? 4577);

if (!existsSync(ROOT)) {
  console.error("serve-with-headers: out/ does not exist — run: npm run build");
  process.exit(1);
}

const config = JSON.parse(readFileSync("vercel.json", "utf8"));
// vercel.json `source` is a path-to-regexp pattern; the only one this repo
// uses is "/(.*)", which is also a valid anchored RegExp body.
const rules = (config.headers ?? []).map((r) => ({
  re: new RegExp(`^${r.source}$`),
  headers: r.headers,
}));


const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
};

function resolve(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^([/\\])+/, "");
  const full = join(ROOT, clean);
  if (!full.startsWith(ROOT + sep) && full !== ROOT) return null;
  if (existsSync(full) && statSync(full).isDirectory()) {
    const index = join(full, "index.html");
    return existsSync(index) ? index : null;
  }
  return existsSync(full) ? full : null;
}

createServer((req, res) => {
  const path = (req.url ?? "/").split("?")[0];
  for (const rule of rules) {
    if (!rule.re.test(path)) continue;
    // Byte-for-byte what vercel.json ships. Chromium does not upgrade
    // requests to localhost, so upgrade-insecure-requests needs no
    // special-casing here (measured: the policy with it hydrates fine).
    for (const { key, value } of rule.headers) res.setHeader(key, value);
  }
  // Directory without its trailing slash: redirect, as the static hosts do.
  const bare = join(ROOT, path);
  if (!path.endsWith("/") && existsSync(bare) && statSync(bare).isDirectory()) {
    res.writeHead(308, { Location: `${path}/` });
    res.end();
    return;
  }
  const file = resolve(path);
  const status = file ? 200 : 404;
  const body = file ?? join(ROOT, "404.html");
  res.writeHead(status, {
    "Content-Type": TYPES[extname(body)] ?? "application/octet-stream",
  });
  if (req.method === "HEAD") res.end();
  else res.end(readFileSync(body));
}).listen(PORT, () => console.log(`serve-with-headers: http://localhost:${PORT}`));
