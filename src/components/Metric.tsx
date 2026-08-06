import { Fragment } from "react";

/**
 * Renders a copy string from content.ts, highlighting `**metric**` spans
 * in verdict amber — one strongest metric per bullet, per the design brief.
 */
export default function Metric({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-amber">
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
