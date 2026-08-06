// Performance budget: gzipped JS referenced by exported pages.
// Fails the build when the ceiling is exceeded — raise it only with a
// deliberate commit, never silently.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const BUDGET_KB = 210; // baseline 2026-08: ~190 kB gz (Next 16 + React 19 runtime)

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

process.exit(failed ? 1 : 0);
