import { sineNodes, sinePath } from "@/lib/field";

/**
 * A single sine traced across a field with square node markers — the
 * world's one curve. It draws once as part of the page-load moment.
 *
 * `mode="constellation"` repurposes the same seeded nodes as a static
 * field of points with a faint connecting line — no curve, no draw
 * animation. It reads the sky over the closing plate.
 */
export default function SineLattice({
  width = 1000,
  height = 200,
  cycles = 1.5,
  nodes = 4,
  animate = false,
  mode = "curve",
  className = "",
}: {
  width?: number;
  height?: number;
  cycles?: number;
  nodes?: number;
  animate?: boolean;
  mode?: "curve" | "constellation";
  className?: string;
}) {
  // `phase` (field.ts's own parameter) was a prop here until B4/B5/B6/B8
  // (final fix wave) dropped it — no call site (page.tsx's hero curve and
  // constellation, projects/[id]/page.tsx's header curve) ever passed one,
  // so every rendered curve/lattice already used field.ts's own default
  // (0). Re-add it here if a future call site genuinely needs to offset
  // the wave.
  const marks = nodes ? sineNodes(width, height, cycles, nodes) : [];

  if (mode === "constellation") {
    const points = marks.map((m) => `${m.x},${m.y}`).join(" ");

    return (
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className={className}
      >
        <polyline
          points={points}
          fill="none"
          strokeWidth="1.25"
          strokeOpacity={0.25}
          vectorEffect="non-scaling-stroke"
          className="stroke-mark"
        />
        {marks.map((m, i) => (
          <circle key={i} cx={m.x} cy={m.y} r="3" className="mark" />
        ))}
      </svg>
    );
  }

  const d = sinePath(width, height, cycles, 120);
  // Rough arc length, only ever used to seed the draw animation.
  const len = Math.round(width * 1.35 * cycles);

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
    >
      <path
        d={d}
        fill="none"
        strokeWidth="1.25"
        vectorEffect="non-scaling-stroke"
        className={`stroke-mark${animate ? " sine-draw" : ""}`}
        style={animate ? ({ "--len": len } as React.CSSProperties) : undefined}
      />
      {marks.map((m, i) => (
        <rect
          key={i}
          x={m.x - 3}
          y={m.y - 3}
          width="6"
          height="6"
          className={`mark${animate ? " node-in" : ""}`}
          style={animate ? ({ "--i": i } as React.CSSProperties) : undefined}
        />
      ))}
    </svg>
  );
}
