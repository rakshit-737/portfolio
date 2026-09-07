"use client";

import { useEffect, useRef } from "react";

/**
 * A live reading turns like an instrument (CollectUI brief, item 4 —
 * ref @thecuvii's split-flap board, @ahmetloca's ticking numeral; the
 * flap's 3D fold dropped, only the turn translated): every glyph sits
 * in its own inline-block span, and when the text changes only the
 * glyphs that changed move — one WAAPI animation per changed span, the
 * wheel turning up 0.6em and out while the incoming glyph rises from
 * below, 180ms in two halves on the site's easing, transform and
 * opacity only. The spans are real text, never an `aria-hidden` twin
 * (Ignite.tsx's history binds here too): the accessible name, copy and
 * find-in-page all read exactly the concatenated reading, and the
 * digits are tabular wherever this renders (`tnum` is global), so a
 * turn never reflows the rail.
 *
 * One text node per state means the exiting half necessarily carries
 * the incoming glyph — at label size, racing to opacity 0 in 90ms, the
 * eye reads a turn, and the alternative (a second copy of the old
 * glyph) is the exact device the Ignite history forbids.
 *
 * WAAPI sits outside globals.css's reduced-motion block, so the
 * preference is checked here, per change, and honoured with a plain
 * swap. The animation's default fill releases on finish — between
 * ticks the subtree reports zero animations (tests/brand.spec.ts
 * holds it to that), and a change landing mid-flight cancels the turn
 * it replaces. First render never animates: a response, not an
 * entrance.
 */
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const TURN: Keyframe[] = [
  { transform: "translateY(0)", opacity: 1, easing: EASE },
  { transform: "translateY(-0.6em)", opacity: 0, offset: 0.5 },
  { transform: "translateY(0.6em)", opacity: 0, offset: 0.5, easing: EASE },
  { transform: "translateY(0)", opacity: 1 },
];

/**
 * The cost guard: at most this many wheels turn per change. A clock
 * tick turns 1 wheel most seconds, 2 at a ten-rollover, 3 at a minute
 * rollover; anything bigger — an hour rollover, and above all the
 * server placeholder's swap to the first real reading, which differs
 * at every digit position — is a plain swap, never a cascade.
 */
const MAX_TURNS = 3;

export default function Odometer({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    const last = prev.current;
    prev.current = text;
    // Same-length readings only (both homes hold their width by design —
    // the whole point of the odometer is that nothing reflows), and
    // never the mount.
    if (!el || last === null || last === text || last.length !== text.length) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // A hidden instance keeps ticking but never animates: the rail
    // clock below `md` and the act counter in its measured `md`–`lg`
    // gap are display-hidden, not unmounted. (`?.` for the odd old
    // browser without checkVisibility — it just skips this guard.)
    if (el.checkVisibility?.() === false) return;

    const changed: number[] = [];
    for (let i = 0; i < text.length; i++) {
      if (last[i] !== text[i]) {
        changed.push(i);
        if (changed.length > MAX_TURNS) return; // plain swap past the cap
      }
    }
    for (const i of changed) {
      const span = el.children[i] as HTMLElement | undefined;
      if (!span) continue;
      for (const a of span.getAnimations()) a.cancel();
      span.animate(TURN, 180);
    }
  }, [text]);

  return (
    <span ref={ref}>
      {text.split("").map((ch, i) => (
        // Position IS a wheel's identity, so the index is the right key:
        // React keeps every span and rewrites only the changed text
        // nodes, which is what lets the effect above animate them.
        <span key={i} className="inline-block whitespace-pre">
          {ch}
        </span>
      ))}
    </span>
  );
}
