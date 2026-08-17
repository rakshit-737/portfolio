import { expect, test } from "@playwright/test";
import { PLATE_WIDTHS, creditOf, plates } from "../src/lib/art";
import lock from "../src/lib/art.lock.json";

test("every plate is public domain and credited", () => {
  const entries = Object.values(plates);
  expect(entries).toHaveLength(8);
  for (const p of entries) {
    expect(p.license).toBe("PD-old-100");
    expect(p.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
    expect(creditOf(p)).toContain(p.artist);
    expect(creditOf(p)).toContain(p.year);
    expect(creditOf(p)).toContain("public domain");
  }
});

test("every plate has meaningful alt text", () => {
  for (const p of Object.values(plates)) {
    expect(p.alt.length).toBeGreaterThan(40);
    expect(p.alt).not.toMatch(/^image of|^picture of|^photo of/i);
  }
});

// Checks both crops a plate can carry — the default landscape `crop` and,
// where present, the portrait `cropNarrow` (Task 14b) served to narrow
// viewports ahead of it. The original version of this test only ever
// looked at `p.crop`: every `cropNarrow` box in `src/lib/art.ts` (currently
// just `alchemist`'s) went completely unchecked, and neither box's `x`/`y`
// origin was checked against 0 — a negative origin is exactly as invalid
// as one that pushes `x + w` past the native frame's far edge, since both
// describe a crop that reaches outside the source image.
function expectInsideFrame(box: { x: number; y: number; w: number; h: number }) {
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.w).toBeLessThanOrEqual(1.0001);
  expect(box.y + box.h).toBeLessThanOrEqual(1.0001);
  expect(box.w).toBeGreaterThan(0);
  expect(box.h).toBeGreaterThan(0);
}

test("crop boxes stay inside the native frame", () => {
  for (const p of Object.values(plates)) {
    expectInsideFrame(p.crop);
    if (p.cropNarrow) expectInsideFrame(p.cropNarrow);
  }
});

test("every plate can serve at least the smallest tier without upscaling", () => {
  for (const p of Object.values(plates)) {
    const cropWidthPx = Math.round(p.native.w * p.crop.w);
    // A plate whose crop is narrower than the smallest tier could only be
    // delivered by upscaling it — which the fetch script refuses to do.
    expect(cropWidthPx, `${p.id} crop is ${cropWidthPx}px`).toBeGreaterThanOrEqual(
      PLATE_WIDTHS[0],
    );
  }
});

test("lamp rest positions are inside the frame", () => {
  for (const p of Object.values(plates)) {
    expect(p.lamp.x).toBeGreaterThanOrEqual(0);
    expect(p.lamp.x).toBeLessThanOrEqual(1);
    expect(p.lamp.y).toBeGreaterThanOrEqual(0);
    expect(p.lamp.y).toBeLessThanOrEqual(1);
  }
});

test("the locked variants are exactly the tiers that do not upscale", () => {
  for (const p of Object.values(plates)) {
    const cropWidthPx = Math.round(p.native.w * p.crop.w);
    const expected = PLATE_WIDTHS.filter((w) => w <= cropWidthPx);
    const emitted = PLATE_WIDTHS.filter((w) => `${p.id}-${w}.avif` in lock);
    expect(emitted, `${p.id} avif tiers`).toEqual(expected);
    const emittedWebp = PLATE_WIDTHS.filter((w) => `${p.id}-${w}.webp` in lock);
    expect(emittedWebp, `${p.id} webp tiers`).toEqual(expected);
  }
});

test("no locked variant is wider than its source crop", () => {
  for (const p of Object.values(plates)) {
    const cropWidthPx = Math.round(p.native.w * p.crop.w);
    for (const [name, entry] of Object.entries(lock)) {
      if (!name.startsWith(`${p.id}-`) || name.endsWith("-lqip.txt")) continue;
      expect(entry.width, `${name}`).toBeLessThanOrEqual(cropWidthPx);
    }
  }
});
