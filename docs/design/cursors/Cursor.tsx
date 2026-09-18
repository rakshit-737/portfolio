"use client";

import { useEffect } from "react";
import { playUi } from "@/lib/sound";

/**
 * The night archive's cursor — the key, the lock, and the mark that opens
 * text. Mounts once, like Soundscape.tsx; renders nothing. The two scripts
 * live in public/cursors/ and are loaded only on a fine pointer, so a phone
 * never pays for them. The static CSS cursors in globals.css remain the
 * baseline for every other visitor (coarse pointer, reduced motion,
 * forced colours, or JS off).
 *
 * `variant`: "playful" (slides into the padlock, smoke, glint, sound) or
 * "quiet" (on the pointer, caret blink, gem breath — no trail).
 */
export default function Cursor({ variant = "playful" }: { variant?: "playful" | "quiet" }) {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine) and (hover: hover)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let unmount: () => void = () => {};
    let cancelled = false;
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const load = (src: string) =>
      new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = `${base}/cursors/${src}`;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(src));
        document.head.appendChild(s);
      });
    const file = variant === "playful" ? "lamplight-cursor-playful.js" : "lamplight-cursor-overlay.js";
    load("lamplight-cursor-art.js")
      .then(() => load(file))
      .then(() => {
        if (cancelled) return;
        const w = window as unknown as {
          LamplightCursorPlayful?: { mount: (root: HTMLElement, o: object) => () => void };
          LamplightCursor?: { mount: (root: HTMLElement, o: object) => () => void };
        };
        unmount =
          variant === "playful"
            ? w.LamplightCursorPlayful!.mount(document.documentElement, { size: 56, playUi })
            : w.LamplightCursor!.mount(document.documentElement, { size: 40 });
      })
      .catch(() => {
        // The static CSS cursors still stand.
      });
    return () => {
      cancelled = true;
      unmount();
    };
  }, [variant]);
  return null;
}
