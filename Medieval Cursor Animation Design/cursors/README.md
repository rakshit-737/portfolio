# Lamplight cursors — the key, the lock, and the mark that opens text

Three artifacts, one geometry, three values (`#08070A` ground, `#F2EDE3` bone,
`#E8A33D` ember). "Aged metal" is bone at partial opacity over ground — a
lighting variation, never a fourth colour. Ember appears only in the gem
(and, in the playful variant, the keyhole and flash at the moment of
unlocking). The "R" is `MARK_PATH` from `src/lib/mark.ts`, so the cursor, the
seal monogram, the favicon and the Apple icon are the same artifact.

## Add it to the portfolio (5 steps)

1. **Copy the runtime scripts** into `public/cursors/`:
   `lamplight-cursor-art.js`, `lamplight-cursor-playful.js`,
   `lamplight-cursor-overlay.js`.

2. **Copy the component**: `Cursor.tsx` → `src/components/Cursor.tsx`.
   It imports `playUi` from `@/lib/sound`, so the unlock uses the site's
   own brass click + wax seal, gated by the visitor's Soundscape setting.

3. **Mount it once** in `src/app/layout.tsx`, next to `<Soundscape />` and
   `<Lamp />`:

   ```tsx
   import Cursor from "@/components/Cursor";
   // inside <body>:
   <Cursor variant="playful" />
   ```

   `variant="quiet"` gives the restrained rendering instead (on the
   pointer, caret blink, gem breath, no smoke, no lag).

4. **Replace the static cursor block** at the end of `src/app/globals.css`
   ("The key and the lock (night archive cursor)" plus its forced-colors
   mirror) with the two `@media` blocks in `lamplight-cursors.css`. This is
   what a no-JS, coarse-pointer, forced-colors or reduced-motion visitor
   sees — and the first frame for everyone else.

5. **Update the two pinned assertions** in `tests/cursor.spec.ts`:
   the key's hotspot is now `7 7` (was `5 5`), and prose/inputs compute to
   the I-beam data URI with `text` as the declared fallback (they were
   exactly `"text"`). Then `npm run build && npm test`.

The lit metal: every facet is drawn four times — a ground halo (legibility
over a painting, and the seam where two pieces meet), the body in a bevel
gradient, a rim that is bone on the lit edge and ground on the shaded one,
and a narrow specular streak that leans with the pointer. One light, upper
left, the lamp's. It stays three values: "metal" is bone at fractional
alpha over ground, and ember is still only the gem. The key's bow is a rose
window (eight lancets, eight spandrel eyes, a raised boss); the padlock
carries two chased volutes; the seal's R is struck, with a cast shadow and
a lit edge.

Budget: the richer gradients take the generated CSS block from ~16 KB to
~29 KB raw, which gzips to 3.2 KB — the three data URIs repeat the same
gradient stops, so the compressor eats them. The two scripts are ~22 KB unminified and load only after mount on a
fine pointer, so `npm run budget` and the mobile Lighthouse run are
unaffected (`Cursor.tsx` returns before loading anything on a coarse
pointer or under reduced motion).

## What the playful variant does

- The key rides a beat behind the pointer (`lag` 0.35) and tilts with its
  own velocity; candle-smoke wisps rise off the bow while it moves; after
  ~1 s at rest an ember glint travels the shaft.
- Over anything clickable the padlock appears at the pointer and the key
  slides into its keyhole. Press: the key turns a quarter, the shackle
  pops, the keyhole warms to ember, a small ember square flashes, and the
  brass click + wax thud play. Release: the key turns back.
- Over text the pointer becomes the I-beam key — the King's Cursor Key —
  and blinks like a caret once still. Inputs keep their native caret.
- The metal's highlight leans with the pointer's position across the
  viewport, so the pieces read as lit metal rather than flat glyphs.
- Options for `mount(root, o)`: `size` (key length, px; default 56),
  `lag` (0.12–0.8), `smoke`, `ember`, `sound` (booleans), `playUi` (the
  site's sound function; if absent the script synthesises the same two
  sounds itself).

## Files

- `lamplight-cursor-art.js` — the source of truth: `key()`, `padlock()`,
  `ibeam(small)`, `cursorKey(h)`, `cursorPadlock(h)`, `cursorIbeam(h)`,
  `css()`. Every SVG and the CSS below are generated from it.
- `build.mjs` — `node build.mjs` regenerates every SVG and the CSS block
  from the art. Never hand-edit the generated files.
- `preview.mjs` — `node preview.mjs` renders `preview.png`: the three
  exhibits at 8× beside the cursor images at their real size, on the
  site's ground. This is how the metal gets judged.
- `lamplight-cursor-playful.js` — the animated rendering described above
  (`window.LamplightCursorPlayful.mount`).
- `lamplight-cursor-overlay.js` — the quiet rendering
  (`window.LamplightCursor.mount`).
- `Cursor.tsx` — the Next.js client component that loads either.
- `lamplight-cursors.css` — the static baseline for `globals.css`.
- `lamplight-key.svg`, `lamplight-padlock.svg`, `lamplight-ibeam.svg`,
  `lamplight-ibeam-small.svg` — cursor images at cursor size (hotspots:
  key tip `7 7`, keyhole `17 26`, beam centre `8 16`).
- `exhibit-*.svg` — upright artwork for previews and docs.

## Rules kept

- Bone and ground only; ember in the gem and, for one beat, the unlocking.
- The padlock at rest carries no ember.
- Native cursors on coarse pointers, forced colours and reduced motion;
  the static CSS cursors are the first frame for everyone.
- Text fields keep their native caret; the overlay is `pointer-events:
  none` and never intercepts input.
- Sound only on press, never on hover — and only through the site's own
  gate.

## Note for DESIGN.md

The playful variant is, knowingly, a second small moving thing beside the
lamp (smoke, glint, the slide-in). If that reads as too much against the
One-Light Rule, `variant="quiet"` keeps the same artifacts with motion
limited to the caret blink and the gem's breath.
