// P6-perf item 5: a NON-BLOCKING scroll-trace report against the served
// static export. Launches Chromium, opens a CDP session, starts a
// devtools-timeline trace, scripts a top-to-bottom scroll of the landing
// page (the same shape lamplight.spec.ts's no-void guard already uses:
// fixed-size steps with a settle wait between each), and reports two
// numbers from that pass:
//
//   - long tasks: main-thread "RunTask" trace events over LONG_TASK_MS
//     (200ms), read directly from the CDP trace (`devtools.timeline`
//     category) — the same event Chrome's own Long Tasks API is built on.
//   - dropped-frame percentage: measured independently, in-page, via a
//     requestAnimationFrame sampler running for the same scroll pass — a
//     frame whose delta from the previous one exceeds DROPPED_FRAME_MS
//     counts as dropped. This is a separate signal from the CDP trace
//     (Chrome's frame-pipeline trace events are version-fragile to parse
//     reliably across Chromium releases; rAF deltas are not) rather than a
//     second attempt at the same measurement.
//
// This script never fails the build — it always exits 0 unless Chromium
// itself can't launch or the page can't be reached. It is a report, not a
// gate: run it, read the numbers, and use them to decide a future
// threshold. Do not wire its exit code into CI as a pass/fail condition.
//
// RATCHET NOTE (not yet enforced — record here for a later hard gate):
//   - LCP <= 2.5s (the standard "good" threshold, mobile-class hardware)
//   - TBT <= 200ms (mobile-class) — this script prints an approximate TBT
//     proxy (sum of each long task's time past the standard 50ms
//     blocking-window boundary) for the SCROLL pass specifically, which is
//     not the same measurement as Lighthouse's TBT (computed over the page
//     LOAD trace, not a post-load scroll) — useful signal, not a
//     substitute for the Lighthouse gate's own TBT audit.
//
// Usage: node scripts/scroll-trace.mjs http://localhost:4573/
import { chromium } from "@playwright/test";

const url = process.argv[2] ?? "http://localhost:4573/";

const LONG_TASK_MS = 200;
const TBT_BLOCKING_WINDOW_MS = 50; // standard Total Blocking Time definition
const DROPPED_FRAME_MS = 1000 / 60 + 16.7; // ~2x a 60fps frame budget
const SCROLL_STEP_PX = 700; // matches lamplight.spec.ts's no-void probe
const SCROLL_SETTLE_MS = 200;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const client = await page.context().newCDPSession(page);

  const traceEvents = [];
  client.on("Tracing.dataCollected", (data) => {
    if (Array.isArray(data?.value)) traceEvents.push(...data.value);
  });

  await client.send("Tracing.start", {
    categories: "devtools.timeline,disabled-by-default-devtools.timeline",
    transferMode: "ReportEvents",
  });

  await page.goto(url, { waitUntil: "load" });

  // In-page rAF sampler for the dropped-frame measurement — installed
  // before the scroll starts, read back after it ends.
  await page.evaluate(() => {
    window.__frameDeltas = [];
    let last = 0;
    const sample = (now) => {
      if (last) window.__frameDeltas.push(now - last);
      last = now;
      window.__rafHandle = requestAnimationFrame(sample);
    };
    window.__rafHandle = requestAnimationFrame(sample);
  });

  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const scrollStart = Date.now();
  for (let y = 0; y < height; y += SCROLL_STEP_PX) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(SCROLL_SETTLE_MS);
  }
  const scrollMs = Date.now() - scrollStart;

  const frameDeltas = await page.evaluate(() => {
    cancelAnimationFrame(window.__rafHandle);
    return window.__frameDeltas;
  });

  const tracingComplete = new Promise((resolve) =>
    client.once("Tracing.tracingComplete", resolve),
  );
  await client.send("Tracing.end");
  await tracingComplete;

  await browser.close();

  // "RunTask" (ph: "X", a complete event with a `dur` in microseconds) is
  // the main-thread task boundary Chrome's own Long Tasks API is built on.
  const longTasks = traceEvents
    .filter((e) => e.name === "RunTask" && e.ph === "X" && typeof e.dur === "number")
    .map((e) => e.dur / 1000) // microseconds -> ms
    .filter((ms) => ms > LONG_TASK_MS)
    .sort((a, b) => b - a);

  const tbtProxy = longTasks.reduce(
    (sum, ms) => sum + Math.max(0, ms - TBT_BLOCKING_WINDOW_MS),
    0,
  );

  const droppedFrames = frameDeltas.filter((d) => d > DROPPED_FRAME_MS).length;
  const droppedPct =
    frameDeltas.length > 0 ? (droppedFrames / frameDeltas.length) * 100 : 0;

  console.log(`scroll-trace report — ${url} (390x844, mobile-class)`);
  console.log(`  scroll duration: ${scrollMs}ms over ${height}px`);
  console.log(
    `  long tasks (>${LONG_TASK_MS}ms): ${longTasks.length}${
      longTasks.length > 0
        ? ` — top 5: ${longTasks.slice(0, 5).map((ms) => ms.toFixed(0)).join(", ")}ms`
        : ""
    }`,
  );
  console.log(`  TBT proxy (scroll pass only, not a Lighthouse-equivalent TBT): ${tbtProxy.toFixed(0)}ms`);
  console.log(
    `  frames sampled: ${frameDeltas.length}, dropped (>${DROPPED_FRAME_MS.toFixed(1)}ms): ${droppedFrames} (${droppedPct.toFixed(1)}%)`,
  );
  console.log(
    `  ratchet targets (not yet enforced): LCP <= 2500ms, TBT <= 200ms mobile-class`,
  );
}

main().catch((err) => {
  // Reachability/launch failures are reported, not swallowed — but this
  // script still exits 0 so it never blocks CI; see the file header.
  console.error("scroll-trace: could not complete the probe:", err?.message ?? err);
});
