import { expect, test } from "@playwright/test";
import sharp from "sharp";

/** Relative luminance per WCAG 2.1. */
function luminance([r, g, b]: number[]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(a: number[], b: number[]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const GROUND = [0x08, 0x07, 0x0a];
const SIGNAL = [0xf2, 0xed, 0xe3];
const EMBER = [0xe8, 0xa3, 0x3d];

test("palette tokens are the three specified values", async ({ page }) => {
  await page.goto("/");
  const tokens = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      ground: s.getPropertyValue("--color-ground").trim(),
      signal: s.getPropertyValue("--color-signal").trim(),
      ember: s.getPropertyValue("--color-ember").trim(),
    };
  });
  expect(tokens.ground.toLowerCase()).toBe("#08070a");
  expect(tokens.signal.toLowerCase()).toBe("#f2ede3");
  expect(tokens.ember.toLowerCase()).toBe("#e8a33d");
});

test("palette clears WCAG AA", () => {
  expect(ratio(SIGNAL, GROUND)).toBeGreaterThanOrEqual(4.5);
  // Ember carries numbers, which are body-sized — AA body, not just large.
  expect(ratio(EMBER, GROUND)).toBeGreaterThanOrEqual(4.5);
});

test("the display face is loaded and applied to statements", async ({
  page,
}) => {
  await page.goto("/");
  const family = await page
    .locator(".statement")
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toMatch(/Newsreader/i);
});

test("the lamp turns on and moves with scroll", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");

  const act = page.locator("[data-act]").first();
  const before = await act.evaluate((el) =>
    getComputedStyle(el).getPropertyValue("--lamp-y"),
  );
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.6));
  await page.waitForTimeout(120);
  const after = await act.evaluate((el) =>
    getComputedStyle(el).getPropertyValue("--lamp-y"),
  );
  expect(after).not.toBe(before);
});

test("reduced motion leaves the lamp off and the plates lit", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-lamp", "on");
  const opacity = await page
    .locator(".plate-lit")
    .first()
    .evaluate((el) => getComputedStyle(el).opacity);
  expect(Number(opacity)).toBe(1);
  await ctx.close();
});

test("with JavaScript disabled the plates are lit and the text is present", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Rakshit Rameshbabu" }),
  ).toBeVisible();
  await expect(page.locator(".plate-lit").first()).toBeVisible();
  await expect(page.locator(".statement").first()).toBeVisible();
  await ctx.close();
});

/** Pulls the resolved `at X% Y%` position out of a computed radial-gradient
 *  mask string. Scroll drives both the gradient's radius (via `--p`) and its
 *  position (via `--lamp-y`) — asserting only that the whole string changed
 *  cannot tell those apart, so this isolates the position channel. */
function positionOf(mask: string): { x: number; y: number } | null {
  const m = mask.match(/at\s+([\d.]+)%\s+([\d.]+)%/);
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
}

test("the mask on .plate-lit consumes the lamp's CSS variables on scroll", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");

  const plateLit = page.locator(".plate-lit").first();
  const readMask = () =>
    plateLit.evaluate((el) => {
      const s = getComputedStyle(el);
      return s.maskImage || s.webkitMaskImage;
    });

  const before = await readMask();
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.6));
  await page.waitForTimeout(120);
  const after = await readMask();

  expect(after).not.toBe(before);

  // The discriminating assertion: the resolved gradient position (which
  // reads --lamp-x/--lamp-y) must itself move, not just the radius (--p).
  const beforePos = positionOf(before);
  const afterPos = positionOf(after);
  expect(beforePos).not.toBeNull();
  expect(afterPos).not.toBeNull();
  expect(afterPos!.y).not.toBe(beforePos!.y);
});

test("plates keep a non-empty accessible name under reduced motion and with no JavaScript", async ({
  browser,
}) => {
  const reducedCtx = await browser.newContext({ reducedMotion: "reduce" });
  const reducedPage = await reducedCtx.newPage();
  await reducedPage.goto("/");
  const reducedAlt = await reducedPage
    .locator(".plate-lit")
    .first()
    .getAttribute("alt");
  expect(reducedAlt?.trim()).toBeTruthy();
  await expect(reducedPage.getByRole("img").first()).toHaveAccessibleName(
    /.+/,
  );
  await reducedCtx.close();

  const noJsCtx = await browser.newContext({ javaScriptEnabled: false });
  const noJsPage = await noJsCtx.newPage();
  await noJsPage.goto("/");
  const noJsAlt = await noJsPage
    .locator(".plate-lit")
    .first()
    .getAttribute("alt");
  expect(noJsAlt?.trim()).toBeTruthy();
  await expect(noJsPage.getByRole("img").first()).toHaveAccessibleName(/.+/);
  await noJsCtx.close();
});

const ACTS = [
  "hero",
  "about",
  "warden",
  "scheduler",
  "plantpal",
  "research",
  "ledger",
  "contact",
];

// Task 14c: the copy fades in once per act, gated on `[data-lamp="on"]` —
// the exact same gate the mask itself uses. No JS, or reduced motion, means
// `data-lamp` is never set, so the hidden (`opacity: 0`) state in
// globals.css never applies and the copy is simply present from first
// paint. Playwright's `toBeVisible()` does not inspect opacity, so these
// assert the actual computed value rather than trusting visibility alone.
test("with JavaScript disabled every act's copy is opaque from first paint", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-lamp", "on");
  for (const id of ACTS) {
    const statement = page.locator(`#${id} .statement`).first();
    const opacity = await statement.evaluate(
      (el) => getComputedStyle(el).opacity,
    );
    expect(
      Number(opacity),
      `act ${id} statement is not opaque with JavaScript disabled`,
    ).toBe(1);
  }
  await ctx.close();
});

test("reduced motion shows every act's copy immediately, with no beat to wait for", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-lamp", "on");
  for (const id of ACTS) {
    const statement = page.locator(`#${id} .statement`).first();
    const opacity = await statement.evaluate(
      (el) => getComputedStyle(el).opacity,
    );
    expect(
      Number(opacity),
      `act ${id} statement is not opaque under reduced motion`,
    ).toBe(1);
  }
  await ctx.close();
});

// One authored beat per act, on first arrival, never replayed. Lamp.tsx
// sets `data-seen` in its existing IntersectionObserver callback and never
// removes it, so scrolling an act out of view and back does not re-hide or
// re-fade its copy.
test("the copy reveal fires once and does not replay on scrolling back", async ({
  page,
}) => {
  await page.goto("/");
  const act = page.locator("#warden");
  const statement = act.locator(".statement").first();

  await act.scrollIntoViewIfNeeded();
  await expect(act).toHaveAttribute("data-seen", "");
  await expect(statement).toHaveCSS("opacity", "1");

  // Scroll back to the top, away from the act, then return to it.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  // `data-seen` persists — the attribute is only ever added, never removed.
  await expect(act).toHaveAttribute("data-seen", "");

  await act.scrollIntoViewIfNeeded();
  // Still opaque, immediately — no re-fade from opacity 0 on the return
  // pass. (If the beat had replayed, this would still resolve to 1 once
  // the transition finished, so the meaningful guard is `data-seen` above:
  // its persistence is what proves the CSS gate can't re-fire.)
  await expect(statement).toHaveCSS("opacity", "1");
});

for (const id of ACTS) {
  // Layout guard, not a contrast measurement: confirms the `.scrim` rule
  // is present and that the act's copy stays inside the band it covers.
  // It proves nothing about what colour actually renders behind the
  // text — see the "clears AA contrast" loop below for that.
  test(`text in act ${id} stays inside the scrimmed band`, async ({ page }) => {
    await page.goto("/");
    const act = page.locator(`#${id}`);
    await act.scrollIntoViewIfNeeded();
    // The copy fades in on first arrival (Task 14c) — wait for the beat to
    // resolve rather than sampling it mid-transition.
    await expect(
      act.locator(".statement, .prose-field, .label").first(),
    ).toHaveCSS("opacity", "1");

    const sample = await act.evaluate((el) => {
      const text = el.querySelector<HTMLElement>(
        ".statement, .prose-field, .label",
      );
      if (!text) return null;
      const r = text.getBoundingClientRect();
      const scrim = el.querySelector<HTMLElement>(".scrim");
      if (!scrim) return null;
      return {
        hasScrim: getComputedStyle(scrim, "::before").backgroundImage !== "none",
        left: r.left,
        width: r.width,
      };
    });
    expect(sample, `act ${id} has no text or no scrim`).not.toBeNull();
    expect(sample!.hasScrim).toBe(true);
    // Copy stays in the scrimmed left band, never out over open paint.
    expect(sample!.left).toBeLessThan(page.viewportSize()!.width * 0.55);
  });
}

// The real contrast gate. Screenshots each act clipped to its statement's
// own bounding box and measures the mean rendered colour behind it, then
// runs that mean through the same WCAG relative-luminance function used
// above for the palette check — not axe, which returns "incomplete" (not
// "fail") for text over an image and so never actually checks this.
//
// The sampled region includes the statement's own glyphs (bone-on-ground),
// which pulls the mean lighter than the true background alone — so this is
// a conservative test: it can only be harder to pass than measuring the
// bare background would be, never easier.
//
// THRESHOLD (0.12) was set during the 14c fix round, after correcting the
// bug the first 14c pass was unknowingly calibrated against: `Plate.tsx`
// rendered `.plate-lit` before `.plate-dark` in the DOM, and with neither
// layer carrying a `z-index`, the later (opaque, `brightness()`-dimmed)
// element always painted over the masked one — the lamp's reveal was never
// actually visible, on any build before this fix. Once the paint order was
// corrected (`.plate-dark` first, `.plate-lit` second) the plate brightness
// floor was re-tuned down (`.plate-dark` 0.42 → 0.32 — 0.42 was calibrated
// against a reveal that did nothing, so it read as "fine" for the wrong
// reason) and the narrow scrim was changed from percentage-of-box stops to
// fixed vh stops (see the media query above) so a few long acts (about,
// research) don't stretch the protected band across their whole,
// content-driven height.
//
// Re-ran this over the corrected, re-tuned build four times back to back —
// every act's real region measured byte-identical each run: 0.021
// (research) to 0.099 (ledger). 0.12 is ~1.2x the worst real act, not the
// ~8-10x headroom an under-tuned threshold would carry — deliberately
// tight. Verified this threshold actually gates something: disabling
// `.scrim::before`'s background (both the wide and narrow rules) and
// rebuilding raised every act's measured luminance (e.g. ledger
// 0.099 → 0.156, hero 0.050 → 0.065, scheduler 0.041 → 0.052) — with the
// paint order fixed, the scrim is now doing real, measurable work, and at
// 0.12 the break trips this gate (ledger's 0.156 fails; see
// task-14c-report.md for the full break-and-restore log). A run-to-run
// reproducibility note: the copy fades in once per act (Task 14c, gated on
// `data-seen`); the tests above wait for `opacity: 1` before sampling, or a
// statement caught mid-fade reads as noisy, occasionally spiking the
// measured luminance well above its settled value — that mechanism, not
// the plate itself, was the earlier source of run-to-run variance during
// development.
const CONTRAST_LUMINANCE_CEILING = 0.12;

// Task 14c fix round (2): the paint order (`.plate-dark` beneath
// `.plate-lit`) is the entire mechanism behind the lamp's reveal — both
// layers are `position: absolute; inset: 0` with no `z-index`, so document
// order IS paint order. This inverted once already (an accessibility fix
// swapped the two elements' `className`s instead of just their `alt`/
// `aria-hidden`), and nothing before this test would have caught it: the
// contrast gate below measures luminance behind the *text*, and a
// re-invert makes the whole visible field uniformly dim rather than
// brighter, so it does not cross CONTRAST_LUMINANCE_CEILING either way (see
// task-14c-report.md's fix-round-2 section for the measured proof). This
// structural check is the direct, mechanical guard: it fails the instant
// the DOM order regresses, independent of what shade of dim the images
// happen to render as.
//
// Task 14b fix round: extended to cover the third layer, `.plate-motion`
// (the scrubbed video), which Plate.tsx renders after both `<picture>`
// blocks. The original assertion only inspected `img` elements, so a future
// change that dropped the video between the two stills — or before
// `.plate-dark` — would not have failed it. `.plate-motion` carries the
// same mask as `.plate-lit` (see globals.css) and stands in for it inside
// the lamp's pool, so it must paint after both stills or it either hides
// beneath the dimmed layer or buries the reveal under an unmasked frame.
test("every plate paints the dark layer beneath the lit one, and any motion video last", async ({
  page,
}) => {
  await page.goto("/");
  const broken = await page.evaluate(() =>
    [...document.querySelectorAll(".plate")]
      .map((plate, i) => {
        // Document order among the plate's media layers only — img and
        // video are the only elements this ordering guarantee governs.
        const layers = [...plate.querySelectorAll("img, video")];
        const dark = layers.findIndex((n) => n.classList.contains("plate-dark"));
        const lit = layers.findIndex((n) => n.classList.contains("plate-lit"));
        const motion = layers.findIndex((n) => n.classList.contains("plate-motion"));
        const darkAfterLit = dark > -1 && lit > -1 && dark > lit;
        const motionNotLast = motion > -1 && (motion < dark || motion < lit);
        return darkAfterLit || motionNotLast ? i : -1;
      })
      .filter((i) => i > -1),
  );
  // Both stills are position:absolute with no z-index, so document order IS
  // paint order. Dark must come first or it covers the lamp's reveal
  // entirely — the exact bug this task's second pass existed to fix. Where
  // a motion video exists, it must be last of the three — after both
  // stills — or it paints beneath one of them instead of standing in for
  // the lit layer inside the lamp's pool.
  expect(broken).toEqual([]);
});

// The behavioural counterpart to the structural check above: proves the
// reveal is actually *visible*, not just correctly ordered in the DOM, so
// this survives a refactor that changes how the layering is achieved (e.g.
// a future z-index-based approach). Uses `warden`'s plate (Wright of
// Derby's "An Iron Forge") because its subject — a white-hot ingot on the
// anvil — is the single brightest, most unambiguous light source in the
// set, giving the biggest possible signal for this measurement.
//
// Margin: measured four times back to back against the real build, the
// lamp-centre patch and the far-corner patch are byte-identical each run —
// L=0.0891 (centre) vs L=0.0042 (corner), a ~21x ratio. Re-inverting the two
// `<picture>` blocks (simulating a regression of the bug this test guards)
// drops that ratio to ~2.8x — the dark layer's own brightness(0.32) floor
// still varies a little by location in the painting (centre happens to sit
// on a lighter part of the room than the corner), so a broken build isn't
// perfectly flat, but it is nowhere near a genuine reveal. The 6x threshold
// sits well above the broken-build ratio (2.8x) and well below the working
// one (21x), so it fails the regression with real margin rather than a
// hairline, without being so tight that ordinary rendering jitter could
// trip it.
test("the lamp's reveal pool is measurably brighter than the frame's far edge", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");

  const act = page.locator("#warden");
  await act.scrollIntoViewIfNeeded();
  // Let Lamp.tsx's rAF loop write fresh --lamp-x/--lamp-y/--p for the new
  // scroll position before sampling.
  await page.waitForTimeout(250);

  const viewport = page.viewportSize()!;
  // --lamp-x/--lamp-y are percentages of the act's own box (mask-image
  // position resolves against the element it's applied to, which fills the
  // act via inset: 0), so the on-screen point is the act's rect plus that
  // fraction — not a fraction of the viewport.
  const geometry = await act.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      lampX: parseFloat(style.getPropertyValue("--lamp-x")),
      lampY: parseFloat(style.getPropertyValue("--lamp-y")),
    };
  });

  const centerX = geometry.left + (geometry.lampX / 100) * geometry.width;
  const centerY = geometry.top + (geometry.lampY / 100) * geometry.height;

  // Far edge: the on-screen corner farthest from the lamp's centre.
  // Restricted to the right-hand corners because the lamp's rest position
  // is deliberately biased right of the text column on wide screens
  // (Lamp.tsx: `restX = max(0.52, rawX)`), and the left-hand corners sit
  // under the scrim's protected band — sampling there would measure the
  // scrim's own gradient, not the plate.
  const corners = [
    { x: viewport.width - 16, y: 16 },
    { x: viewport.width - 16, y: viewport.height - 16 },
  ];
  const farCorner = corners.reduce((best, c) => {
    const d = (c.x - centerX) ** 2 + (c.y - centerY) ** 2;
    const bestD = (best.x - centerX) ** 2 + (best.y - centerY) ** 2;
    return d > bestD ? c : best;
  });

  const patch = 48;
  const half = patch / 2;
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max - patch);

  const litClip = {
    x: clamp(centerX - half, viewport.width),
    y: clamp(centerY - half, viewport.height),
    width: patch,
    height: patch,
  };
  const edgeClip = {
    x: clamp(farCorner.x - half, viewport.width),
    y: clamp(farCorner.y - half, viewport.height),
    width: patch,
    height: patch,
  };

  const litBuf = await page.screenshot({ clip: litClip });
  const edgeBuf = await page.screenshot({ clip: edgeClip });

  const litLum = luminance(
    (await sharp(litBuf).stats()).channels.map((c) => c.mean),
  );
  const edgeLum = luminance(
    (await sharp(edgeBuf).stats()).channels.map((c) => c.mean),
  );

  const REVEAL_MARGIN = 6;
  expect(
    litLum,
    `lamp pool (L=${litLum.toFixed(4)}) is not at least ${REVEAL_MARGIN}x brighter than the frame's far edge (L=${edgeLum.toFixed(4)}) — the reveal may not be visible`,
  ).toBeGreaterThan(edgeLum * REVEAL_MARGIN);
});

for (const id of ACTS) {
  test(`text in act ${id} clears AA contrast behind its statement`, async ({
    page,
  }) => {
    await page.goto("/");
    const act = page.locator(`#${id}`);
    const statement = act.locator(".statement").first();
    await statement.scrollIntoViewIfNeeded();
    // The copy fades in on first arrival (Task 14c) — wait for the beat to
    // resolve fully before sampling, or the mid-transition, partially
    // transparent glyphs make this measurement noisy and occasionally
    // spike well above the settled value.
    await expect(statement).toHaveCSS("opacity", "1");

    const box = await statement.boundingBox();
    expect(box, `act ${id} has no statement to sample`).not.toBeNull();

    const buf = await page.screenshot({ clip: box! });
    const { channels } = await sharp(buf).stats();
    const lum = luminance(channels.map((c) => c.mean));

    expect(
      lum,
      `act ${id} background too bright behind its statement (L=${lum.toFixed(3)})`,
    ).toBeLessThan(CONTRAST_LUMINANCE_CEILING);
  });
}

// Task 14d fix round (finding 3, from the reviewer's own screenshot): the
// gate above only ever samples `.statement` — a heading, never what a
// visitor actually reads. The ledger act's reading text is a long body
// column (`.prose-field`, the archive list's description cells) the gate
// never looked at, so it passed while real body copy sat on the bright
// moonlit sky/river of `dovedale` at close to bone-on-light — measured
// directly, L=0.188 against the same 0.12 ceiling, before the fix below.
//
// Every act except hero carries at least one `.prose-field` element
// (hero has only the label/statement/stat rail — no body prose to
// sample). Each one is scrolled into view individually rather than
// relying on the statement's scroll position, since a long act's body
// copy does not all fit in one viewport alongside its heading.
for (const id of ACTS) {
  test(`body copy in act ${id} clears AA contrast`, async ({ page }) => {
    await page.goto("/");
    const act = page.locator(`#${id}`);
    const paras = act.locator(".prose-field");
    const count = await paras.count();
    if (count === 0) {
      // hero: no body prose exists to sample. Not a skip — there is
      // nothing this test could fail to check here.
      return;
    }
    for (let i = 0; i < count; i++) {
      const para = paras.nth(i);
      await para.scrollIntoViewIfNeeded();
      await expect(para).toHaveCSS("opacity", "1");

      const box = await para.boundingBox();
      if (!box || box.width < 1 || box.height < 1) continue;

      const buf = await page.screenshot({ clip: box });
      const { channels } = await sharp(buf).stats();
      const lum = luminance(channels.map((c) => c.mean));

      expect(
        lum,
        `act ${id} body copy #${i} background too bright (L=${lum.toFixed(3)})`,
      ).toBeLessThan(CONTRAST_LUMINANCE_CEILING);
    }
  });
}

// Task 14b: scroll-scrubbed plate motion. The hero act always ships motion
// (it survives both the full eight-plate spread and the four-plate fallback
// spread), so it's the fixed point these tests scrub against.
test("the hero plate scrubs its video with scroll", async ({ page }) => {
  await page.goto("/");
  const video = page.locator("#hero video").first();
  await expect(video).toHaveCount(1);
  // The video must be inert on its own — scroll is the only clock.
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  expect(await video.evaluate((v: HTMLVideoElement) => v.autoplay)).toBe(false);

  const at = () => video.evaluate((v: HTMLVideoElement) => v.currentTime);
  await page.waitForFunction(
    () => (document.querySelector("#hero video") as HTMLVideoElement)?.readyState >= 1,
  );
  const before = await at();
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.7));
  // The rAF loop drives the seek and the actual media seek is async, so
  // poll the condition itself rather than sleeping a fixed guess — under
  // parallel workers a flat wait races the loop and flakes.
  await page.waitForFunction(
    (prev) =>
      (document.querySelector("#hero video") as HTMLVideoElement)?.currentTime !== prev,
    before,
  );
  expect(await at()).not.toBe(before);
});

test("reduced motion renders the still plate and no video", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("video")).toHaveCount(0);
  await expect(page.locator(".plate-lit").first()).toBeVisible();
  await ctx.close();
});

// Fix round: the other two skip conditions Lamp.tsx computes into
// `motionAllowed` (a coarse pointer paired with a narrow viewport, and
// `navigator.connection.saveData`) had no test coverage — only reduced
// motion did. Unlike reduced motion, neither of these causes Plate.tsx's
// `<video>` element to be removed from the DOM (Lamp.tsx's `promoteVideos`
// just never runs), so the assertion here is narrower and more direct: the
// element exists, but its `src` attribute is never set, so nothing is ever
// requested.
test("a coarse pointer on a narrow viewport never promotes the video's src", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  // Sanity check on the emulation itself: `motionAllowed`'s condition reads
  // `matchMedia("(pointer: coarse)")`, not `hasTouch` directly — confirm
  // this context actually reports coarse before trusting a pass below.
  await page.goto("/");
  const coarse = await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches);
  expect(coarse, "this context did not emulate a coarse pointer — the test below proves nothing").toBe(true);

  await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");
  const video = page.locator("#hero video").first();
  await expect(video).toHaveCount(1);
  await page.waitForTimeout(300);
  expect(await video.evaluate((v: HTMLVideoElement) => v.getAttribute("src"))).toBeNull();
  await ctx.close();
});

test("navigator.connection.saveData never promotes the video's src", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "connection", {
      value: { saveData: true },
      configurable: true,
    });
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");
  const video = page.locator("#hero video").first();
  await expect(video).toHaveCount(1);
  await page.waitForTimeout(300);
  expect(await video.evaluate((v: HTMLVideoElement) => v.getAttribute("src"))).toBeNull();
  await ctx.close();
});

test("without JavaScript no video is requested", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  const requested: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith(".webm")) requested.push(r.url());
  });
  await page.goto("/");
  await expect(page.locator(".plate-lit").first()).toBeVisible();
  expect(requested).toEqual([]);
  await ctx.close();
});

// Task 14d: the torch — a page-wide flashlight, unified with the plate lamp
// so the page never carries two uncorrelated light sources.
test("the torch follows the pointer and never blocks interaction", async ({ page }) => {
  await page.goto("/");
  const overlay = page.locator(".torch");
  await expect(overlay).toHaveCount(1);
  expect(
    await overlay.evaluate((el) => getComputedStyle(el).pointerEvents),
  ).toBe("none");

  const read = () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--torch-x"),
    );
  await page.mouse.move(200, 200);
  await page.waitForTimeout(160);
  const a = await read();
  await page.mouse.move(900, 600);
  await page.waitForTimeout(300);
  expect(await read()).not.toBe(a);

  // The overlay must not intercept clicks.
  await page.getByRole("link", { name: /résumé/i }).first().click({ trial: true });
});

// Important 6 fix round: the original version of this loop never moved the
// pointer, and `data-torch="on"` is only ever set inside Torch.tsx's
// `onPointer` handler — so the assertion held in every context it ran in,
// including a plain desktop one with a fully working torch, because
// nothing here ever gave the torch a chance to arm. Deleting Torch.tsx's
// `reduce.matches || hover.matches` early-return left this test green.
// `page.mouse.move` gives every context a real chance to arm the torch;
// the three contexts below must still suppress it — reduced motion and
// no-JS never run Torch.tsx at all, and Playwright's touch emulation
// reports `(hover: none)`, which Torch.tsx's own guard checks.
test("the torch stays off for touch, reduced motion, and no JS", async ({ browser }) => {
  for (const opts of [
    { reducedMotion: "reduce" as const },
    { hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } },
    { javaScriptEnabled: false },
  ]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto("/");
    await page.mouse.move(400, 400, { steps: 5 });
    await page.waitForTimeout(200);
    await expect(page.locator("html")).not.toHaveAttribute("data-torch", "on");
    // Content is readable regardless.
    await expect(page.locator(".statement").first()).toBeVisible();
    await ctx.close();
  }
});

// Regression guard: both attributes land on <html> (Lamp.tsx sets
// data-lamp, Torch.tsx sets data-torch), so the rebalance rule MUST be a
// compound selector (`[data-torch="on"][data-lamp="on"]`) rather than a
// descendant combinator (`[data-torch="on"] [data-lamp="on"]`) — a
// descendant combinator requires data-lamp on a different element nested
// inside one carrying data-torch, and html has no ancestor, so it can
// never match. No existing test caught this because none of them move
// the pointer, which is the only thing that arms the torch.
test("the plate's unlit floor rises once the torch arms", async ({
  page,
}) => {
  await page.goto("/");
  // Let startup cost (hydration, image decode) settle before interacting.
  // Torch.tsx shares Lamp.tsx's frame-budget circuit breaker, which counts
  // any 10 consecutive frames slower than 32ms and locks the effect off —
  // under heavy parallel-worker load, one-time page-load jank can trip it
  // before the pointer ever gets a chance to move, which is a real
  // characteristic of the shared circuit-breaker shape, not something this
  // test is trying to verify. Settling first keeps that startup cost from
  // being mistaken for "this device can't hold the torch".
  await page.waitForTimeout(500);

  const plateDark = page.locator(".plate-dark").first();

  const baseFilter = await plateDark.evaluate((el) => getComputedStyle(el).filter);
  await expect(page.locator("html")).not.toHaveAttribute("data-torch", "on");

  await page.mouse.move(700, 450, { steps: 5 });
  await expect(page.locator("html")).toHaveAttribute("data-torch", "on", {
    timeout: 3000,
  });

  const armedFilter = await plateDark.evaluate((el) => getComputedStyle(el).filter);
  expect(armedFilter).not.toBe(baseFilter);
});

// Critical 1 fix: `.ignite`'s CSS mask used to read `--lamp-x`/`--lamp-y`
// exactly like `.plate-lit` does, but those percentages resolve against
// the masked element's OWN box — correct for `.plate-lit` (which fills the
// act) and meaningless for a few-character-wide metric, whose ignition
// therefore tracked its own layout width, never the lamp. The two tests
// below prove the fix the way the task asked: a real metric's rendered
// colour, sampled with `getComputedStyle` and a pixel screenshot, changes
// as the lamp crosses it — not just that a class toggles with no visible
// effect.
//
// Deliberately scroll-only, no pointer: `--lamp-x` moves by a *smoothed*
// pointer term (`POINTER_LERP`, Lamp.tsx), which only reaches a given
// target after enough animation frames actually run. Under this suite's
// default parallelism that convergence is not guaranteed within any fixed
// wait — an earlier version of this test drove the lamp by computing a
// pointer position and waiting for it to arrive, and intermittently caught
// the lerp mid-flight (see task-17-report.md for the measured pattern).
// `--p` (scroll progress), by contrast, is read directly from
// `getBoundingClientRect()` every tick with no smoothing at all, so a
// given scroll position always produces the same lamp position on the
// first frame after it — deterministic, not just probabilistically likely.
//
// Break-and-restore: reverting `.ignite::after` to the original
// `mask-image` rule (and removing Lamp.tsx's per-element comparison) with
// these tests left in place fails the first one — the metric that should
// be lit never turns ember, because the mask centres on the metric's own
// ~90×32px box, not the lamp's actual, much larger position. See
// task-17-report.md for the captured failure output.

/** Thrown when Lamp.tsx's frame-budget circuit breaker (10 consecutive
 *  frames over 32ms locks `data-lamp` off — see the comment above "the
 *  plate's unlit floor rises once the torch arms") trips mid-test, which
 *  is this sandboxed CI environment stalling for a beat, not the ignition
 *  mechanism failing. `withLampRetry` below is the only place that catches
 *  this; a genuine assertion failure (a real `expect(...)` mismatch) is a
 *  different error type and always propagates immediately, un-retried. */
class BreakerTripped extends Error {}

/** Retries `attempt` up to 3 times, only for `BreakerTripped` — any other
 *  thrown error (a real failed assertion) fails the test immediately on
 *  the first try, exactly as an unwrapped test body would. */
async function withLampRetry(fn: (attempt: number) => Promise<void>) {
  for (let i = 0; i < 3; i++) {
    try {
      await fn(i);
      return;
    } catch (e) {
      if (!(e instanceof BreakerTripped) || i === 2) throw e;
    }
  }
}

/** The scheduler act's headline numbers (`dl.flex.flex-wrap`): three
 *  `.ignite` values in one row, at increasing x — "0" (far left), "45,432"
 *  (middle), and "p = 2.6×10⁻¹⁶" (the widest label, pushed furthest
 *  right by the two items ahead of it in the flex row). The lamp's rest
 *  x (`restX`, Lamp.tsx) sits at 52% of the act's width; the third item's
 *  centre lands close enough to that (~43%) to fall inside the lamp's
 *  radius once the act is scrolled to roughly its own mid-point, while
 *  the first item (~10%) never does, at any scroll position — its
 *  distance from `restX` alone exceeds the radius's maximum. That
 *  asymmetry, verified directly against the built site rather than
 *  assumed, is what makes items 0 and 2 a reliable always-differs pair
 *  for the pixel comparison below, with no pointer involved on either
 *  side. */
async function schedulerHeadlineNumbers(page: import("@playwright/test").Page) {
  const act = page.locator("#scheduler");
  return {
    act,
    // Item 0: the metric that should never ignite — the reference for
    // "still bone" in the pixel comparison.
    neverLit: act.locator(".ignite").nth(0),
    // Item 2: the metric this pair of tests exercises.
    metric: act.locator(".ignite").nth(2),
  };
}

/** Scrolls so the scheduler act is not yet intersecting the viewport, but
 *  is still just inside the `10% 0px` `IntersectionObserver` margin
 *  Lamp.tsx uses to pre-arm acts — so it *is* in Lamp.tsx's `visible` set
 *  and genuinely being evaluated every tick, not simply never reached.
 *  `--p`'s formula (`(vh - top) / (height + vh)`, clamped to `[0, 1]`)
 *  is negative before the act's top reaches the viewport's bottom edge,
 *  so it clamps to exactly `0` across that whole pre-entry range — not a
 *  single hair-trigger scroll offset, a wide, stable plateau, confirmed
 *  directly against the built site: every scroll position with the act's
 *  top 0–90px below the viewport bottom reads `--p: 0` and the metric
 *  unlit, byte-identical (`opacity: "0"`), not a near-miss float. */
async function scrollScheduerJustBeforeEntry(page: import("@playwright/test").Page) {
  const actTop = await page.evaluate(
    () => document.getElementById("scheduler")!.getBoundingClientRect().top + window.scrollY,
  );
  const vh = await page.evaluate(() => window.innerHeight);
  // Act's top lands 50px below the viewport's bottom edge — inside the
  // 10%-margin pre-arm zone (10% of a typical viewport is 65–90px) but
  // nowhere near actually intersecting. `scrollY` such that
  // `actTop - scrollY == vh + 50` (the act's top sits 50px past the
  // viewport's bottom edge, in viewport-relative coordinates).
  await page.evaluate(
    (y) => window.scrollTo(0, Math.max(0, y)),
    actTop - (vh + 50),
  );
}

test("a metric ignites as the lamp crosses it", async ({ page }) => {
  await withLampRetry(async () => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");

    const { neverLit, metric } = await schedulerHeadlineNumbers(page);
    const readState = (el: import("@playwright/test").Locator) =>
      el.evaluate((e) => ({
        lampOn: document.documentElement.getAttribute("data-lamp"),
        isLit: e.classList.contains("is-lit"),
        emberOpacity: getComputedStyle(e, "::after").opacity,
      }));

    // Before the act has ever been on screen: both metrics are stone-cold
    // — never observed, never evaluated, exactly the no-JS/reduced-motion
    // default (bone, `opacity: 0` on the ember layer).
    await scrollScheduerJustBeforeEntry(page);
    await page.waitForTimeout(300);
    const before = await readState(metric);
    if (before.lampOn !== "on") throw new BreakerTripped();
    expect(before.isLit, "metric should not be lit before the act has ever been in view").toBe(
      false,
    );
    expect(Number(before.emberOpacity)).toBeLessThan(0.05);

    // Scroll the act into its natural view — its own scroll progress
    // (`--p`) now sits mid-act, where the lamp's radius is largest and
    // the third headline number falls inside it.
    await metric.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const afterNeverLit = await readState(neverLit);
    const afterMetric = await readState(metric);
    if (afterMetric.lampOn !== "on") throw new BreakerTripped();
    expect(afterMetric.isLit, "metric should be lit once its act is scrolled into view").toBe(
      true,
    );
    expect(Number(afterMetric.emberOpacity)).toBeGreaterThan(0.9);
    expect(
      afterNeverLit.isLit,
      "the far-left metric should still be unlit at the same scroll position — it never enters the lamp's radius",
    ).toBe(false);

    // The rendered colour itself, not just the class or the opacity:
    // screenshot both metrics in the same frame and confirm the lit one
    // reads meaningfully more ember (red-heavy relative to blue) than the
    // one that never ignites — a spatial comparison, not a before/after
    // of one element, so it needs no particular lerp state to be
    // meaningful; both are sampled at the exact same instant.
    const sample = async (el: import("@playwright/test").Locator) => {
      const box = (await el.boundingBox())!;
      const buf = await page.screenshot({ clip: box });
      const { channels } = await sharp(buf).stats();
      return channels.map((c) => c.mean); // [R, G, B]
    };
    const [litR, , litB] = await sample(metric);
    const [darkR, , darkB] = await sample(neverLit);
    const litGap = litR - litB;
    const darkGap = darkR - darkB;
    expect(
      litGap,
      `lit metric's rendered colour is not meaningfully more ember than the never-lit one (lit R-B=${litGap.toFixed(1)}, never-lit R-B=${darkGap.toFixed(1)})`,
    ).toBeGreaterThan(darkGap + 15);
  });
});

// The reverse direction: the same element, scrolled back out. Its own
// test (a fresh page) rather than a third scroll tacked onto the one
// above, matching the shape "the plate's unlit floor rises once the
// torch arms" already uses — keeps each test's own retry loop cheap.
test("a metric fades back to bone once the lamp leaves it", async ({ page }) => {
  await withLampRetry(async () => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");

    const { metric } = await schedulerHeadlineNumbers(page);
    const readState = () =>
      metric.evaluate((el) => ({
        lampOn: document.documentElement.getAttribute("data-lamp"),
        isLit: el.classList.contains("is-lit"),
        emberOpacity: getComputedStyle(el, "::after").opacity,
      }));

    await metric.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const lit = await readState();
    if (lit.lampOn !== "on") throw new BreakerTripped();
    expect(lit.isLit, "metric should be lit once its act is scrolled into view").toBe(true);
    expect(Number(lit.emberOpacity)).toBeGreaterThan(0.9);

    // Scroll back to just before the act enters — the lamp moves off the
    // metric (in fact, the act itself leaves Lamp.tsx's tracked `visible`
    // set for a moment on the way past, then re-enters at `--p: 0`, which
    // is genuinely the pre-entry state, not a frozen leftover of the lit
    // one).
    await scrollScheduerJustBeforeEntry(page);
    await page.waitForTimeout(500);
    const faded = await readState();
    if (faded.lampOn !== "on") throw new BreakerTripped();
    expect(
      faded.isLit,
      "metric should fade back to bone once the lamp scrolls away from it",
    ).toBe(false);
    expect(Number(faded.emberOpacity)).toBeLessThan(0.05);
  });
});

// Important 3 fix: the contrast gate above only ever sampled `.statement`
// and `.prose-field` — never `.ignite`, the one colour on the site with
// the least contrast headroom (ember on ground is ≈9.2:1 against bone's
// ≈17:1). At the existing CONTRAST_LUMINANCE_CEILING (0.12), bone still
// clears 4.5:1 but ember would already have dropped to ≈2.9:1 — below AA.
// Solving `(ratio·(Lg+0.05))/(1) - 0.05 = Lbg` for ratio=4.5 with ember's
// own luminance (~0.43) folded in the way this gate already mixes glyph
// and background pixels together gives a background ceiling of ~0.058,
// roughly half of the bone ceiling — the same shape of number the file's
// own CONTRAST_LUMINANCE_CEILING comment derives, just for the tighter
// colour.
//
// The torch is armed first (`page.mouse.move`) because that's the
// worst-case brightness for the *unlit* plate floor: `.plate-dark`'s
// filter rises from brightness(0.32) to brightness(0.56) once
// `[data-torch="on"][data-lamp="on"]` — see globals.css — so sampling
// with it armed catches the brightest background a `.ignite` element can
// ever actually sit on, independent of whether that particular element
// happens to be lit at the moment of the screenshot.
const IGNITE_LUMINANCE_CEILING = 0.058;

/** Navigates fresh and arms the torch, retrying (fresh navigation, not
 *  just another pointer move — a page that already dropped `data-torch`
 *  via the frame-budget circuit breaker won't pick it back up) up to 3
 *  times before giving up. Shares the same underlying cause and shape as
 *  `BreakerTripped`/`withLampRetry` above (Torch.tsx runs the identical
 *  circuit breaker Lamp.tsx does), pulled into its own small helper here
 *  because every test below needs "start armed", not "recover mid-test". */
async function gotoWithTorchArmed(page: import("@playwright/test").Page) {
  for (let i = 0; i < 3; i++) {
    await page.goto("/");
    await page.mouse.move(900, 500, { steps: 5 });
    try {
      await expect(page.locator("html")).toHaveAttribute("data-torch", "on", {
        timeout: 2000,
      });
      return;
    } catch (e) {
      if (i === 2) throw e;
    }
  }
}

test("ember contrast: arming the torch first", async ({ page }) => {
  await gotoWithTorchArmed(page);
});

// Regression guard: the reported bug. The old circuit breaker (an inline
// counter in both Torch.tsx and Lamp.tsx) counted 10 CONSECUTIVE rAF
// callbacks slower than 32ms and, once tripped, called teardown() —
// cancelling the rAF loop and removing every listener for the rest of the
// session. 32ms is under 31fps and this page seeks a WebM and decodes
// multi-megapixel AVIFs while scrolling, on top of a second rAF loop for
// the other component — completely ordinary scrolling reaches ten such
// frames trivially, and once it does, there is no path back: the torch (and
// the lamp) goes dark for the rest of the visit, exactly as the owner
// reported ("visible on the first page" and never again after scrolling).
//
// This test scrolls through every act the way a reader actually would —
// not a single scrollIntoViewIfNeeded — specifically to give that load a
// real chance to happen, then asserts the torch and lamp are BOTH still
// alive afterward. Confirmed this fails against the pre-fix breaker: with
// the old "10 consecutive frames > 32ms → teardown()" logic restored in
// Torch.tsx/Lamp.tsx, this test fails reliably under load, exactly
// reproducing the report; see task-18-report.md for the captured failing
// run. The fix (src/lib/motion.ts's createFrameBudgetGuard) is a
// rolling-window, hysteresis breaker that can suspend and recover, so a
// transient stall no longer permanently kills either effect.
test("the torch and lamp survive a normal scroll through every act", async ({
  page,
}) => {
  await gotoWithTorchArmed(page);
  await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");

  for (const id of ACTS) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    // A reader lingers on each act rather than teleporting through them —
    // long enough for the act's own video-seek/AVIF-decode work (the load
    // that used to trip the old breaker) to actually happen.
    await page.waitForTimeout(200);
  }

  await expect(page.locator("html")).toHaveAttribute("data-torch", "on");
  await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");
  await expect(page.locator(".torch")).toHaveCSS("opacity", "1");
});

for (const id of ACTS) {
  test(`ignite metrics in act ${id} clear ember-appropriate AA contrast`, async ({
    page,
  }) => {
    // Arm the torch once per test — the worst-case brightness floor
    // described above — before scrolling to and sampling this act.
    await gotoWithTorchArmed(page);

    const act = page.locator(`#${id}`);
    const metrics = act.locator(".ignite");
    const count = await metrics.count();
    if (count === 0) {
      // about, ledger, and contact carry no `.ignite` metric — nothing
      // this test could fail to check there.
      return;
    }
    for (let i = 0; i < count; i++) {
      const metric = metrics.nth(i);
      await metric.scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);

      const box = await metric.boundingBox();
      if (!box || box.width < 1 || box.height < 1) continue;

      const buf = await page.screenshot({ clip: box });
      const { channels } = await sharp(buf).stats();
      const lum = luminance(channels.map((c) => c.mean));

      expect(
        lum,
        `act ${id} ignite metric #${i} background too bright for ember (L=${lum.toFixed(3)})`,
      ).toBeLessThan(IGNITE_LUMINANCE_CEILING);
    }
  });
}
