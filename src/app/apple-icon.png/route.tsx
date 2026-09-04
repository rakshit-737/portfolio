import { ImageResponse } from "next/og";
import { MARK_INNER, MARK_OUTER, MARK_PATH, MARK_VIEWBOX } from "@/lib/mark";
import { OG_BONE, OG_GROUND } from "@/lib/ogField";

export const dynamic = "force-static";

/** The mark — the seal monogram from `src/lib/mark.ts` — at Apple's
 *  180px touch-icon size. Satori draws basic SVG (`rect`, `path`)
 *  natively, so this is the same geometry the nav and favicon use, not a
 *  re-drawing of it. Bone on ground; no corner radius — iOS applies its
 *  own mask, and this system has none. */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: OG_GROUND,
        }}
      >
        <svg
          width={148}
          height={148}
          viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`}
        >
          <rect
            x={MARK_OUTER.x}
            y={MARK_OUTER.y}
            width={MARK_OUTER.size}
            height={MARK_OUTER.size}
            fill="none"
            stroke={OG_BONE}
            strokeWidth={MARK_OUTER.stroke}
          />
          <rect
            x={MARK_INNER.x}
            y={MARK_INNER.y}
            width={MARK_INNER.size}
            height={MARK_INNER.size}
            fill="none"
            stroke={OG_BONE}
            strokeWidth={MARK_INNER.stroke}
          />
          <path d={MARK_PATH} fill={OG_BONE} />
        </svg>
      </div>
    ),
    { width: 180, height: 180 },
  );
}
