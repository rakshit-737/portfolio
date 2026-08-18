// Generates small AVIF/WebP thumbnails for every certificate scan under
// `public/certificates/`, alongside the full-resolution originals those
// scans already commit.
//
// Certificate scans are photos of physical documents — thousands of px on
// a side, rendered on the page at roughly 154x112 CSS px, and in PNG, on a
// page whose entire art pipeline is otherwise AVIF (scripts/fetch-art.mjs).
// A plain `<img src>` of a full-resolution file also bypasses the media
// budget gate's `<source type="image/avif">` matching entirely (see
// task-20-report.md), so an un-thumbnailed scan's real weight never shows
// up in the measured total — scripts/check-budget.mjs now separately
// catches that case (bare `<img src>` outside a `<picture>`), which is
// exactly why every scan needs a thumbnail, not just the first one.
//
// The full-resolution PNG stays exactly where it is and is still the link
// target — a scan worth reading closely deserves the real file, once, on
// click. Only the *thumbnail slot* gets the small AVIF/WebP pair.
//
// Run manually (`npm run cert-thumb`); the output is committed, the same
// convention as `npm run art` and `npm run favicon`. Safe to re-run: it
// regenerates a thumbnail for every `*.png` in the directory that isn't
// itself already a `-thumb` output, overwriting past output for each.
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const DIR = "public/certificates";

// 320px wide is ~2x the ~154px CSS display width (`h-28 w-auto` on an
// image whose aspect ratio is roughly 1.3–1.4:1) — enough headroom for a
// retina display without reproducing anything close to a scan's own
// resolution.
const WIDTH = 320;

const sources = readdirSync(DIR).filter(
  (f) => f.endsWith(".png") && !f.endsWith("-thumb.png"),
);

for (const file of sources) {
  const SRC = `${DIR}/${file}`;
  const OUT_BASE = `${DIR}/${file.replace(/\.png$/, "-thumb")}`;
  if (!existsSync(SRC)) continue;

  const base = sharp(SRC).resize({ width: WIDTH });
  const avif = await base.clone().avif({ quality: 62, effort: 6 }).toBuffer();
  const webp = await base.clone().webp({ quality: 76 }).toBuffer();

  writeFileSync(`${OUT_BASE}.avif`, avif);
  writeFileSync(`${OUT_BASE}.webp`, webp);

  const meta = await sharp(avif).metadata();
  console.log(
    `wrote ${OUT_BASE}.avif (${(avif.length / 1024).toFixed(1)} kB) and ` +
      `${OUT_BASE}.webp (${(webp.length / 1024).toFixed(1)} kB), ${meta.width}x${meta.height}`,
  );
}
