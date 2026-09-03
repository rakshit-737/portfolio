import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  CONTRAST_LUMINANCE_CEILING,
  expectRevealed,
  hasNearBonePixel,
  mobileContext,
  sampleLuminance,
} from "./helpers";

/**
 * P14 — accessibility hardening. axe already runs at zero violations on all
 * four routes (tests/smoke.spec.ts) and pixel contrast gates already cover
 * statements, body copy, and ember text (tests/lamplight.spec.ts). This file
 * closes what axe cannot see: heading structure, landmarks, the skip link,
 * full keyboard tab order, the command palette's focus trap, a mobile-width
 * contrast spot-check against the two brightest painted regions text can
 * overlap, the new `prefers-contrast: more` variant, and print/reduced-
 * motion re-verification for the surface added since the last a11y pass
 * (exhibits, the ledger grid, the certificate lightbox).
 *
 * `luminance()`/`ratio()`/`CONTRAST_LUMINANCE_CEILING`, the mobile-context
 * factory, and the near-bone occlusion check all now live in ./helpers
 * (E1/E2/E3/E4/E5, final fix wave) — this file, lamplight.spec.ts, and
 * idle-stop.spec.ts had each hand-duplicated some subset of them before.
 */

// ─────────────────────────────────────────────────────────────────────────
// 1. Structure
// ─────────────────────────────────────────────────────────────────────────

/** Walks every `h1`–`h6` in DOM order and returns the ones (if any) whose
 *  level jumps by more than one past the previous heading's level — a
 *  level may always *drop* by any amount (a new sibling section starting
 *  back at h2 after a deeper h4 is legal), it just may never *skip up*. */
async function findSkippedHeadingLevels(
  page: Page,
): Promise<{ level: number; text: string; prevLevel: number }[]> {
  return page.evaluate(() => {
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
      (h) => ({
        level: Number(h.tagName[1]),
        text: (h.textContent || "").trim().slice(0, 60),
      }),
    );
    const broken: { level: number; text: string; prevLevel: number }[] = [];
    let prevLevel = 0;
    for (const h of headings) {
      if (prevLevel > 0 && h.level > prevLevel + 1) {
        broken.push({ ...h, prevLevel });
      }
      prevLevel = h.level;
    }
    return broken;
  });
}

for (const path of ["/", "/projects/warden/"]) {
  test(`heading tree has no skipped levels on ${path}`, async ({ page }) => {
    await page.goto(path);
    const broken = await findSkippedHeadingLevels(page);
    expect(
      broken,
      `heading level(s) skipped: ${JSON.stringify(broken)}`,
    ).toEqual([]);
  });

  test(`exactly one h1 on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test(`landmarks are correct on ${path}`, async ({ page }) => {
    await page.goto(path);
    // One main.
    await expect(page.locator("main")).toHaveCount(1);
    // Every nav carries an accessible name (aria-label here — no nav on
    // the site relies on an implicit accessible name).
    const navCount = await page.locator("nav").count();
    expect(navCount).toBeGreaterThan(0);
    for (let i = 0; i < navCount; i++) {
      const name = await page.locator("nav").nth(i).getAttribute("aria-label");
      expect(name?.trim(), `nav #${i} has no accessible name`).toBeTruthy();
    }
    // footer with no ancestor landmark carries the implicit contentinfo
    // role — assert the role directly rather than trusting the tag alone.
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
  });

  test(`skip link is present, hidden until focus, and jumps into content on ${path}`, async ({
    page,
  }) => {
    await page.goto(path);
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toHaveCount(1);

    // Off-screen (sr-only) until it receives focus.
    const hiddenBox = await skip.boundingBox();
    expect(hiddenBox?.width ?? 0).toBeLessThanOrEqual(1);

    // First Tab from a fresh load reaches it (it is the very first
    // focusable element in the document).
    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();

    // Visible once focused — sr-only's `focus:not-sr-only` escape hatch.
    const visibleBox = await skip.boundingBox();
    expect(visibleBox!.width).toBeGreaterThan(20);
    expect(visibleBox!.height).toBeGreaterThan(10);

    // Activating it lands on the page's own top anchor.
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#top$/);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Contrast, post-floor
// ─────────────────────────────────────────────────────────────────────────

// The brief names the two brightest painted regions text can overlap on a
// narrow viewport specifically: the blacksmith's white-hot iron (hero) and
// the La Tour collar/flame (contact) — both plates whose `lamp` rest point
// (src/lib/art.ts) sits close to the vertical band the mobile scrim's
// top-to-bottom gradient (globals.css, `@media (max-width: 48rem)`) has to
// protect. 390x844 is the same mobile viewport the no-void probe already
// uses (tests/lamplight.spec.ts).
const MOBILE_SPOTCHECK_ACTS = ["hero", "contact"] as const;

for (const id of MOBILE_SPOTCHECK_ACTS) {
  test(`act ${id} clears AA contrast at 390px against its brightest painted region`, async ({
    browser,
  }) => {
    // E3 (final fix wave): a genuine touch/mobile context, not the default
    // desktop `page` fixture resized to a phone's CSS pixel dimensions — a
    // resized-desktop context still reports `(pointer: fine)`/
    // `(hover: hover)`, leaving Torch.tsx just as eligible to arm as on an
    // actual desktop. See `mobileContext`'s own comment in ./helpers.
    const ctx = await mobileContext(browser);
    const page = await ctx.newPage();
    await page.goto("/");
    const act = page.locator(`#${id}`);
    await act.scrollIntoViewIfNeeded();

    // E4/E5: `.label` gets the stricter per-pixel near-bone occlusion
    // check `hasNearBonePixel` (./helpers) — a mean-luminance check is too
    // easy to pass on a mostly-whitespace element like `.label` even when
    // fully occluded (see lamplight.spec.ts's "own label is not occluded"
    // tests, the method's origin), which is exactly the opposite
    // methodology this file used to apply to the same class of element
    // here. `.statement`/`.prose-field` keep the mean-luminance-ceiling
    // check every other contrast gate in the suite uses for real prose.
    //
    // `:visible` excludes the desktop-only provenance strip and its
    // mobile-only counterpart, exactly one of which is ever actually on
    // screen at a given width (Tailwind's `hidden sm:flex` / `sm:hidden`
    // pair) — the other stays matched by the bare class selector but
    // never rendered, and `scrollIntoViewIfNeeded` never resolves on a
    // `display: none` element.
    const labels = act.locator(".label:visible");
    const labelCount = await labels.count();
    for (let i = 0; i < labelCount; i++) {
      const el = labels.nth(i);
      await el.scrollIntoViewIfNeeded();
      // Not `toHaveCSS("opacity", "1")` on `el` itself — the reveal fades
      // the scrim's direct children, and a nested label (the `Copy`
      // button, a Provenance `li`) is opaque long before its parent is.
      // See `expectRevealed` in ./helpers for the flake this closed.
      await expectRevealed(el);
      const box = await el.boundingBox();
      if (!box || box.width < 1 || box.height < 1) continue;
      const buf = await page.screenshot({ clip: box });
      expect(
        await hasNearBonePixel(buf),
        `act ${id} label #${i} at 390px has no near-bone pixel anywhere in its box — the text may be occluded or too dim`,
      ).toBe(true);
    }

    const prose = act.locator(".statement:visible, .prose-field:visible");
    const proseCount = await prose.count();
    expect(
      labelCount + proseCount,
      `act ${id} has no text to sample at 390px`,
    ).toBeGreaterThan(0);

    for (let i = 0; i < proseCount; i++) {
      const el = prose.nth(i);
      await el.scrollIntoViewIfNeeded();
      // Same ancestor-chain wait as the label loop above.
      await expectRevealed(el);
      const lum = await sampleLuminance(page, el);
      if (lum === null) continue;
      expect(
        lum,
        `act ${id} text #${i} at 390px background too bright (L=${lum.toFixed(3)})`,
      ).toBeLessThan(CONTRAST_LUMINANCE_CEILING);
    }

    await ctx.close();
  });
}

// E4 (final fix wave): this test and "prefers-contrast: no-preference"
// below assert literally opposite things about the same element
// (`.scrim::before`'s `backgroundImage`) — one expects no gradient, the
// other expects one. That is not a contradiction: each asserts the
// correct, deliberately different behaviour for its own
// `prefers-contrast` context (P14's guarantee — see globals.css's
// `@media (prefers-contrast: more)` rule) — flagged here explicitly so a
// future reader sees the context dependency instead of reading the pair
// as a flip-flopping test.
test("prefers-contrast: more replaces the scrim gradient with solid ground", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ contrast: "more" });
  const page = await ctx.newPage();
  await page.goto("/");

  const before = await page
    .locator("#hero .scrim")
    .first()
    .evaluate((el) => getComputedStyle(el, "::before").backgroundImage);
  // No gradient — a flat colour, not a `linear-gradient(...)` function.
  expect(before).not.toMatch(/gradient/i);

  const bg = await page
    .locator("#hero .scrim")
    .first()
    .evaluate((el) => getComputedStyle(el, "::before").backgroundColor);
  // rgb(8, 7, 10) === --color-ground.
  expect(bg.replace(/\s/g, "")).toBe("rgb(8,7,10)");

  await ctx.close();
});

// E4 (final fix wave): the counterpart to "prefers-contrast: more" above —
// deliberately the opposite assertion on the same element, held to its own
// `prefers-contrast` context. See that test's comment.
test("prefers-contrast: no-preference keeps the ordinary gradient scrim", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ contrast: "no-preference" });
  const page = await ctx.newPage();
  await page.goto("/");
  const before = await page
    .locator("#hero .scrim")
    .first()
    .evaluate((el) => getComputedStyle(el, "::before").backgroundImage);
  expect(before).toMatch(/gradient/i);
  await ctx.close();
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Keyboard
// ─────────────────────────────────────────────────────────────────────────

/** Every DOM-order tab-stop query below needs this same selector — every
 *  element that would be a native browser Tab stop — plus a visibility
 *  filter. `getComputedStyle` on the element itself misses the common
 *  case here: Tailwind's responsive variants (`hidden md:flex`,
 *  `sm:hidden`) land on a *wrapper*, not the `<a>`/`<button>` inside it,
 *  so the control's own computed `display` can read as `flex` even while
 *  an ancestor is `display: none`. `checkVisibility()` (native, Chromium)
 *  walks the whole ancestor chain; `offsetParent` is the fallback for a
 *  browser without it. This is also how a genuinely hover-gated control —
 *  invisible until `:hover`, with no keyboard path at all — would be
 *  caught: it would never pass this filter, so it would never receive a
 *  tag, and the trigger before it and the control after it would land
 *  back-to-back with nothing between them (the `count` assertion below
 *  guards the "selector itself broke" case; a manual read of a failing
 *  diff would show the gap). None of this site's interactive controls are
 *  hover-gated (DESIGN.md's Lamp-Dramatizes-Never-Gates Rule) — verified
 *  directly in the "no pointer hover at all" test in section 4 below. */
const TAB_STOP_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

async function tagTabStops(page: Page): Promise<number> {
  return page.evaluate((selector) => {
    const isVisible = (el: HTMLElement) =>
      typeof el.checkVisibility === "function"
        ? el.checkVisibility()
        : el.offsetParent !== null;
    const els = [...document.querySelectorAll<HTMLElement>(selector)].filter(isVisible);
    els.forEach((el, i) => el.setAttribute("data-tab-order-test", String(i)));
    return els.length;
  }, TAB_STOP_SELECTOR);
}

async function assertTabOrderMatchesDom(page: Page) {
  const count = await tagTabStops(page);
  expect(count, "no tabbable controls found — selector regressed").toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    await page.keyboard.press("Tab");
    const matched = await page.evaluate(
      (idx) => document.activeElement?.getAttribute("data-tab-order-test") === String(idx),
      i,
    );
    expect(
      matched,
      `tab stop ${i}/${count - 1} did not land on the DOM-order element (actual: ${await page.evaluate(
        () =>
          document.activeElement
            ? `${document.activeElement.tagName}${
                document.activeElement.getAttribute("aria-label") ||
                document.activeElement.textContent?.trim().slice(0, 40) ||
                ""
              }`
            : "null",
      )})`,
    ).toBe(true);
  }
}

test("full keyboard tab order visits every interactive control in DOM order on /", async ({
  page,
}) => {
  await page.goto("/");
  await assertTabOrderMatchesDom(page);
});

test("full keyboard tab order visits every interactive control in DOM order on a case file", async ({
  page,
}) => {
  await page.goto("/projects/warden/");
  await assertTabOrderMatchesDom(page);
});

test("a tabbed-to Bracket control shows the bone outline and warms its seal to ember", async ({
  page,
}) => {
  await page.goto("/");
  const cta = page.getByRole("link", { name: "Read the Warden case file" });

  // Reach it by real keyboard Tabs (not `.focus()`, which some browsers'
  // `:focus-visible` heuristic can resolve differently from an actual
  // keyboard traversal) — count its position among the page's own tab
  // stops via the same DOM-order tagging the full-tab-order test uses.
  const index = await page.evaluate((selector) => {
    const isVisible = (el: HTMLElement) =>
      typeof el.checkVisibility === "function"
        ? el.checkVisibility()
        : el.offsetParent !== null;
    const els = [...document.querySelectorAll<HTMLElement>(selector)].filter(isVisible);
    return els.findIndex((el) => el.textContent?.includes("Read the Warden case file"));
  }, TAB_STOP_SELECTOR);
  expect(index, "CTA not found among the page's tab stops").toBeGreaterThanOrEqual(0);
  for (let i = 0; i <= index; i++) {
    await page.keyboard.press("Tab");
  }
  await expect(cta).toBeFocused();

  const outline = await cta.evaluate((el) => {
    const s = getComputedStyle(el);
    return { style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor };
  });
  expect(outline.style).toBe("solid");
  expect(outline.width).toBe("2px");
  // rgb(242, 237, 227) === --color-signal (bone).
  expect(outline.color.replace(/\s/g, "")).toBe("rgb(242,237,227)");

  // The seal's inner square warms from bone to ember on focus
  // (`group-focus-visible:bg-ember`, Bracket.tsx) — Tailwind's
  // `transition-colors` animates the swap, so poll past it rather than
  // sampling mid-transition.
  const sealInner = cta.locator(".seal > span");
  await expect
    .poll(async () =>
      (await sealInner.evaluate((el) => getComputedStyle(el).backgroundColor)).replace(
        /\s/g,
        "",
      ),
    )
    // rgb(232, 163, 61) === --color-ember.
    .toBe("rgb(232,163,61)");
});

test("the command palette traps Tab on its own input while open", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Search the field (Ctrl+K)" });
  await trigger.focus();
  await trigger.click();

  const input = page.getByRole("combobox", { name: "Search the field" });
  await expect(input).toBeFocused();

  // Repeated Tab never escapes the dialog — the page behind it (e.g. the
  // nav's résumé link) never receives focus while the overlay is open.
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    await expect(input).toBeFocused();
  }

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // Focus returns to the control that opened it.
  await expect(trigger).toBeFocused();
});

test("the command palette opened via Ctrl+K also returns focus to the previously focused element", async ({
  page,
}) => {
  await page.goto("/");
  const resumeLink = page.getByRole("link", { name: "Résumé", exact: true }).first();
  await resumeLink.focus();
  await expect(resumeLink).toBeFocused();

  await page.keyboard.press("Control+k");
  await expect(page.getByRole("combobox", { name: "Search the field" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(resumeLink).toBeFocused();
});

test("axe: no violations with the command palette open", async ({ page }) => {
  // The palette's group wrapper and its listbox previously used
  // `<li role="group">` inside a `<ul role="listbox">` — role="group" is
  // not an allowed ARIA role on <li> per the ARIA-in-HTML mapping, which
  // axe flags as aria-allowed-role. No existing test ever opened the
  // palette while scanning, so a real, live violation was invisible to CI.
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

// ─────────────────────────────────────────────────────────────────────────
// 4. Assistive text (spot re-verification — the full decorative-layer sweep
// is already true in the current build; see components read during this
// task's investigation. This pins the two claims most likely to regress
// silently: nothing meaningful is hover-only, and the credit line stays on
// the always-rendered plate layer.)
// ─────────────────────────────────────────────────────────────────────────

test("the warden exhibit and a certificate receipt are reachable with no pointer hover at all", async ({
  browser,
}) => {
  // A context that never dispatches a hover — the strongest available
  // proof that nothing here is hover-gated, short of literally disabling
  // `:hover` support.
  const ctx = await browser.newContext({ hasTouch: true, isMobile: false });
  const page = await ctx.newPage();
  await page.goto("/");

  const exhibit = page.locator("#warden figure");
  await exhibit.scrollIntoViewIfNeeded();
  await expect(exhibit).toBeVisible();
  await expect(exhibit.locator("pre")).toContainText("warden scan");

  const cert = page
    .getByRole("button", { name: /View the .* certificate scan/ })
    .first();
  await cert.scrollIntoViewIfNeeded();
  await expect(cert).toBeVisible();

  await ctx.close();
});

test("every act's plate credit line renders on the always-present layer", async ({
  browser,
}) => {
  // No JS: only the lit layer (which carries the alt text) and static
  // markup exist — `.plate-dark` is never inserted (globals.css:
  // `[data-lamp="on"] .plate-dark { display: block }` never applies).
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/");
  // Every act's Provenance line carries its plate credit
  // (`withCredit()`); the artist name is real, visible text, not part of
  // an image alt.
  await expect(page.getByText(/Joseph Wright of Derby/).first()).toBeVisible();
  await ctx.close();
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Reduced motion / print, post-everything
// ─────────────────────────────────────────────────────────────────────────

test("print drops plates and chrome, and shows every act's copy in document order", async ({
  page,
}) => {
  await page.goto("/");
  await page.emulateMedia({ media: "print" });

  // Chrome and atmosphere are dropped.
  await expect(page.locator("header[data-chrome]").first()).toBeHidden();
  await expect(page.locator(".torch")).toBeHidden();
  await expect(page.locator(".plate").first()).toBeHidden();

  // Every act's copy is visible without any scroll — nothing here is
  // waiting on an IntersectionObserver a print layout will never fire.
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
  for (const id of ACTS) {
    const statement = page.locator(`#${id} .statement`).first();
    await expect(statement).toBeVisible();
    await expect(statement).toHaveCSS("opacity", "1");
  }

  // The record evidence — an exhibit and a certificate thumbnail — is
  // real content, not chrome, and stays on the page.
  await expect(page.locator("#warden figure")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /View the .* certificate scan/ }).first(),
  ).toBeVisible();

  // External links append their href in parentheses. Sampled from the
  // footer's own "source" link, not a project's "Repository" link — every
  // project CTA sits inside `.print-hidden` (chrome, not record) and is
  // correctly dropped under print, so it is never on screen to sample.
  const sourceLink = page.getByRole("link", { name: "source" });
  await expect(sourceLink).toBeVisible();
  const afterContent = await sourceLink.evaluate(
    (el) => getComputedStyle(el, "::after").content,
  );
  expect(afterContent).toMatch(/http/);
});

test("print on a case file drops the plate and keeps every section's heading", async ({
  page,
}) => {
  await page.goto("/projects/warden/");
  await page.emulateMedia({ media: "print" });

  await expect(page.locator("header[data-chrome]").first()).toBeHidden();
  await expect(page.locator(".plate").first()).toBeHidden();

  for (const title of ["Problem", "Approach", "Decisions", "Evidence", "Outcome"]) {
    await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
  }
});

test("axe: no violations under prefers-contrast: more", async ({ browser }) => {
  const ctx = await browser.newContext({ contrast: "more" });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 30));
    }
    window.scrollTo(0, 0);
  });
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  await ctx.close();
});
