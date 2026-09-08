import { withBase } from "@/lib/base";

/**
 * The seal: the carved-stone plate the browser icons carry
 * (`public/icon.png`), cropped to its inner panel and served at
 * `public/mark.png` — 88px for a 22px slot, so it stays sharp on a 3×
 * screen. Decorative: the brand link's accessible name is the name text
 * beside it, so this stays `aria-hidden` with an empty `alt`.
 *
 * It replaced an inline `currentColor` monogram (the traced Newsreader
 * "R" in `src/lib/mark.ts`) at the owner's request, and the brand link's
 * hover inversion went with it — a raster plate has no ground and mark
 * to swap, and no filter substitute belongs here: the site's hover device
 * is a colour swap or nothing. Ordinary `<img>`, not `next/image`: this
 * is a fixed-size static asset on a statically exported site.
 */
export default function Mark({
  size = 22,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={withBase("/mark.png")}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
