"use client";

import { useEffect } from "react";
import { getSoundStatus, initSoundscape, subscribeSound } from "@/lib/sound";

/**
 * The soundscape's boot shim: mounts the engine (src/lib/sound.ts) and
 * mirrors its status onto `<html data-soundscape>` — the one observable
 * surface tests and CSS read. Renders nothing; the audible work, the
 * autoplay gate, and the visibility pause all live in the engine.
 * The default, JS-free state is a silent page — same shape as the
 * lamp's fully-lit default: no script, no layer.
 */
export default function Soundscape() {
  useEffect(() => {
    const write = (s: string) => {
      document.documentElement.dataset.soundscape = s;
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
  return null;
}
