import { MARK_INNER, MARK_OUTER, MARK_PATH, MARK_VIEWBOX } from "@/lib/mark";

/**
 * The seal monogram (see `src/lib/mark.ts`), drawn in `currentColor` so
 * whatever control carries it can invert it the way every control on
 * this site already expresses hover — by swapping its own ground and
 * mark. Decorative: the brand link's accessible name is the name text
 * beside it, so this stays `aria-hidden`.
 *
 * `frame="single"` drops the inner rule and enlarges the letter: at nav
 * size (22px) a 46-unit inner frame is a 0.5px line, which anti-aliases
 * into a grey the palette doesn't have, and the letter would sit at 10px.
 * The doubled frame is for the sizes that can afford it — the favicon
 * (32px+) and the Apple icon (180px).
 */
export default function Mark({
  size = 22,
  frame = "single",
  className = "",
}: {
  size?: number;
  frame?: "single" | "double";
  className?: string;
}) {
  const single = frame === "single";
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect
        x={MARK_OUTER.x}
        y={MARK_OUTER.y}
        width={MARK_OUTER.size}
        height={MARK_OUTER.size}
        fill="none"
        stroke="currentColor"
        strokeWidth={single ? 3 : MARK_OUTER.stroke}
      />
      {!single && (
        <rect
          x={MARK_INNER.x}
          y={MARK_INNER.y}
          width={MARK_INNER.size}
          height={MARK_INNER.size}
          fill="none"
          stroke="currentColor"
          strokeWidth={MARK_INNER.stroke}
        />
      )}
      <path
        d={MARK_PATH}
        fill="currentColor"
        transform={single ? "translate(32 32) scale(1.22) translate(-32 -32)" : undefined}
      />
    </svg>
  );
}
