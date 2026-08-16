import { sineNodes, sinePath } from "@/lib/field";

/**
 * A single sine traced across a field with square node markers — the
 * world's one curve. It draws once as part of the page-load moment.
 */
export default function SineLattice({
  width = 1000,
  height = 200,
  cycles = 1.5,
  phase = 0,
  nodes = 4,
  animate = false,
  className = "",
}: {
  width?: number;
  height?: number;
  cycles?: number;
  phase?: number;
  nodes?: number;
  animate?: boolean;
  className?: string;
}) {
  const d = sinePath(width, height, cycles, 120, phase);
  const marks = nodes ? sineNodes(width, height, cycles, nodes, phase) : [];
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
