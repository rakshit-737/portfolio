import type { ReactNode } from "react";

/**
 * A sticky full-bleed act. The lamp finds it by `data-act` and writes
 * `--p`, `--lamp-x` and `--lamp-y` onto it each frame.
 *
 * Sticky, not scroll-jacked: the page scrolls at native speed and the act
 * simply holds its position while its content passes. Nothing here
 * intercepts wheel or touch events.
 */
export default function Act({
  id,
  label,
  lamp,
  children,
  className = "",
}: {
  id: string;
  label: string;
  lamp: { x: number; y: number };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      data-act=""
      data-lamp-x={lamp.x}
      data-lamp-y={lamp.y}
      className={`relative isolate min-h-[100svh] overflow-hidden ${className}`}
    >
      {children}
      <p className="label absolute bottom-6 left-5 z-10 opacity-100 sm:left-8 lg:left-12">
        {label}
      </p>
    </section>
  );
}
