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
  | "airpump"
  | "alchemist"
  | "forge"
  | "orrery"
  | "kitten"
  | "anatomy"
  | "dovedale"
  | "academy";

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
}

/** Widths emitted per plate. A variant is skipped when it would upscale. */
export const PLATE_WIDTHS = [1280, 1920, 2560] as const;

const commons = (file: string) =>
  `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`;

export const plates: Record<PlateId, Plate> = {
  airpump: {
    id: "airpump",
    artist: "Joseph Wright of Derby",
    title: "An Experiment on a Bird in the Air Pump",
    year: "1768",
    commonsFile:
      "An Experiment on a Bird in an Air Pump by Joseph Wright of Derby, 1768.jpg",
    license: "PD-old-100",
    sourceUrl: commons(
      "An Experiment on a Bird in an Air Pump by Joseph Wright of Derby, 1768.jpg",
    ),
    native: { w: 5639, h: 4226 },
    crop: { x: 0, y: 0, w: 1, h: 0.9 },
    lamp: { x: 0.5, y: 0.62 },
    alt: "A candlelit room of onlookers watching a demonstrator withdraw the air from a glass globe containing a bird, their faces caught between fascination and dread.",
    framing: { wide: "62% 50%", narrow: "50% 38%" },
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
    framing: { wide: "62% 82%", narrow: "58% 22%" },
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
  },
  academy: {
    id: "academy",
    artist: "Joseph Wright of Derby",
    title: "An Academy by Lamplight",
    year: "c. 1769",
    commonsFile:
      "Joseph Wright of Derby - Academy by Lamplight - Google Art Project.jpg",
    license: "PD-old-100",
    sourceUrl: commons(
      "Joseph Wright of Derby - Academy by Lamplight - Google Art Project.jpg",
    ),
    native: { w: 4926, h: 6268 },
    crop: { x: 0, y: 0.18, w: 1, h: 0.6 },
    lamp: { x: 0.38, y: 0.44 },
    alt: "Students gathered close around a single lamp to draw a classical statue, the light falling hardest on the work in front of them.",
    framing: { wide: "56% 40%", narrow: "50% 22%" },
  },
};

/** The visible provenance line for a plate. */
export function creditOf(plate: Plate): string {
  return `${plate.artist}, ${plate.title}, ${plate.year} — public domain, Wikimedia Commons`;
}
