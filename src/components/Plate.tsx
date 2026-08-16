import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PLATE_WIDTHS, plates, type PlateId } from "@/lib/art";
import lock from "@/lib/art.lock.json";
import { withBase } from "@/lib/base";

/** Widths actually emitted for this plate — a tier is skipped when it
 *  would have upscaled the crop, so the srcset is built from the lock. */
function tiers(id: PlateId, ext: "avif" | "webp"): number[] {
  return PLATE_WIDTHS.filter((w) => `${id}-${w}.${ext}` in lock);
}

function srcset(id: PlateId, ext: "avif" | "webp"): string {
  return tiers(id, ext)
    .map((w) => `${withBase(`/art/${id}-${w}.${ext}`)} ${w}w`)
    .join(", ");
}

/** The LQIP is a committed data URI — read at build time, inlined. */
function lqip(id: PlateId): string {
  return readFileSync(join(process.cwd(), "public", "art", `${id}-lqip.txt`), "utf8").trim();
}

export default function Plate({
  id,
  priority = false,
}: {
  id: PlateId;
  priority?: boolean;
}) {
  const plate = plates[id];
  const widest = Math.max(...tiers(id, "avif"));
  const fallback = withBase(`/art/${id}-${widest}.webp`);
  const common = {
    sizes: "100vw",
    width: lock[`${id}-${widest}.avif` as keyof typeof lock].width,
    height: lock[`${id}-${widest}.avif` as keyof typeof lock].height,
    decoding: "async" as const,
    loading: priority ? ("eager" as const) : ("lazy" as const),
    fetchPriority: priority ? ("high" as const) : ("auto" as const),
  };

  return (
    <div
      className="plate print-drop"
      style={{ backgroundImage: `url("${lqip(id)}")` }}
      aria-hidden={false}
    >
      {/* The dark layer carries the alt text: it is the one that exists
          in every state, including when the mask is unsupported. */}
      <picture>
        <source srcSet={srcset(id, "avif")} sizes="100vw" type="image/avif" />
        <source srcSet={srcset(id, "webp")} sizes="100vw" type="image/webp" />
        <img className="plate-dark" src={fallback} alt={plate.alt} {...common} />
      </picture>
      <picture>
        <source srcSet={srcset(id, "avif")} sizes="100vw" type="image/avif" />
        <source srcSet={srcset(id, "webp")} sizes="100vw" type="image/webp" />
        <img className="plate-lit" src={fallback} alt="" aria-hidden="true" {...common} />
      </picture>
    </div>
  );
}
