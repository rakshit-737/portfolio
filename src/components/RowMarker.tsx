"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The ledger's one marker (CollectUI brief, item 6 — ref @noechague's
 * events-list arrow sliding down to meet the hovered row,
 * @RachitThakur146's one-hover-device work rows; the drawn arrow
 * dropped — the mark is the site's own 6px seal square, bone, never
 * ember). One shared, decorative marker per list: it sits in the left
 * gutter of the hovered or focused row and *travels* to the next one
 * (`.row-marker`, globals.css) instead of each row lighting
 * independently — the rows themselves keep their `border-b border-rule`
 * grammar with no background fill, so the glide is the only hover
 * device.
 *
 * Rendered as an `aria-hidden` `<li>` so its parent list stays valid
 * HTML and the marker never reaches assistive tech; positioned
 * absolutely, so it takes no space in the list. Listeners are delegated
 * to the parent list: on `pointerover`/`focusin` the row's centre is
 * read ONCE per event — never per frame, never in rAF (the lamp owns
 * the site's only rAF loop) — and written as `--row-y`; the 200ms
 * transform transition in CSS is the whole glide, and the global
 * reduced-motion block zeroes it. Below `md` (touch) the component
 * renders nothing at all, which is also the no-JS state — the server
 * HTML never carries a marker and no listener ever attaches.
 */
export default function RowMarker() {
  const ref = useRef<HTMLLIElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 48rem)");
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const marker = ref.current;
    const list = marker?.parentElement;
    if (!on || !marker || !list) return;

    let current: Element | null = null;

    const show = (target: EventTarget | null) => {
      // Resolve to the list's own row, never a nested li (a tech chip in
      // an archive row's Technologies list would otherwise win).
      let row = target instanceof Element ? target : null;
      while (row && row.parentElement !== list) row = row.parentElement;
      if (!row || row === marker || row === current) return;
      current = row;
      // One layout read per event — never per frame.
      const el = row as HTMLElement;
      marker.style.setProperty(
        "--row-y",
        `${el.offsetTop + el.offsetHeight / 2}px`,
      );
      if (!marker.hasAttribute("data-on")) {
        // Land silently: flush the position while the transition-less
        // rest state still applies, so appearing never glides in from
        // stale coordinates — only travel between rows animates.
        marker.getBoundingClientRect();
        marker.setAttribute("data-on", "");
      }
    };
    const hide = () => {
      current = null;
      marker.removeAttribute("data-on");
    };
    const onPointerOver = (e: PointerEvent) => show(e.target);
    const onPointerLeave = () => {
      // A row holding keyboard focus outranks a departing pointer.
      if (list.contains(document.activeElement)) show(document.activeElement);
      else hide();
    };
    const onFocusIn = (e: FocusEvent) => show(e.target);
    const onFocusOut = (e: FocusEvent) => {
      if (e.relatedTarget instanceof Node && list.contains(e.relatedTarget))
        return;
      if (!list.matches(":hover")) hide();
    };

    list.addEventListener("pointerover", onPointerOver);
    list.addEventListener("pointerleave", onPointerLeave);
    list.addEventListener("focusin", onFocusIn);
    list.addEventListener("focusout", onFocusOut);
    return () => {
      list.removeEventListener("pointerover", onPointerOver);
      list.removeEventListener("pointerleave", onPointerLeave);
      list.removeEventListener("focusin", onFocusIn);
      list.removeEventListener("focusout", onFocusOut);
    };
  }, [on]);

  if (!on) return null;
  return <li ref={ref} aria-hidden="true" className="row-marker" />;
}
