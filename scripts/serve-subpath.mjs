// F2 (final fix wave): serves `out/` the way GitHub Pages actually does —
// under `/<basePath>/`, not at the origin root. `playwright.config.ts`'s
// webServer serves `out/` directly at the root, which is the Vercel deploy
// shape; that shape never exercises a single `withBase()`-prefixed link or
// asset, so it cannot catch a sub-path regression by construction. This
// script mounts a copy of `out/` one directory down (`.subpath-root/
// <basePath>/`) and serves the parent directory instead, so
// `http://localhost:<port>/<basePath>/…` resolves exactly the way
// `https://<owner>.github.io/<repo>/…` does. Used only by
// `playwright.subpath.config.ts`'s webServer — never the primary gate.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/^\/+|\/+$/g, "");
if (!basePath) {
  console.error(
    "serve-subpath: NEXT_PUBLIC_BASE_PATH must be set to a non-empty sub-path (e.g. /portfolio)",
  );
  process.exit(1);
}
if (!existsSync("out")) {
  console.error("serve-subpath: out/ does not exist — run: npm run build");
  process.exit(1);
}

const root = join(process.cwd(), ".subpath-root");
const mount = join(root, basePath);
rmSync(root, { recursive: true, force: true });
mkdirSync(mount, { recursive: true });
cpSync("out", mount, { recursive: true });

const port = process.env.SUBPATH_PORT ?? "4576";
// Resolved explicitly (see F3/F4, playwright.config.ts's own webServer
// comment) rather than a bare `serve` — this script runs as a raw
// `node scripts/serve-subpath.mjs` child process, spawned by Playwright's
// webServer, not through an npm-script context that would already have
// `node_modules/.bin` on PATH.
const serveBin = join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "serve.cmd" : "serve",
);

const child = spawn(serveBin, [root, "-l", port], {
  stdio: "inherit",
  // Windows can't spawn a `.cmd` shim directly without going through a
  // shell (Node throws EINVAL otherwise) — the same reason
  // check-lighthouse.mjs's execFileSync carries this same condition.
  shell: process.platform === "win32",
});
child.on("exit", (code) => process.exit(code ?? 0));
