import { barField, seedFrom } from "@/lib/field";

/**
 * The world's ground material: a field of hairline bars, deterministic per
 * seed and generated at build time. It measures nothing and says nothing —
 * it is the surface the measurements sit on.
 */
export default function BarField({
  seed,
  density = 1,
  height = 100,
  animate = false,
  className = "",
}: {
  seed: string | number;
  density?: number;
  height?: number;
  /** Part of the page-load moment (hero only). */
  animate?: boolean;
  className?: string;
}) {
  const bars = barField(
    typeof seed === "string" ? seedFrom(seed) : seed,
    1000,
    density,
  );
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 1000 ${height}`}
      preserveAspectRatio="none"
      className={`${animate ? "field-resolve " : ""}${className}`}
    >
      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y="0"
          width={b.w}
          height={height}
          opacity={b.o}
          className="mark"
        />
      ))}
    </svg>
  );
}
