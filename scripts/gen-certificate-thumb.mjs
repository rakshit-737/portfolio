// Generates a small AVIF/WebP thumbnail for the certifications section's
// linked scan, alongside the full-resolution original it already commits.
//
// The source (public/certificates/cyber-secure-360-2025.png) is a
// 3308x2407 photo of the physical certificate, rendered on the page at
// roughly 154x112 CSS px — about 21x oversampled, and in PNG, on a page
// whose entire art pipeline is otherwise AVIF (scripts/fetch-art.mjs). A
// plain `<img src>` of the full file also bypassed the media budget gate
// entirely (scripts/check-budget.mjs only counted `<source
// type="image/avif">` candidates), so its 372kB never showed up in the
// measured total — see task-20-report.md.
//
// The full-resolution PNG stays exactly where it is and is still the link
// target — a scan worth reading closely deserves the real file, once, on
// click. Only the *thumbnail slot* gets the small AVIF/WebP pair.
//
// Run manually (`npm run cert-thumb`); the output is committed, the same
// convention as `npm run art` and `npm run favicon`.
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const SRC = "public/certificates/cyber-secure-360-2025.png";
const OUT_BASE = "public/certificates/cyber-secure-360-2025-thumb";

// 320px wide is ~2x the ~154px CSS display width (`h-28 w-auto` on an
// image whose aspect ratio is ~1.37:1) — enough headroom for a retina
// display without reproducing anything close to the source's own
// resolution.
const WIDTH = 320;

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
