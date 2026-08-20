// Lighthouse gate against the served static export. Category minimums are
// a ratchet: raise them as the numbers improve, never lower them to pass.
// Usage: node scripts/check-lighthouse.mjs http://localhost:4573/
//
// P6-perf item 6 (measurement hygiene, not threshold surgery — thresholds
// below are unchanged): a single Lighthouse run on shared CI hardware is
// noisy enough to fail on a diff with no plausible performance mechanism
// (context.md records two such failures on the same commit: mobile 70 then
// 66 vs. min 75, after passing 80 the run before, on a diff that touched
// only CSS filter values, copy strings, and small hero markup). This
// script now runs each form factor RUNS_PER_FORM (3) times and gates on
// the MEDIAN score — standard Lighthouse CI practice for exactly this kind
// of run-to-run variance — and prints every individual run's score plus
// its sub-metrics (LCP, TBT, Speed Index, CLS) so a future failure is
// diagnosable from the CI log instead of a single opaque number.
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

const RUNS_PER_FORM = 3;

const dir = mkdtempSync(join(tmpdir(), "lh-"));
let failed = false;

/** The middle value of an odd-length numeric array (RUNS_PER_FORM is
 *  always odd here — 3 — so there is no even-length tie-break to define). */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

// A Lighthouse invocation can exit non-zero without the run itself having
// failed — observed directly during this task's own local measurement
// work: chrome-launcher's post-run cleanup (`Launcher.kill()` ->
// `destroyTmp()` -> `rmSync` on its own temp profile dir) can throw EPERM
// on a machine where something else (AV real-time scanning, a lingering
// handle) still has that directory open for an instant, which crashes the
// CLI process AFTER it has already written a complete, valid report to
// `out` — the report on disk is not the thing that failed. Checking for
// that valid report before treating a non-zero exit as a real failure
// recovers a perfectly good score instead of discarding it; only a
// genuinely missing/unparseable report retries, and a SECOND failure on
// the same (form, index) is treated as real and propagates.
const RUN_RETRIES = 1;

function runOnce(form, index) {
  const out = join(dir, `${form}-${index}.json`);
  for (let attempt = 0; ; attempt++) {
    try {
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
      return JSON.parse(readFileSync(out, "utf8"));
    } catch (err) {
      // The CLI process failed, but Lighthouse writes its report file
      // before any post-run cleanup runs — so a failure doesn't
      // necessarily mean there is no usable report sitting on disk. Only
      // trust it if it actually parses as one (has a `categories` object);
      // anything else falls through to the normal retry/rethrow below.
      try {
        const report = JSON.parse(readFileSync(out, "utf8"));
        if (report?.categories) {
          console.log(
            `     ${form} run ${index + 1}: Lighthouse's CLI process exited non-zero ` +
              `(${err.message.split("\n")[0]}), but a valid report was already written — using it.`,
          );
          return report;
        }
      } catch {
        // No usable report on disk — fall through to retry/rethrow.
      }
      if (attempt >= RUN_RETRIES) throw err;
      console.log(
        `     ${form} run ${index + 1}: Lighthouse invocation failed, retrying once (${err.message.split("\n")[0]})`,
      );
    }
  }
}

/** ms-valued audits print as whole ms; CLS (unitless) prints to 3dp. */
function fmtMetric(value, unit) {
  if (value === undefined || value === null) return "n/a";
  return unit === "ms" ? `${Math.round(value)}ms` : value.toFixed(3);
}

for (const form of ["mobile", "desktop"]) {
  const reports = [];
  for (let i = 0; i < RUNS_PER_FORM; i++) {
    const report = runOnce(form, i);
    reports.push(report);
    const lcp = report.audits["largest-contentful-paint"]?.numericValue;
    const tbt = report.audits["total-blocking-time"]?.numericValue;
    const si = report.audits["speed-index"]?.numericValue;
    const cls = report.audits["cumulative-layout-shift"]?.numericValue;
    const perf = Math.round((report.categories.performance?.score ?? 0) * 100);
    console.log(
      `     ${form} run ${i + 1}/${RUNS_PER_FORM}: performance ${perf} ` +
        `(LCP ${fmtMetric(lcp, "ms")}, TBT ${fmtMetric(tbt, "ms")}, ` +
        `SI ${fmtMetric(si, "ms")}, CLS ${fmtMetric(cls, "num")})`,
    );
  }

  for (const [cat, min] of Object.entries(MIN[form])) {
    const scores = reports.map((r) => Math.round((r.categories[cat]?.score ?? 0) * 100));
    const med = median(scores);
    const ok = med >= min;
    console.log(
      `${ok ? "OK  " : "FAIL"} ${form} ${cat}: median ${med} of [${scores.join(", ")}] (min ${min})`,
    );
    if (!ok) failed = true;
  }

  const clsValues = reports.map((r) => r.audits["cumulative-layout-shift"]?.numericValue ?? 0);
  const clsMed = median(clsValues);
  const clsOk = clsMed < 0.02;
  console.log(
    `${clsOk ? "OK  " : "FAIL"} ${form} CLS: median ${clsMed.toFixed(3)} of [${clsValues
      .map((v) => v.toFixed(3))
      .join(", ")}] (max 0.02)`,
  );
  if (!clsOk) failed = true;
}

process.exit(failed ? 1 : 0);
