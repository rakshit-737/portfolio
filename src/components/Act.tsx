import type { ReactNode } from "react";

/**
 * A full-viewport act. The lamp finds it by `data-act` and writes `--p`
 * (the act's own scroll progress), `--lamp-x` and `--lamp-y` onto it each
 * frame; the light's travel comes from that progress, not from pinning.
 *
 * Not scroll-jacked: the page scrolls at native speed and nothing here
 * intercepts wheel or touch events.
 */
export default function Act({
  id,
  label,
  lamp,
  children,
  className = "",
  overflow = "hidden",
}: {
  id: string;
  label: string;
  lamp: { x: number; y: number };
  children: ReactNode;
  className?: string;
  /** Critical 2 fix: `overflow-hidden` turns the act into a scroll
   *  container, which traps a `position: sticky` descendant to a
   *  scrollport that never scrolls — it can never pin. Every act except
   *  the ledger holds its own painting directly (nothing inside it needs
   *  to pin against anything past the act's own edges), so `"hidden"` is
   *  the right default there: it clips the plate's own slight push-in
   *  scale and any scrim bleed. The ledger's plate wrapper genuinely is
   *  sticky (page.tsx), so it needs a real scrolling ancestor further up
   *  the tree (the document) to pin against — `"visible"` clips only the
   *  horizontal axis (`overflow-x-clip`), so the scrim's own bleed can't
   *  open a horizontal scrollbar, while leaving the vertical axis truly
   *  `visible` rather than `hidden`/`auto`, which is what keeps this act
   *  from becoming a scroll container in the first place. */
  overflow?: "hidden" | "visible";
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      data-act=""
      data-lamp-x={lamp.x}
      data-lamp-y={lamp.y}
      className={`relative isolate min-h-[100svh] ${overflow === "hidden" ? "overflow-hidden" : "overflow-x-clip overflow-y-visible"} ${className}`}
    >
      {children}
      <p className="label absolute bottom-6 left-5 z-10 opacity-100 sm:left-8 lg:left-12">
        {label}
      </p>
    </section>
  );
}
