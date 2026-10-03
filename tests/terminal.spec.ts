import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { desktopAt, mobileContext } from "./helpers";
import {
  about,
  contact,
  featuredProjects,
  links,
  terminal,
  terminalEntry,
} from "../src/content";
import { COMMAND_NAMES } from "../src/lib/terminal";

/**
 * The terminal overlay end to end (docs/superpowers/specs/
 * 2026-10-03-the-terminal-design.md): the rail button, the keys, every
 * command that prints or moves, focus, the scrim, the secrets it must not
 * trip, axe, and the phone path through the palette. The interpreter's own
 * rules (prefix matching, withBase, the exact lines) are pinned in Node by
 * tests/terminal-unit.spec.ts; this file asserts only what a visitor can
 * see and do. Every expected string is imported from content.ts or the
 * interpreter, never retyped, so a copy edit cannot turn this red.
 *
 * Paths follow the other specs' convention (`BASE`), and a navigation is
 * asserted by pathname suffix, so the file reads the same under a sub-path
 * build.
 */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** The rail button's accessible name — the sibling of "Search the field
 *  (Ctrl+K)", ending in the chord that does the same job. */
const OPEN_BUTTON = `${terminalEntry.open} (Ctrl+\`)`;

const door = (page: Page) =>
  page.getByRole("button", { name: OPEN_BUTTON, exact: true });
const dialog = (page: Page) =>
  page.getByRole("dialog", { name: terminalEntry.label });
const prompt = (page: Page) =>
  page.getByRole("textbox", { name: terminal.input });
const output = (page: Page) =>
  page.getByRole("log", { name: terminal.output });
const palette = (page: Page) =>
  page.getByRole("combobox", { name: "Search the field" });

/**
 * Load the index and wait for the app to have hydrated: the terminal's keys
 * attach in an effect, and a keypress that beats it is simply lost. The
 * sound shim writes `pending` from its own effect in the same commit (the
 * other specs gate on it for the same reason).
 */
async function ready(page: Page) {
  await page.goto(`${BASE}/`);
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "pending");
}

/** Hydrate, press the bare backtick, and wait for the prompt to take focus. */
async function openTerminal(page: Page) {
  await ready(page);
  await page.keyboard.press("Backquote");
  await expect(dialog(page)).toBeVisible();
  await expect(prompt(page)).toBeFocused();
}

/** Run one line the way a visitor does: type it, press Enter. */
async function runLine(page: Page, line: string) {
  await prompt(page).fill(line);
  await prompt(page).press("Enter");
}

// ─────────────────────────────────────────────────────────────────────────
// The door and the keys
// ─────────────────────────────────────────────────────────────────────────

test("the rail carries the terminal button, named for its keys, right after ctrl K", async ({
  page,
}) => {
  await ready(page);
  await expect(door(page)).toBeVisible();
  // The brief was "right near the ctrl K button": the very next control in
  // the cluster, not merely somewhere later in the rail.
  const next = await page
    .getByRole("button", { name: "Search the field (Ctrl+K)" })
    .evaluate((el) => el.nextElementSibling?.getAttribute("aria-label") ?? null);
  expect(next).toBe(OPEN_BUTTON);
});

test("below lg the rail has no terminal button — the palette and the keys reach it", async ({
  page,
}) => {
  // The md rail has no room for it (Nav.tsx), so it is simply not there.
  await desktopAt(page, { width: 768, height: 720 });
  await ready(page);
  await expect(door(page)).toBeHidden();
});

test("a click on the button opens the terminal with the prompt focused", async ({ page }) => {
  await ready(page);
  await door(page).click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page)).toHaveAttribute("data-terminal", /.*/);
  await expect(prompt(page)).toBeFocused();
  await expect(dialog(page)).toContainText(terminal.welcome);
});

test("a bare backtick opens it from the page, but never while typing in the palette", async ({
  page,
}) => {
  await ready(page);
  await page.keyboard.press("Backquote");
  await expect(prompt(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);

  // In an input the key is text. It lands in the field, and the characters
  // typed after it are the proof: had the terminal opened and taken focus,
  // the "b" would not be in the palette's value.
  await page.keyboard.press("Control+k");
  await expect(palette(page)).toBeFocused();
  await page.keyboard.type("a");
  await page.keyboard.press("Backquote"); // a real Backquote keydown, not inserted text
  await page.keyboard.type("b");
  await expect(palette(page)).toHaveValue("a`b");
  await expect(dialog(page)).toHaveCount(0);
});

test("Ctrl+backtick toggles it from anywhere, the prompt included", async ({ page }) => {
  await ready(page);
  await page.keyboard.press("Control+Backquote");
  await expect(prompt(page)).toBeFocused();
  // Focus is inside the prompt now — the one place a bare key would be text.
  await page.keyboard.press("Control+Backquote");
  await expect(dialog(page)).toHaveCount(0);
  await page.keyboard.press("Control+Backquote");
  await expect(dialog(page)).toBeVisible();
  await expect(prompt(page)).toBeFocused();
});

// ─────────────────────────────────────────────────────────────────────────
// What the commands print and do
// ─────────────────────────────────────────────────────────────────────────

test("help lists every command with its description", async ({ page }) => {
  await openTerminal(page);
  await runLine(page, "help");
  const log = output(page);
  await expect(log).toContainText(terminal.helpHeading);
  // The argument-taking commands show their usage, the rest their name; the
  // description is what proves a row was printed and not just echoed.
  const usage: Record<string, string> = terminal.usage;
  const description: Record<string, string> = terminal.commands;
  for (const name of COMMAND_NAMES) {
    await expect(log).toContainText(usage[name] ?? name);
    await expect(log).toContainText(description[name]);
  }
});

test("about prints the about section", async ({ page }) => {
  await openTerminal(page);
  await runLine(page, "about");
  for (const paragraph of about.paragraphs) {
    await expect(output(page)).toContainText(paragraph);
  }
});

test("projects lists each featured id with its one-liner", async ({ page }) => {
  await openTerminal(page);
  await runLine(page, "projects");
  const log = output(page);
  await expect(log).toContainText(terminal.projectsFeatured);
  for (const p of featuredProjects) {
    await expect(log).toContainText(p.id);
    await expect(log).toContainText(p.oneLiner);
  }
  await expect(log).toContainText(terminal.projectsMore);
});

test("contact prints the headline and real links to the email, GitHub and LinkedIn", async ({
  page,
}) => {
  await openTerminal(page);
  await runLine(page, "contact");
  const log = output(page);
  await expect(log).toContainText(contact.headline);
  await expect(log.getByRole("link", { name: links.email })).toHaveAttribute(
    "href",
    `mailto:${links.email}`,
  );
  for (const { label, url } of [links.github, links.linkedin]) {
    const link = log.getByRole("link", { name: label });
    await expect(link).toHaveAttribute("href", url);
    // External links open a new tab, the way every other one on the site does.
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
  }
});

test("open warden takes the tab to the Warden case file", async ({ page }) => {
  await openTerminal(page);
  await runLine(page, "open warden");
  await expect(page).toHaveURL(/\/projects\/warden\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("goto contact closes the terminal and brings the contact act into view", async ({
  page,
}) => {
  await openTerminal(page);
  await runLine(page, "goto contact");
  await expect(dialog(page)).toHaveCount(0);
  await expect(page).toHaveURL(/#contact$/);
  // The scroll is the smooth one, so the viewport check polls past it.
  await expect(page.locator("#contact")).toBeInViewport();
});

test("palette hands off to the search palette, and Esc there returns focus to where it began", async ({
  page,
}) => {
  await ready(page);
  const resume = page.getByRole("link", { name: "Résumé", exact: true }).first();
  await resume.focus();
  await page.keyboard.press("Backquote");
  await expect(prompt(page)).toBeFocused();

  await runLine(page, "palette");
  await expect(dialog(page)).toHaveCount(0);
  await expect(palette(page)).toBeFocused();

  // One overlay at a time: the palette's restore target is the link that was
  // focused before either overlay, not the terminal that just closed.
  await page.keyboard.press("Escape");
  await expect(palette(page)).toHaveCount(0);
  await expect(resume).toBeFocused();
});

test("an unknown word is named in the hint", async ({ page }) => {
  await openTerminal(page);
  await runLine(page, "frobnicate");
  await expect(output(page)).toContainText(
    terminal.unknown.replace("{name}", "frobnicate"),
  );
});

test("clear empties the log and exit closes the terminal", async ({ page }) => {
  await openTerminal(page);
  const log = output(page);
  await runLine(page, "about");
  await expect(log).toContainText(about.paragraphs[0]);

  await runLine(page, "clear");
  await expect(log).not.toContainText(about.paragraphs[0]);
  // Still there, still taking input — clear is not exit.
  await expect(log).toBeAttached();
  await expect(prompt(page)).toBeFocused();

  await runLine(page, "exit");
  await expect(dialog(page)).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────────
// The prompt, focus and the overlay's edges
// ─────────────────────────────────────────────────────────────────────────

test("↑ steps back through this session's lines and Tab completes a command word", async ({
  page,
}) => {
  await openTerminal(page);
  const input = prompt(page);
  await runLine(page, "about");
  await runLine(page, "help");
  await expect(input).toHaveValue("");

  await input.press("ArrowUp");
  await expect(input).toHaveValue("help");
  await input.press("ArrowUp");
  await expect(input).toHaveValue("about");

  await input.fill("he");
  await input.press("Tab");
  await expect(input).toHaveValue("help");
  // Tab completes here; it must not also carry focus out of the prompt.
  await expect(input).toBeFocused();
});

test("Esc and a press on the scrim both close it and give focus back", async ({ page }) => {
  await ready(page);
  const trigger = door(page);

  await trigger.click();
  await expect(prompt(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(prompt(page)).toBeFocused();
  const box = (await dialog(page).boundingBox())!;
  // Left of the panel and level with its middle: the scrim and nothing else.
  await page.mouse.click(box.x / 2, box.y + box.height / 2);
  await expect(dialog(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("a drag that starts in the panel and ends on the scrim does not close it", async ({
  page,
}) => {
  await openTerminal(page);
  // A click's target is the common ancestor of mousedown and mouseup, so
  // drag-selecting output and letting go outside the panel lands the click
  // on the scrim — which must only count when the press began there.
  const box = (await dialog(page).boundingBox())!;
  const y = box.y + 20;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x / 2, y, { steps: 4 });
  await page.mouse.up();
  await expect(dialog(page)).toBeVisible();
  await expect(prompt(page)).toBeVisible();

  // The same release after a press that began on the scrim does close it.
  await page.mouse.click(box.x / 2, y);
  await expect(dialog(page)).toHaveCount(0);
});

test("Tab and Shift+Tab never leave the dialog, and both wrap at the ends", async ({
  page,
}) => {
  await openTerminal(page);
  await runLine(page, "contact");
  const stops = output(page).getByRole("link");
  await expect(stops).toHaveCount(3);

  // Forward from the prompt with nothing to complete: an ordinary Tab, so it
  // wraps to the first output link instead of sticking on the prompt.
  await page.keyboard.press("Tab");
  await expect(stops.nth(0)).toBeFocused();

  // Forward through the output links, then on to the prompt.
  for (const i of [1, 2]) {
    await page.keyboard.press("Tab");
    await expect(stops.nth(i)).toBeFocused();
  }
  await page.keyboard.press("Tab");
  await expect(prompt(page)).toBeFocused();

  // Backward from the prompt through the links, last to first.
  for (const i of [2, 1, 0]) {
    await page.keyboard.press("Shift+Tab");
    await expect(stops.nth(i)).toBeFocused();
  }
  // Past the first stop: wrap to the last one, the prompt — not the page.
  await page.keyboard.press("Shift+Tab");
  await expect(prompt(page)).toBeFocused();
});

test("typing light and holding L in the prompt never snuffs the lamp", async ({ page }) => {
  await openTerminal(page);
  const html = page.locator("html");
  // The hold-L secret (Experience.tsx) arms on keydown and fires at 350ms;
  // it ignores a key pressed in an input, and this is the proof it still does
  // with the terminal's prompt. Checked mid-hold: a keyup would relight it.
  await page.keyboard.type("light");
  await expect(prompt(page)).toHaveValue("light");
  await page.keyboard.down("l");
  await page.waitForTimeout(450);
  await expect(html).not.toHaveAttribute("data-snuffed", /.*/);
  await page.keyboard.up("l");
  await expect(prompt(page)).toHaveValue("lightl");
  await expect(html).not.toHaveAttribute("data-snuffed", /.*/);
});

// ─────────────────────────────────────────────────────────────────────────
// Accessibility, and the phone
// ─────────────────────────────────────────────────────────────────────────

test("axe: no violations with the terminal open and help, projects and contact on screen", async ({
  page,
}) => {
  // Output on screen is the point: the links must clear the 24px target
  // floor and the live region and rows must be valid markup, none of which
  // an empty terminal exercises.
  await openTerminal(page);
  for (const line of ["help", "projects", "contact"]) await runLine(page, line);
  await expect(output(page)).toContainText(contact.headline);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("on a phone the palette reaches the terminal and the panel never scrolls sideways", async ({
  browser,
}) => {
  const ctx = await mobileContext(browser);
  const page = await ctx.newPage();
  await ready(page);

  // No rail button below lg: the way in is the palette's own action.
  await page.getByRole("button", { name: "Search the field", exact: true }).tap();
  await expect(palette(page)).toBeFocused();
  await palette(page).fill("terminal");
  await expect(page.getByRole("option", { name: terminalEntry.open })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("Enter");
  await expect(dialog(page)).toBeVisible();
  await expect(prompt(page)).toBeFocused();

  // Long rows and links on a 390px screen are what could push it wider.
  for (const line of ["help", "projects", "contact"]) await runLine(page, line);
  await expect(output(page)).toContainText(contact.headline);

  const fit = await dialog(page).evaluate((panel) => {
    const root = document.documentElement;
    const box = panel.getBoundingClientRect();
    const scrollers = [panel, ...panel.querySelectorAll<HTMLElement>("*")].filter((n) =>
      /auto|scroll/.test(getComputedStyle(n).overflowY),
    );
    return {
      pageOverflow: root.scrollWidth - root.clientWidth,
      left: box.left,
      right: box.right,
      viewport: root.clientWidth,
      panelOverflow: Math.max(0, ...scrollers.map((n) => n.scrollWidth - n.clientWidth)),
    };
  });
  expect(fit.pageOverflow, "the page scrolls sideways").toBeLessThanOrEqual(0);
  expect(fit.left, "the panel starts off-screen").toBeGreaterThanOrEqual(0);
  expect(fit.right, "the panel ends off-screen").toBeLessThanOrEqual(fit.viewport);
  expect(fit.panelOverflow, "the panel's own scroll region scrolls sideways").toBeLessThanOrEqual(0);

  await ctx.close();
});
