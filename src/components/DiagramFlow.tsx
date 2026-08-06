import type { DiagramStep } from "@/content";

const PAD = 4;
const BOX_H = 50;
const GAP = 26;
const CHAR_W = 6.5; // approx IBM Plex Mono advance at 11px

/**
 * Inline SVG pipeline diagram in the evidence-file style: hairline boxes,
 * mono labels, one amber verdict node. Server-rendered, no JS. Scrolls
 * horizontally inside its own container on narrow viewports.
 */
export default function DiagramFlow({
  steps,
  title,
}: {
  steps: DiagramStep[];
  title: string;
}) {
  const widths = steps.map(
    (s) =>
      Math.max(s.label.length, (s.sub?.length ?? 0) * 0.85, 6) * CHAR_W + 18,
  );
  const xs: number[] = [];
  let x = PAD;
  for (const w of widths) {
    xs.push(x);
    x += w + GAP;
  }
  const width = x - GAP + PAD;
  const height = BOX_H + PAD * 2;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={title}
        className="h-auto w-full"
        style={{ minWidth: `${Math.round(width * 0.8)}px` }}
      >
        <title>{title}</title>
        {steps.map((s, i) => {
          const bx = xs[i];
          const bw = widths[i];
          const cx = bx + bw / 2;
          const stroke = s.accent
            ? "var(--color-amber)"
            : "var(--color-hairline)";
          const labelFill = s.accent ? "var(--color-amber)" : "var(--color-ink)";
          return (
            <g key={s.label}>
              <rect
                x={bx}
                y={PAD}
                width={bw}
                height={BOX_H}
                fill="var(--color-surface)"
                stroke={stroke}
                strokeWidth="1"
              />
              <text
                x={cx}
                y={PAD + (s.sub ? 21 : 29)}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="11"
                fill={labelFill}
              >
                {s.label}
              </text>
              {s.sub && (
                <text
                  x={cx}
                  y={PAD + 37}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize="9"
                  fill="var(--color-muted)"
                >
                  {s.sub}
                </text>
              )}
              {i < steps.length - 1 && (
                <g stroke="var(--color-muted)" strokeWidth="1">
                  <line
                    x1={bx + bw + 4}
                    y1={PAD + BOX_H / 2}
                    x2={bx + bw + GAP - 6}
                    y2={PAD + BOX_H / 2}
                  />
                  <polyline
                    points={`${bx + bw + GAP - 11},${PAD + BOX_H / 2 - 4} ${
                      bx + bw + GAP - 6
                    },${PAD + BOX_H / 2} ${bx + bw + GAP - 11},${
                      PAD + BOX_H / 2 + 4
                    }`}
                    fill="none"
                  />
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
