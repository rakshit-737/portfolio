"use client";

import { useEffect, useRef, useState } from "react";

/** Half of the 180ms morph — exit, swap, enter — on the site's easing. */
const SLIDE = { duration: 90, easing: "cubic-bezier(0.16, 1, 0.3, 1)" };

/**
 * A control's changing word, stamped into place rather than swapped
 * (ref CollectUI @SwamiMalode, @lochieaxon): when `text` changes, the
 * outgoing word slides up 0.3em and out, the incoming rises in from
 * below — the statement reveal's word device, answering input instead
 * of arrival. One element, one text node per state (Ignite.tsx's
 * history binds here too): the text swaps between the two halves, so
 * AT, find-in-page and copy never meet two words at once. WAAPI,
 * because the swap needs sequencing — and WAAPI sits outside
 * globals.css's reduced-motion block, so the preference is checked
 * here, per change, and honoured with an instant swap (the pre-morph
 * behaviour). First mount never animates: a response, not an entrance.
 */
export default function MorphLabel({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(text);
  const entering = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (shown === text) {
      if (!entering.current) return;
      entering.current = false;
      el.animate(
        { transform: ["translateY(0.3em)", "translateY(0)"], opacity: [0, 1] },
        SLIDE,
      );
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Skip to the end state: no Animation is ever created. The swap
      // rides a microtask — still this same frame, just not a setState
      // inside the effect's own commit (react-hooks/set-state-in-effect).
      queueMicrotask(() => setShown(text));
      return;
    }
    // `fill: "forwards"` holds the outgoing word's hidden end state across
    // React's re-render, so the incoming text is never painted at rest
    // before its own half starts. The cleanup cancels the fill — and any
    // half-flown exit, should `text` change back mid-flight.
    const exit = el.animate(
      { transform: ["translateY(0)", "translateY(-0.3em)"], opacity: [1, 0] },
      { ...SLIDE, fill: "forwards" },
    );
    exit.onfinish = () => {
      entering.current = true;
      setShown(text);
    };
    return () => exit.cancel();
  }, [text, shown]);

  return (
    <span ref={ref} className="inline-block">
      {shown}
    </span>
  );
}
