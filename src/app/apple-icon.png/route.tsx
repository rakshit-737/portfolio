import { ImageResponse } from "next/og";
import { OG_BONE, OG_GROUND } from "@/lib/ogField";

export const dynamic = "force-static";

/** The mark: a bar cluster in bone on ground — the site's mark, at icon size. */
const BARS: [number, number][] = [
  [28, 12],
  [47, 6],
  [61, 17],
  [86, 6],
  [100, 9],
  [117, 20],
  [145, 6],
];

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: OG_GROUND,
        }}
      >
        {BARS.map(([x, w]) => (
          <div
            key={x}
            style={{
              position: "absolute",
              left: x,
              top: 34,
              width: w,
              height: 112,
              backgroundColor: OG_BONE,
            }}
          />
        ))}
      </div>
    ),
    { width: 180, height: 180 },
  );
}
