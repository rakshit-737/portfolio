import type { Browser, Page } from "@playwright/test";
import sharp from "sharp";

/**
 * Shared test-suite plumbing (E1/E2/E3, final fix wave). Before this file
 * existed, `luminance()`/`ratio()`/`CONTRAST_LUMINANCE_CEILING` and the
 * `BreakerTripped`/retry-wrapper shape were each hand-duplicated across
 * `lamplight.spec.ts`, `a11y.spec.ts`, and `idle-stop.spec.ts` — copy-paste
 * seams that had already drifted once (two different retry budgets, one
 * file's contrast ceiling redeclared as a separate constant of the same
 * literal value). One copy of each, imported everywhere it's needed.
 */

/** Relative luminance per WCAG 2.1. */
export function luminance([r, g, b]: number[]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG 2.1 contrast ratio between two RGB colours. */
export function ratio(a: number[], b: number[]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The tight luminance ceiling every per-act/per-region pixel-contrast gate
 * in the suite is held to. Set during the 14c fix round and re-verified
 * since: four repeat runs over the corrected, re-tuned build measured
 * every act's real region at 0.021 (research) to 0.099 (ledger) —
 * `lamplight.spec.ts`'s own contrast-gate tests carry the full derivation
 * and the break-and-restore proof that this ceiling actually gates
 * something (disabling `.scrim::before` measurably raised every act's
 * luminance past it).
 */
export const CONTRAST_LUMINANCE_CEILING = 0.12;

/** Screenshots a Playwright locator's bounding box and returns its mean
 *  rendered luminance, or `null` when the locator has no visible box. */
export async function sampleLuminance(
  page: Page,
  locator: ReturnType<Page["locator"]>,
) {
  const box = await locator.boundingBox();
  if (!box || box.width < 1 || box.height < 1) return null;
  const buf = await page.screenshot({ clip: box });
  const { channels } = await sharp(buf).stats();
  return luminance(channels.map((c) => c.mean));
}

/**
 * True if any pixel in a screenshot buffer is near-bone (`--color-signal`,
 * #F2EDE3) — the per-pixel occlusion check `lamplight.spec.ts`'s "own
 * label is not occluded" tests use. A mean-luminance check (the ceiling
 * above) is the right tool for a statement or a paragraph, but it is far
 * too easy to pass on a mostly-whitespace element like `.label` even when
 * fully occluded — most of a label's box is letter-spaced gaps between
 * glyphs, which keeps the mean low whether or not any glyph pixel actually
 * survives. This asserts on a genuine per-pixel search instead: a
 * comfortable margin below full bone (242, 237, 227) and well above what
 * a real occlusion measures (see `lamplight.spec.ts`'s own
 * break-and-restore numbers), so anti-aliased glyph edges still pass while
 * nothing occluded could be mistaken for one.
 */
export async function hasNearBonePixel(buf: Buffer): Promise<boolean> {
  const { data, info } = await sharp(buf)
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i + 2 < data.length; i += info.channels) {
    if (data[i] >= 180 && data[i + 1] >= 175 && data[i + 2] >= 165) return true;
  }
  return false;
}

/**
 * Thrown when the shared frame-budget circuit breaker (a rolling 60-frame
 * window, tripped once a clear majority run slower than 50ms — see
 * src/lib/motion.ts) locks `data-lamp`/`data-torch` off mid-test, which is
 * this sandboxed CI environment stalling for a beat, not the mechanism
 * under test failing. `withBreakerRetry` below is the only place that
 * catches this; a genuine assertion failure (a real `expect(...)`
 * mismatch) is a different error type and always propagates immediately,
 * un-retried.
 */
export class BreakerTripped extends Error {}

/**
 * Retries `attempt` up to `MAX_ATTEMPTS` times, only for `BreakerTripped`
 * — any other thrown error (a real failed assertion) fails the test
 * immediately on the first try, exactly as an unwrapped test body would.
 *
 * One shared budget (E1/E2/E3, final fix wave) — `lamplight.spec.ts` and
 * `idle-stop.spec.ts` each hand-rolled their own version of this before,
 * at two different attempt counts (5 and 4) that had already drifted from
 * each other with no reason either number was more correct than the
 * other. 5 is `lamplight.spec.ts`'s own figure, chosen because "the torch
 * and lamp survive a normal scroll through every act" occasionally
 * exhausted a smaller budget under this suite's heaviest parallel load —
 * see that file's original comment (task-20-report.md) for the full
 * reasoning; it passed reliably every time run in isolation, confirming
 * the failures were retry budget, not a logic defect.
 */
const MAX_ATTEMPTS = 5;

export async function withBreakerRetry(fn: (attempt: number) => Promise<void>) {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      await fn(i);
      return;
    } catch (e) {
      if (!(e instanceof BreakerTripped) || i === MAX_ATTEMPTS - 1) throw e;
    }
  }
}

/**
 * A genuine touch/mobile emulation — `hasTouch`+`isMobile` is what makes
 * Playwright report `(hover: none)`/`(pointer: coarse)`, the media
 * features Torch.tsx and the site's touch-only affordances actually key
 * off of. 390×844 matches the mobile viewport the rest of the suite
 * already standardises on (`tests/mobile.spec.ts`'s own `MOBILE`
 * constant, folded into this one shared factory).
 *
 * Always use this — never `page.setViewportSize()` on the default desktop
 * `page` fixture — for anything meant to emulate a phone. The two are not
 * equivalent: a desktop context resized to a phone's CSS pixel dimensions
 * still reports `(pointer: fine)`/`(hover: hover)`, so Torch.tsx remains
 * exactly as eligible to arm as it would on a real mouse-driven desktop.
 * E3 (final fix wave) found two "mobile" probes doing exactly that — a
 * literal `390x844` in the test name, but a desktop context underneath —
 * this factory exists so that mismatch can't recur silently.
 */
export function mobileContext(browser: Browser) {
  return browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
}

/**
 * A real desktop (mouse-capable, `hover:hover`/`pointer:fine`) context at
 * an explicit viewport size — for a test that deliberately wants a
 * specific desktop window size, not a phone emulation, alongside a
 * desktop-only affordance like the torch. Exists so a call site's intent
 * is explicit rather than a bare `page.setViewportSize()` call whose
 * intent a future reader has to guess at — the exact ambiguity that let
 * two truly mobile-intended probes quietly run as desktop contexts (see
 * `mobileContext`'s own comment above).
 */
export function desktopAt(page: Page, viewport: { width: number; height: number }) {
  return page.setViewportSize(viewport);
}
