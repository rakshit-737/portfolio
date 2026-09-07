"use client";

import { useEffect } from "react";

/**
 * The proof tooltip's one piece of JavaScript (CollectUI brief, item 5 —
 * "Receipts you can see"). The reveal itself is pure CSS
 * (`[data-proof-anchor]`/`.proof-tip`, globals.css) and works with no JS
 * at all; the only thing CSS cannot do is close an open tooltip while
 * the pointer still rests on it or focus still sits on its token —
 * WCAG 1.4.13's dismissable clause. One delegated keydown listener:
 * Escape stamps `data-tip-dismissed` on whichever anchor is currently
 * open (hovered or focus-within), which the reveal selector's `:not()`
 * guard reads, and the stamp lifts on pointerleave/focusout so the
 * tooltip can reopen on the next visit. Focus is never moved — Escape
 * hides the receipt, it does not leave the token. Renders nothing.
 */
export default function ProofTooltips() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      for (const anchor of document.querySelectorAll<HTMLElement>(
        "[data-proof-anchor]",
      )) {
        if (
          anchor.hasAttribute("data-tip-dismissed") ||
          !anchor.matches(":hover, :focus-within")
        ) {
          continue;
        }
        anchor.setAttribute("data-tip-dismissed", "");
        const lift = (ev: Event) => {
          // A departure one way while the other modality still holds is
          // not a departure: the pointer leaving a token that keyboard
          // focus still sits on used to lift the stamp and pop the
          // tooltip back open over the Escape it had just answered.
          // Synchronous on the departing event's own type — a deferred
          // (rAF) check lost to a quick Tab-away-and-back, reading the
          // returned focus as "still held" and leaving the tooltip dead
          // while focused. Skipping keeps both listeners armed for the
          // true departure.
          if (ev.type === "pointerleave" && anchor.matches(":focus-within"))
            return;
          if (ev.type === "focusout") {
            const to = (ev as FocusEvent).relatedTarget;
            if (anchor.matches(":hover")) return;
            if (to instanceof Node && anchor.contains(to)) return;
          }
          anchor.removeAttribute("data-tip-dismissed");
          anchor.removeEventListener("pointerleave", lift);
          anchor.removeEventListener("focusout", lift);
        };
        anchor.addEventListener("pointerleave", lift);
        anchor.addEventListener("focusout", lift);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
  return null;
}
