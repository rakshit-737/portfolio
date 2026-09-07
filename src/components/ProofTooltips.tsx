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
        const lift = () => {
          // Either departing condition fires this, but the stamp only
          // lifts once NEITHER still holds — with hover and focus on
          // the token at once, the pointer leaving used to lift the
          // stamp while focus still held the reveal open, undoing the
          // Escape it had just answered. rAF, not synchronous: during
          // a focus transfer :focus-within can still match the anchor
          // mid-flight.
          requestAnimationFrame(() => {
            if (anchor.matches(":hover, :focus-within")) return;
            anchor.removeAttribute("data-tip-dismissed");
            anchor.removeEventListener("pointerleave", lift);
            anchor.removeEventListener("focusout", lift);
          });
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
