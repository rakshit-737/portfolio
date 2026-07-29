"use client";

import { useEffect, useState } from "react";

/**
 * Types the hero provenance line once on load. Respects
 * prefers-reduced-motion by rendering the full line immediately.
 */
export default function TypedLine({
  prefix,
  text,
  startDelayMs = 700,
}: {
  prefix: string;
  text: string;
  startDelayMs?: number;
}) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const done = count >= text.length;

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const start = window.setTimeout(
      () => {
        setStarted(true);
        if (reduced) setCount(text.length);
      },
      reduced ? 0 : startDelayMs,
    );
    return () => window.clearTimeout(start);
  }, [text, startDelayMs]);

  useEffect(() => {
    if (!started || done) return;
    const tick = window.setTimeout(() => setCount((c) => c + 1), 24);
    return () => window.clearTimeout(tick);
  }, [started, count, done]);

  return (
    <p
      className="min-h-10 font-mono text-sm text-muted sm:min-h-5"
      aria-label={`${prefix} ${text}`}
    >
      <span aria-hidden="true">
        <span className="text-amber">{prefix}</span>{" "}
        <span className={started && !done ? "caret" : undefined}>
          {text.slice(0, count)}
        </span>
      </span>
    </p>
  );
}
