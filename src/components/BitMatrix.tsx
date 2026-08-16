import { bitGrid } from "@/lib/field";

/**
 * A binary matrix cut from a real datum — a repo's head commit SHA. The
 * grid is the commit, not a texture: change the commit and the pattern
 * changes with it. Decorative by rendering, factual by source.
 */
export default function BitMatrix({
  source,
  cols = 8,
  rows = 6,
  cell = 7,
  className = "",
}: {
  source: string;
  cols?: number;
  rows?: number;
  cell?: number;
  className?: string;
}) {
  const grid = bitGrid(source, cols, rows);
  if (grid.length === 0) return null;
  const gap = 2;
  const w = cols * cell + (cols - 1) * gap;
  const h = rows * cell + (rows - 1) * gap;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className={className}
    >
      {grid.flatMap((row, r) =>
        row.map((bit, c) =>
          bit ? (
            <rect
              key={`${r}-${c}`}
              x={c * (cell + gap)}
              y={r * (cell + gap)}
              width={cell}
              height={cell}
              className="mark"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
