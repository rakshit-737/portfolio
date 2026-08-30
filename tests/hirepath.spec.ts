import { expect, test, type Page } from "@playwright/test";
import { hero } from "../src/content";

declare global {
  interface Window {
    __hirepathRecordInteraction?: () => void;
  }
}

/**
 * Review fix (P15 round 1): every "≤N interactions" budget below is derived
 * from real, trusted DOM events the browser actually dispatched — a
 * document-level capturing `click`/`keydown` listener, wired through
 * `page.exposeFunction` so the count lives in Node and survives the full
 * page navigations these journeys perform — not from a hand-placed
 * `interactions += 1` sitting next to each `.click()`/`.keyboard.press()`
 * call. A hand-placed counter can only ever equal the literal number of
 * such calls the test's author wrote, so `toBeLessThanOrEqual(2)` was true
 * by construction and could never register a real regression that inserted
 * an extra required step. This counter instead reflects what the page
 * actually dispatched, so a future redesign that adds a genuine extra click
 * or keypress makes the number itself go up, independent of what the test
 * source happens to say.
 *
 * `Locator.fill()` deliberately dispatches no `keydown` events (it sets the
 * value and fires `input`/`change`, not a key-by-key type), so filling the
 * palette's query box is not itself counted — matching the brief's own
 * framing of "type X" as incidental to the click/shortcut interactions
 * around it, not a budgeted step in its own right. A modifier chord (e.g.
 * Ctrl+K) dispatches a `keydown` for the modifier key itself before the one
 * for the letter — the listener skips bare modifier keydowns so a single
 * shortcut press counts once, matching how a person actually experiences it.
 */
async function trackRealInteractions(page: Page): Promise<() => number> {
  let count = 0;
  await page.exposeFunction("__hirepathRecordInteraction", () => {
    count += 1;
  });
  await page.addInitScript(() => {
    const record = () => window.__hirepathRecordInteraction?.();
    document.addEventListener("click", record, true);
    // A chord like Ctrl+K dispatches a `keydown` for the modifier itself
    // ("Control") before the one for the letter key — one physical
    // key-combo press, two events. Counting the modifier's own keydown
    // would over-count a single-interaction shortcut, so only the
    // non-modifier keydown (the "k", carrying `ctrlKey: true`) is recorded.
    const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta"]);
    document.addEventListener(
      "keydown",
      (e) => {
        if (!MODIFIER_KEYS.has((e as KeyboardEvent).key)) record();
      },
      true,
    );
  });
  return () => count;
}

/**
 * P13: the thirty-second recruiter path, gated. A stranger with no context
 * should be able to land on `/`, see who this is and what they do, reach
 * the Warden case file in a couple of clicks, and find both a résumé and a
 * way to email — without knowing anything about the site beforehand.
 *
 * The audit that inspired this wanted a wall-clock time budget. CI runners
 * are noisy (cold caches, shared cores), so wall-clock time there measures
 * the runner as much as the page. What's actually load-bearing — and what
 * a redesign could silently break without any test noticing — is the
 * *interaction count*: how many clicks stand between landing and the
 * case file. That's asserted directly below. DOM-ready timing is still
 * recorded, but as a non-blocking console report, not a pass/fail gate.
 */
test("the recruiter can land, orient, and reach the Warden case file in one click", async ({
  page,
  request,
}) => {
  const realInteractions = await trackRealInteractions(page);

  // (a) Land on the index.
  const navStart = Date.now();
  await page.goto("/");

  // (b) The hero states who this is and what they do, before any
  // interaction. Both the `<h1>` and the plain-English positioning line
  // that a stranger can parse before reaching a single number.
  await expect(
    page.getByRole("heading", { level: 1, name: hero.name }),
  ).toBeVisible();
  await expect(page.getByText(hero.positioning)).toBeVisible();

  // Non-blocking timing report — informational, not a gate (see file
  // comment: CI wall-clock is noisy, so nothing here asserts a threshold).
  const domReadyMs = await page.evaluate(() => {
    const nav = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming | undefined;
    return nav ? Math.round(nav.domContentLoadedEventEnd) : null;
  });
  console.log(
    `[hirepath] DOM-ready at ${domReadyMs}ms (navigation start) / wall-clock since test start: ${Date.now() - navStart}ms`,
  );

  // (d) The résumé link resolves — checked from the index, where the
  // full nav renders it (the case-file pages carry a simpler header with
  // no résumé link, so this step's href must come from here).
  const resumeHref = await page
    .getByRole("link", { name: /résumé/i })
    .first()
    .getAttribute("href");
  expect(resumeHref).toBeTruthy();
  const resumeRes = await request.get(resumeHref!);
  expect(resumeRes.status()).toBe(200);
  expect(resumeRes.headers()["content-type"]).toBe("application/pdf");

  // (e) The contact email is findable — a real `mailto:` link exists in
  // the DOM (the record's Contact act), not merely printed as text.
  const mailtoLinks = page.locator('a[href^="mailto:"]');
  await expect(mailtoLinks).toHaveCount(1);
  const mailtoHref = await mailtoLinks.first().getAttribute("href");
  expect(mailtoHref).toMatch(/^mailto:.+@.+/);

  // (c) Reach the Warden case file — the hero's own CTA row puts it one
  // click away, above the fold, with no scroll or search required.
  await page.getByRole("link", { name: "Read the Warden case file" }).click();

  await expect(page).toHaveURL(/\/projects\/warden\/$/);
  await expect(page.getByRole("heading", { level: 1, name: /Warden/ })).toBeVisible();

  expect(
    realInteractions(),
    "clicks from landing to the Warden case file",
  ).toBeLessThanOrEqual(2);
});

/**
 * P15 §1: journey nets for the hire-path, desktop viewport. The touch/mobile
 * shape of "index → Warden case file → back via breadcrumb" already exists
 * (tests/mobile.spec.ts, "case-file navigation journey on a touch
 * viewport") — this is its desktop counterpart, closing the loop the test
 * above only walks one direction. The Ctrl+K → "scheduler" → #scheduler
 * journey has no existing coverage at either viewport: smoke.spec.ts's
 * palette test exercises the same mechanism with different query terms
 * ("research", "Hero"), and mobile.spec.ts's touch search test also uses
 * "research" — neither lands on the scheduler target the brief names, so
 * it's added fresh here (desktop; the touch equivalent of the *mechanism*
 * is already proven in mobile.spec.ts, just not for this exact term). The
 * résumé-resolves journey needs no new test — the single test above already
 * covers it as step (d).
 */
test("hero to Warden case file and back via breadcrumb to /#warden — desktop, ≤2 interactions each way", async ({
  page,
}) => {
  const realInteractions = await trackRealInteractions(page);
  await page.goto("/");

  await page.getByRole("link", { name: "Read the Warden case file" }).click();
  await expect(page).toHaveURL(/\/projects\/warden\/$/);
  expect(
    realInteractions(),
    "clicks from landing to the Warden case file",
  ).toBeLessThanOrEqual(2);

  const breadcrumb = page.getByRole("link", { name: /the record/ });
  await expect(breadcrumb).toBeVisible();
  const interactionsBeforeReturn = realInteractions();
  await breadcrumb.click();
  await expect(page).toHaveURL(/\/#warden$/);
  expect(
    realInteractions() - interactionsBeforeReturn,
    "clicks from the case file back to /#warden",
  ).toBeLessThanOrEqual(2);

  await expect(
    page.getByRole("heading", { level: 1, name: "Rakshit Rameshbabu" }),
  ).toBeVisible();
});

test("Ctrl+K, type 'scheduler', lands on the scheduler act — desktop, 2 interactions", async ({
  page,
}) => {
  const realInteractions = await trackRealInteractions(page);
  await page.goto("/");

  await page.keyboard.press("Control+k");
  const input = page.getByRole("combobox", { name: "Search the field" });
  await expect(input).toBeFocused();

  await input.fill("scheduler");
  const option = page.getByRole("option", { name: /Scheduler/ }).first();
  await expect(option).toBeVisible();
  await option.click();

  await expect(page).toHaveURL(/#scheduler$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("#scheduler")).toBeInViewport();

  expect(
    realInteractions(),
    "Ctrl+K then a click on the scheduler result",
  ).toBeLessThanOrEqual(2);
});
