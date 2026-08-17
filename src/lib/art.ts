/**
 * The plates — eight public-domain paintings that carry the site.
 *
 * Every entry is verified against the Wikimedia Commons API: file name,
 * native pixel dimensions, and licence. Art gets the same provenance
 * treatment as code — nothing renders without a visible credit.
 *
 * `crop` is a fraction of the native frame (0–1, origin top-left).
 * `lamp` is the light's rest position within the *cropped* frame, set to
 * where the painter actually put the light source.
 */

export type PlateId =
  | "blacksmith"
  | "alchemist"
  | "forge"
  | "orrery"
  | "kitten"
  | "anatomy"
  | "dovedale"
  | "latour";

export interface Plate {
  id: PlateId;
  artist: string;
  title: string;
  year: string;
  /** Exact `File:` name on Wikimedia Commons, without the `File:` prefix. */
  commonsFile: string;
  license: "PD-old-100";
  sourceUrl: string;
  native: { w: number; h: number };
  crop: { x: number; y: number; w: number; h: number };
  lamp: { x: number; y: number };
  alt: string;
  /** Where the painting sits inside the act box, as a CSS object-position,
   *  one value per breakpoint (`wide` above 48rem, `narrow` at or below
   *  it). On wide screens both axes matter: chosen so the subject lands
   *  right-of-centre, clear of the text column. On narrow screens the
   *  render is height-bound — every crop here is landscape (aspect ratio
   *  ~1.24-1.52) against a far more portrait mobile act box, so
   *  `object-fit: cover` always scales to the box's height with zero
   *  vertical slack (confirmed by the `object-fit: cover` math for all
   *  eight plates). Only `narrow`'s X component has any visible effect;
   *  its Y component is inert today and is kept for forward-compatibility
   *  — if a future crop or act geometry ever leaves vertical slack on a
   *  narrow viewport, the Y value is already there to use. */
  framing: { wide: string; narrow: string };
  /** A portrait-friendly crop for narrow viewports. Optional: set it only
   *  for plates whose subject falls outside the band a phone shows under
   *  the landscape crop. Same coordinate space as `crop`. */
  cropNarrow?: { x: number; y: number; w: number; h: number };
  /** How this plate moves when scrubbed. `from`/`to` are crop-relative
   *  centres (0-1) and scales; the drift runs from one to the other across
   *  the act's scroll. Chosen per painting, toward what it is about. */
  motion?: {
    from: { x: number; y: number; scale: number };
    to: { x: number; y: number; scale: number };
  };
}

/** Widths emitted per plate. A variant is skipped when it would upscale. */
export const PLATE_WIDTHS = [1280, 1920, 2560] as const;

const commons = (file: string) =>
  `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`;

export const plates: Record<PlateId, Plate> = {
  blacksmith: {
    id: "blacksmith",
    artist: "Joseph Wright of Derby",
    title: "The Blacksmith's Shop",
    year: "1771",
    commonsFile: "Joseph Wright of Derby - The Blacksmith's Shop - Google Art Project.jpg",
    license: "PD-old-100",
    sourceUrl: commons(
      "Joseph Wright of Derby - The Blacksmith's Shop - Google Art Project.jpg",
    ),
    native: { w: 4688, h: 5975 },
    // Native frame is portrait (4688×5975, taller than wide) — every other
    // plate's crop box produces a landscape frame, so this one is chosen
    // deliberately: a band through the lower-middle third holds the anvil,
    // the white-hot iron, and the ring of lit figures around it while
    // dropping the darker rafters above and floor below that a full-height
    // crop would otherwise waste on a landscape act box.
    crop: { x: 0, y: 0.3, w: 1, h: 0.45 },
    // Narrow viewports are height-bound (object-fit: cover), so the wide
    // crop's 1.74 aspect would push most of the smiths off both edges on a
    // phone. This is a genuinely taller window straight from the native
    // frame, centred on the anvil group.
    cropNarrow: { x: 0.15, y: 0.28, w: 0.55, h: 0.52 },
    lamp: { x: 0.48, y: 0.62 },
    alt: "A blacksmith's shop at night, a bar of white-hot iron on the anvil the only source of light, throwing hard shadows across the smiths, apprentices, and the timber frame of the shop.",
    framing: { wide: "58% 55%", narrow: "50% 40%" },
    motion: {
      from: { x: 0.48, y: 0.5, scale: 1.0 },
      to: { x: 0.48, y: 0.62, scale: 1.12 },
    },
  },
  alchemist: {
    id: "alchemist",
    artist: "Joseph Wright of Derby",
    title: "The Alchemist Discovering Phosphorus",
    year: "1771",
    commonsFile: "Joseph Wright of Derby The Alchemist.jpg",
    license: "PD-old-100",
    sourceUrl: commons("Joseph Wright of Derby The Alchemist.jpg"),
    native: { w: 4724, h: 6126 },
    crop: { x: 0, y: 0.16, w: 1, h: 0.62 },
    lamp: { x: 0.46, y: 0.55 },
    alt: "An alchemist kneeling alone at night in a vaulted room, hands raised before a flask that has begun to glow.",
    framing: { wide: "62% 82%", narrow: "82% 50%" },
    // The wide crop is a flat horizontal band (aspect ~1.24); on a phone,
    // object-fit: cover is height-bound against that band and never shows
    // enough of it to include both the kneeling figure and the flask above
    // his hands. This is a genuinely taller, narrower window straight from
    // the native frame — verified by eye against a 500px preview — running
    // from just above his head to the floor.
    cropNarrow: { x: 0.28, y: 0.42, w: 0.5, h: 0.56 },
    // No `motion`: Step 7 measured total media at 4140 kB against the
    // 3500 kB ceiling with all eight plates carrying motion, so the
    // spread was cut back to the hero plus the three project acts
    // (blacksmith, forge, orrery, kitten). See the Task 14b report.
  },
  forge: {
    id: "forge",
    artist: "Joseph Wright of Derby",
    title: "An Iron Forge",
    year: "1772",
    commonsFile: "Joseph Wright - An Iron Forge - Google Art Project.jpg",
    license: "PD-old-100",
    sourceUrl: commons(
      "Joseph Wright - An Iron Forge - Google Art Project.jpg",
    ),
    native: { w: 2801, h: 2572 },
    crop: { x: 0, y: 0.06, w: 1, h: 0.84 },
    lamp: { x: 0.44, y: 0.58 },
    alt: "A working forge at night, a white-hot ingot on the anvil throwing hard light across the smith, his family, and the timber frame of the shop.",
    framing: { wide: "72% 55%", narrow: "56% 24%" },
    motion: {
      from: { x: 0.44, y: 0.46, scale: 1.0 },
      to: { x: 0.44, y: 0.58, scale: 1.12 },
    },
  },
  orrery: {
    id: "orrery",
    artist: "Joseph Wright of Derby",
    title: "A Philosopher Lecturing on the Orrery",
    year: "1766",
    commonsFile: "Wright of Derby, The Orrery.jpg",
    license: "PD-old-100",
    sourceUrl: commons("Wright of Derby, The Orrery.jpg"),
    native: { w: 6527, h: 4581 },
    crop: { x: 0, y: 0, w: 1, h: 0.94 },
    lamp: { x: 0.52, y: 0.54 },
    alt: "A philosopher lecturing on a brass orrery, a lamp standing in for the sun at its centre and lighting the listening faces from below.",
    framing: { wide: "58% 45%", narrow: "50% 26%" },
    motion: {
      from: { x: 0.52, y: 0.46, scale: 1.0 },
      to: { x: 0.52, y: 0.54, scale: 1.1 },
    },
  },
  kitten: {
    id: "kitten",
    artist: "Joseph Wright of Derby",
    title: "Two Girls Dressing a Kitten by Candlelight",
    year: "c. 1768–70",
    commonsFile:
      "Joseph Wright of Derby. Two Girls Dressing a Kitten by Candlelight. c. 1768-70.jpg",
    license: "PD-old-100",
    sourceUrl: commons(
      "Joseph Wright of Derby. Two Girls Dressing a Kitten by Candlelight. c. 1768-70.jpg",
    ),
    native: { w: 2000, h: 2641 },
    crop: { x: 0, y: 0.2, w: 1, h: 0.58 },
    lamp: { x: 0.5, y: 0.6 },
    alt: "Two girls bent over a kitten by candlelight, absorbed in a small domestic ritual repeated night after night.",
    framing: { wide: "64% 42%", narrow: "56% 30%" },
    motion: {
      from: { x: 0.5, y: 0.48, scale: 1.0 },
      to: { x: 0.5, y: 0.6, scale: 1.1 },
    },
  },
  anatomy: {
    id: "anatomy",
    artist: "Rembrandt van Rijn",
    title: "The Anatomy Lesson of Dr Nicolaes Tulp",
    year: "1632",
    commonsFile: "Rembrandt - The Anatomy Lesson of Dr Nicolaes Tulp.jpg",
    license: "PD-old-100",
    sourceUrl: commons(
      "Rembrandt - The Anatomy Lesson of Dr Nicolaes Tulp.jpg",
    ),
    native: { w: 6000, h: 4520 },
    crop: { x: 0, y: 0, w: 1, h: 0.95 },
    lamp: { x: 0.42, y: 0.6 },
    alt: "Surgeons crowded around a dissection table as Dr Tulp lifts the tendons of a forearm with forceps, everyone watching the evidence rather than the body.",
    framing: { wide: "68% 56%", narrow: "54% 28%" },
    // No `motion` — see the note on `alchemist` above (Step 7 spread cut).
  },
  dovedale: {
    id: "dovedale",
    artist: "Joseph Wright of Derby",
    title: "Dovedale by Moonlight",
    year: "1784",
    commonsFile:
      "Joseph Wright of Derby - Dovedale by Moonlight - Google Art Project.jpg",
    license: "PD-old-100",
    sourceUrl: commons(
      "Joseph Wright of Derby - Dovedale by Moonlight - Google Art Project.jpg",
    ),
    native: { w: 2400, h: 2021 },
    crop: { x: 0, y: 0.08, w: 1, h: 0.8 },
    lamp: { x: 0.62, y: 0.36 },
    alt: "A river valley under a full moon, the water carrying a cold band of reflected light between dark banks.",
    framing: { wide: "64% 32%", narrow: "58% 18%" },
    // No `motion` — see the note on `alchemist` above (Step 7 spread cut).
  },
  latour: {
    id: "latour",
    artist: "Georges de La Tour",
    title: "The Education of the Virgin",
    year: "c. 1650",
    commonsFile: "Georges de La Tour L'Education de la Vierge The Frick Collection.jpg",
    license: "PD-old-100",
    sourceUrl: commons(
      "Georges de La Tour L'Education de la Vierge The Frick Collection.jpg",
    ),
    native: { w: 3389, h: 2835 },
    crop: { x: 0, y: 0.04, w: 1, h: 0.9 },
    lamp: { x: 0.55, y: 0.45 },
    alt: "A woman shields a single candle flame with her cupped hand as a young girl reads beside her, both faces lit by the flame alone.",
    framing: { wide: "60% 45%", narrow: "50% 30%" },
    // No `motion` — see the note on `alchemist` above (Step 7 spread cut).
    // The close keeps the same still-only treatment the plate it replaces
    // (academy) had.
  },
};

/** The visible provenance line for a plate. */
export function creditOf(plate: Plate): string {
  return `${plate.artist}, ${plate.title}, ${plate.year} — public domain, Wikimedia Commons`;
}
