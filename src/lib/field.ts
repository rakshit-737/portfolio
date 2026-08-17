/**
 * Sine geometry — the world's one curve.
 *
 * Deterministic and parameter-driven: the same `width`/`height`/`cycles`/
 * `phase` yield the same path and node marks on every build, so the static
 * export stays byte-stable. All of it runs at build time and serialises
 * into the HTML; nothing ships to the client.
 *
 * `SineLattice.tsx` is the only consumer — it draws the hero curve and,
 * in `mode="constellation"`, reuses the same seeded nodes as the contact
 * act's closing sky.
 */

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
