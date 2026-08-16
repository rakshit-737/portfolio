import { barField, seedFrom } from "@/lib/field";

/**
 * A bar field for the OG cards. Satori has no SVG path support worth
 * relying on, so the same deterministic geometry is emitted as absolutely
 * positioned divs instead of rects.
 */
export function OgBarField({
  seed,
  width,
  height,
  density = 1,
  opacity = 1,
  style,
}: {
  seed: string;
  width: number;
  height: number;
  density?: number;
  opacity?: number;
  style?: React.CSSProperties;
}) {
  const bars = barField(seedFrom(seed), 1000, density);
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width,
        height,
        opacity,
        ...style,
      }}
    >
      {bars.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: (b.x / 1000) * width,
            top: 0,
            width: Math.max(1, (b.w / 1000) * width),
            height,
            backgroundColor: "#fff",
            opacity: b.o,
          }}
        />
      ))}
    </div>
  );
}
