import { expect, test } from "@playwright/test";
import { readSoundPref, SOUND_PREF_KEY } from "../src/lib/sound";

/**
 * Unit tests for the night archive's preference reader — pure and
 * synchronous, in the same Node-side style as tests/motion.spec.ts: the
 * storage read is injected, so these run with no browser and no real
 * localStorage. The e2e half of the soundscape (autoplay gating, the
 * status attribute, persistence through a real reload) lives in
 * tests/sound.spec.ts; this file pins the one decision that must hold
 * even when storage itself is broken: the soundscape defaults ON, and
 * only the explicit persisted value "off" turns it off.
 */
test.describe("readSoundPref (pure)", () => {
  test("absent preference defaults ON", () => {
    expect(readSoundPref(() => null)).toBe(true);
  });

  test('"off" is the one persisted value that disables', () => {
    expect(readSoundPref(() => "off")).toBe(false);
  });

  test('"on" enables', () => {
    expect(readSoundPref(() => "on")).toBe(true);
  });

  test("garbage falls back to default ON", () => {
    expect(readSoundPref(() => "loud")).toBe(true);
  });

  test("a throwing storage read (blocked localStorage) defaults ON", () => {
    expect(
      readSoundPref(() => {
        throw new Error("denied");
      }),
    ).toBe(true);
  });

  test("key is namespaced like the palette's recents key", () => {
    expect(SOUND_PREF_KEY).toBe("night-archive:sound");
  });
});
