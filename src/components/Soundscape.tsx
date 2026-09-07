"use client";

import { useEffect, useState } from "react";
import { getSoundStatus, initSoundscape, subscribeSound } from "@/lib/sound";
import { soundscape } from "@/content";

/**
 * The soundscape's boot shim: mounts the engine (src/lib/sound.ts) and
 * mirrors its status onto `<html data-soundscape>` — the one observable
 * surface tests and CSS read. The audible work, the autoplay gate, and
 * the visibility pause all live in the engine. The default, JS-free
 * state is a silent page — same shape as the lamp's fully-lit default:
 * no script, no layer.
 *
 * Its one piece of markup is a visually-hidden polite live region,
 * filled the first time the engine reaches "on": the hearth starts
 * unprompted on the first engagement, which nothing else announces, so
 * a screen-reader user is told the sound began on purpose and where
 * its control lives (WCAG 1.4.2 ruling, 2026-09-07 — the toggle is the
 * pause control; this line is how a non-visual user finds it). Filled
 * once and never cleared or repeated: a tab-hide pause/resume or a
 * later toggle re-plays the sound, not the announcement.
 */
export default function Soundscape() {
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const write = (s: string) => {
      document.documentElement.dataset.soundscape = s;
      if (s === "on") setStarted(true);
    };
    const unsubscribe = subscribeSound(write);
    // Boot is deliberately cheap — a preference read and three gesture
    // listeners; the expensive part, the AudioContext, waits for the
    // first real interaction (sound.ts's "pending" status: the
    // constructor alone measured 72ms of real main thread, the whole of
    // a CI mobile perf-gate failure). Cheap means it can run right here
    // in the hydration effect, so the listeners are armed before the
    // visitor's first click rather than racing it from an idle
    // callback (which lost that race — an early click found no
    // listener and the hearth waited for a second touch).
    initSoundscape();
    write(getSoundStatus());
    return unsubscribe;
  }, []);
  return (
    <div aria-live="polite" className="sr-only">
      {started ? soundscape.started : null}
    </div>
  );
}
