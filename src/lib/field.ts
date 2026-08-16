/**
 * Field geometry — the world's raw material.
 *
 * Every generator here is deterministic: the same seed yields the same
 * marks on every build, so the static export is byte-stable and the
 * bar fields never "re-roll" between deploys. All of it runs at build
 * time and serialises into the HTML; nothing ships to the client.
 *
 * A bar field is a graphic, not a claim — it encodes no measurement.
 * Anything that renders as a *number* on this site comes from
 * `src/content.ts` or from live GitHub data, never from here.
 */

/** mulberry32 — small, fast, seeded. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Bar {
  x: number;
  w: number;
  /** 0.06–1: how brightly this bar sits in the field. */
  o: number;
}

/**
 * A hairline bar field across `width` user units. Widths cluster: mostly
 * hairlines, occasional blocks, with density surges — the visual signature
 * of a data field rather than an even stripe pattern.
 */
export function barField(seed: number, width = 1000, density = 1): Bar[] {
  const rand = rng(seed);
  const bars: Bar[] = [];
  let x = 0;
  while (x < width) {
    // Surges: short passages where bars crowd together.
    const surge = rand() < 0.18;
    const runs = surge ? 6 + Math.floor(rand() * 14) : 1;
    for (let i = 0; i < runs && x < width; i++) {
      const heavy = rand() < 0.08;
      const w = heavy ? 2 + rand() * 5 : 0.5 + rand() * 1.4;
      const o = heavy ? 0.55 + rand() * 0.45 : 0.08 + rand() * 0.5;
      bars.push({ x: +x.toFixed(2), w: +w.toFixed(2), o: +o.toFixed(2) });
      x += w + (surge ? 0.6 + rand() * 1.8 : (1.5 + rand() * 12) / density);
    }
    if (!surge) x += (rand() * 6) / density;
  }
  return bars;
}

/** Sine path across a box, sampled densely enough to stay smooth. */
export function sinePath(
  width: number,
  height: number,
  cycles = 1.5,
  samples = 96,
  phase = 0,
): string {
  const pts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = t * width;
    const y =
      height / 2 - Math.sin(t * cycles * Math.PI * 2 + phase) * (height / 2 - 2);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `M${pts.join(" L")}`;
}

/** Node markers along a sine — the square points in the reference. */
export function sineNodes(
  width: number,
  height: number,
  cycles = 1.5,
  count = 4,
  phase = 0,
): { x: number; y: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const t = (i + 0.5) / count;
    return {
      x: +(t * width).toFixed(2),
      y: +(
        height / 2 -
        Math.sin(t * cycles * Math.PI * 2 + phase) * (height / 2 - 2)
      ).toFixed(2),
    };
  });
}

/**
 * Hex → bit grid. Used to render a commit SHA as a binary matrix: the
 * matrix on a project node IS that repo's head commit, not decoration.
 * Falls back to the project id's characters when no SHA was fetched.
 */
export function bitGrid(source: string, cols = 8, rows = 6): number[][] {
  const bits: number[] = [];
  for (const ch of source) {
    const v = parseInt(ch, 16);
    const n = Number.isNaN(v) ? ch.charCodeAt(0) & 15 : v;
    bits.push((n >> 3) & 1, (n >> 2) & 1, (n >> 1) & 1, n & 1);
  }
  if (bits.length === 0) return [];
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => bits[(r * cols + c) % bits.length]),
  );
}

/** Stable per-string seed, so a project's field is always its own. */
export function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
