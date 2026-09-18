// Converts every PNG in docs/screens/ to a same-stem WebP (quality 80) and
// deletes the PNG. Design captures are for reading, not pixel forensics,
// and a 1 MB PNG per capture put 17 MB of screenshots into every clone.
// Run after dropping new captures in: node scripts/webp-screens.mjs
import { readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const DIR = join("docs", "screens");
let before = 0;
let after = 0;
for (const f of readdirSync(DIR).filter((f) => f.toLowerCase().endsWith(".png"))) {
  const src = join(DIR, f);
  const dest = join(DIR, f.replace(/\.png$/i, ".webp"));
  await sharp(src).webp({ quality: 80 }).toFile(dest);
  before += statSync(src).size;
  after += statSync(dest).size;
  unlinkSync(src);
  console.log(`${f} -> ${dest}`);
}
console.log(`docs/screens: ${(before / 1e6).toFixed(1)} MB of PNG -> ${(after / 1e6).toFixed(1)} MB of WebP`);
