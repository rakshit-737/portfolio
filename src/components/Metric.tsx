import { Fragment } from "react";

/**
 * Renders a copy string from content.ts. `**metric**` marks the single
 * strongest number in a bullet; with no colour in this palette, it is
 * emphasised the only way the world allows — inverted out of the surface.
 */
export default function Metric({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="metric">
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
