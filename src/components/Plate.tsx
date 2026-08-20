import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PLATE_WIDTHS, plates, type PlateId } from "@/lib/art";
import lock from "@/lib/art.lock.json";
import { withBase } from "@/lib/base";

/** Widths emitted for a plate's narrow (portrait) crop — a phone never
 *  needs more (see scripts/fetch-art.mjs). */
const NARROW_WIDTHS = [640, 960] as const;

/** Widths actually emitted for this plate — a tier is skipped when it
 *  would have upscaled the crop, so the srcset is built from the lock. */
function tiers(id: PlateId, ext: "avif" | "webp"): number[] {
  return PLATE_WIDTHS.filter((w) => `${id}-${w}.${ext}` in lock);
}

export function srcset(id: PlateId, ext: "avif" | "webp"): string {
  return tiers(id, ext)
    .map((w) => `${withBase(`/art/${id}-${w}.${ext}`)} ${w}w`)
    .join(", ");
}

/** Widths actually emitted for this plate's narrow crop, if it has one. */
export function narrowTiers(id: PlateId, ext: "avif" | "webp"): number[] {
  return NARROW_WIDTHS.filter((w) => `${id}-narrow-${w}.${ext}` in lock);
}

export function narrowSrcset(id: PlateId, ext: "avif" | "webp"): string {
  return narrowTiers(id, ext)
    .map((w) => `${withBase(`/art/${id}-narrow-${w}.${ext}`)} ${w}w`)
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
  const hasNarrow = narrowTiers(id, "avif").length > 0;

  return (
    <div
      className="plate print-drop"
      style={
        {
          backgroundImage: `url("${lqip(id)}")`,
          "--framing-wide": plate.framing.wide,
          "--framing-narrow": plate.framing.narrow,
        } as React.CSSProperties
      }
    >
      {/* The full stack, in paint order (three layers, all `position:
          absolute; inset: 0`, no `z-index` — document order IS paint
          order): 1. `.plate-dark`, the dimmed still; 2. `.plate-lit`, the
          full-brightness still, masked to the lamp's pool; 3.
          `.plate::after`, the act-edge dissolve gradient, unconditional and
          always last so it can fade the layers beneath it to ground at the
          act's top and bottom edges.

          Paint order matters as much as the alt split: whichever element is
          later in the DOM paints on top. `.plate-dark` MUST come first and
          `.plate-lit` MUST come second — the masked lit layer has to sit
          above the opaque dimmed one, or the lamp's reveal is invisible
          underneath it (Task 14c's fix round; this order inverted once
          already when an accessibility fix moved the alt text by swapping
          the two elements' classNames instead of just their alt/aria-hidden
          attributes — don't repeat that).

          The lit layer carries the alt text: it is the one that renders
          in every state — no JS, reduced motion, or masked-and-lit —
          while the dark layer only exists once `data-lamp="on"` is set.

          A plate carrying `cropNarrow` (Task 14b, Step 3b) serves that
          crop first, gated to narrow viewports by `media` — a wide
          viewport never matches it and falls through to the landscape
          sources below exactly as before. */}
      <picture>
        {hasNarrow && (
          <source
            media="(max-width: 48rem)"
            srcSet={narrowSrcset(id, "avif")}
            sizes="100vw"
            type="image/avif"
          />
        )}
        {hasNarrow && (
          <source
            media="(max-width: 48rem)"
            srcSet={narrowSrcset(id, "webp")}
            sizes="100vw"
            type="image/webp"
          />
        )}
        <source srcSet={srcset(id, "avif")} sizes="100vw" type="image/avif" />
        <source srcSet={srcset(id, "webp")} sizes="100vw" type="image/webp" />
        <img className="plate-dark" src={fallback} alt="" aria-hidden="true" {...common} />
      </picture>
      <picture>
        {hasNarrow && (
          <source
            media="(max-width: 48rem)"
            srcSet={narrowSrcset(id, "avif")}
            sizes="100vw"
            type="image/avif"
          />
        )}
        {hasNarrow && (
          <source
            media="(max-width: 48rem)"
            srcSet={narrowSrcset(id, "webp")}
            sizes="100vw"
            type="image/webp"
          />
        )}
        <source srcSet={srcset(id, "avif")} sizes="100vw" type="image/avif" />
        <source srcSet={srcset(id, "webp")} sizes="100vw" type="image/webp" />
        <img className="plate-lit" src={fallback} alt={plate.alt} {...common} />
      </picture>
    </div>
  );
}
