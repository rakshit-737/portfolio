"use client";

import { useRef } from "react";

/**
 * Card shell whose hairline border glows steel around the cursor
 * (masked radial gradient — no shadows, no lift). Also exposes Tailwind's
 * `group` so children (evidence-strip chips) can react to card hover.
 */
export default function GlowCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  const onMouseMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <article
      ref={ref}
      onMouseMove={onMouseMove}
      className={`glow-card group ${className ?? ""}`}
    >
      {children}
    </article>
  );
}
