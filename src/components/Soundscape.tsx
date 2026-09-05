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
    initSoundscape();
    write(getSoundStatus());
    return unsubscribe;
  }, []);
  return null;
}
