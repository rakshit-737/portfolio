// Lighthouse gate against the served static export. Category minimums are
// a ratchet: raise them as the numbers improve, never lower them to pass.
// Usage: node scripts/check-lighthouse.mjs http://localhost:4573/
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const url = process.argv[2] ?? "http://localhost:4573/";

// Mobile perf reflects the framework hydration baseline (~190 kB gz JS);
// tracked honestly rather than gamed. Everything else must stay at 95+.
const MIN = {
  mobile: { performance: 75, accessibility: 100, "best-practices": 95, seo: 100 },
  desktop: { performance: 95, accessibility: 100, "best-practices": 95, seo: 100 },
};

const dir = mkdtempSync(join(tmpdir(), "lh-"));
let failed = false;

for (const form of ["mobile", "desktop"]) {
  const out = join(dir, `${form}.json`);
  execFileSync(
    "npx",
    [
      "--yes",
      "lighthouse",
      url,
      "--quiet",
      '--chrome-flags=--headless=new --no-sandbox',
      "--output=json",
      `--output-path=${out}`,
      "--only-categories=performance,accessibility,best-practices,seo",
      ...(form === "desktop" ? ["--preset=desktop"] : []),
    ],
    { stdio: ["ignore", "inherit", "inherit"], shell: process.platform === "win32" },
  );
  const report = JSON.parse(readFileSync(out, "utf8"));
  for (const [cat, min] of Object.entries(MIN[form])) {
    const score = Math.round((report.categories[cat]?.score ?? 0) * 100);
    const ok = score >= min;
    console.log(`${ok ? "OK  " : "FAIL"} ${form} ${cat}: ${score} (min ${min})`);
    if (!ok) failed = true;
  }
  const cls = report.audits["cumulative-layout-shift"]?.numericValue ?? 0;
  const clsOk = cls < 0.02;
  console.log(`${clsOk ? "OK  " : "FAIL"} ${form} CLS: ${cls.toFixed(3)} (max 0.02)`);
  if (!clsOk) failed = true;
}

process.exit(failed ? 1 : 0);
