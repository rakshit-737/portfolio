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

/** The plate's motion clip, if the lockfile carries one for it. Absent
 *  entirely (not just hidden) whenever there's nothing to promote. */
function motionSrc(id: PlateId): string | null {
  return `${id}-motion.webm` in lock ? withBase(`/art/${id}-motion.webm`) : null;
}

export default function Plate({
  id,
  priority = false,
  motion: motionEnabled = true,
}: {
  id: PlateId;
  priority?: boolean;
  /** Whether this instance may render its scroll-scrubbed video, if the
   *  plate has one. Defaults `true` because every landing-page act wants
   *  it when the plate has one — Lamp.tsx scrubs `video.currentTime` from
   *  scroll there. The case-file banner (`projects/[id]/page.tsx`) passes
   *  `false` explicitly: it has no `[data-act]` ancestor, so nothing ever
   *  scrubs it — Lamp.tsx's rAF loop only ever finds elements under
   *  `[data-act]`, and the banner isn't one. (It still carries the lamp's
   *  CSS mask, just static and centred — every custom property the mask
   *  reads falls back to its unset default once `data-lamp="on"` is set
   *  globally, which spec §5.2 calls for directly.) A clip here would only
   *  ever paint one static frame identical to the still beneath it — a
   *  real download (180–239kB per case file) that nothing ever plays.
   *  Gating in `Plate` itself, rather than filtering `promoteVideos()` by
   *  ancestor, means the banner never emits a `<video>` element at all —
   *  there is nothing for any query to find. */
  motion?: boolean;
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
  const motion = motionEnabled ? motionSrc(id) : null;

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
      {/* The full stack, in paint order (four layers, all `position:
          absolute; inset: 0`, no `z-index` — document order IS paint
          order): 1. `.plate-dark`, the dimmed still; 2. `.plate-lit`, the
          full-brightness still, masked to the lamp's pool; 3.
          `.plate-motion`, the scrubbed video, masked identically, standing
          in for `.plate-lit` inside the pool while it plays; 4.
          `.plate::after`, the act-edge dissolve gradient, unconditional and
          always last so it can fade every layer beneath it to ground at the
          act's top and bottom edges regardless of what's playing.

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
      {/* The motion layer, after both pictures — see the paint-order note
          above. Decorative and duplicates the still beneath it, so it is
          `aria-hidden` and carries no accessible name. It never plays
          itself: no `autoplay`, no `loop`, no `controls` — scroll is its
          only clock (Lamp.tsx). No `src` in the markup, only `data-src`:
          a `<video preload="metadata">` fetches metadata the instant it
          has a `src`, even with `display: none`, so with JavaScript
          disabled the element must stay inert rather than merely hidden.
          Lamp promotes `data-src` to `src` once it turns the lamp on, and
          removes the element outright under reduced motion — "absent",
          not "hidden", in both those states. */}
      {motion && (
        <video
          className="plate-motion"
          data-src={motion}
          preload="metadata"
          muted
          playsInline
          aria-hidden="true"
          tabIndex={-1}
          disablePictureInPicture
        />
      )}
    </div>
  );
}
