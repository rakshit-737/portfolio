// Fetches the plate originals from Wikimedia Commons, crops them to the
// registry's crop box, and emits AVIF + WebP variants plus a tiny LQIP.
//
// Run manually (`npm run art`); the output is committed. CI never runs
// this — it runs check-art.mjs against the lockfile instead.
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const { plates, PLATE_WIDTHS } = await import("../src/lib/art.ts");

const OUT = join("public", "art");
const UA = "rakshit-portfolio-art/1.0 (https://github.com/rakshit-737/portfolio)";
mkdirSync(OUT, { recursive: true });

/** Commons Special:FilePath serves the original bytes for a File: name. */
const originalUrl = (file) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`;

const lock = {};

function record(name, buf, width, height) {
  writeFileSync(join(OUT, name), buf);
  lock[name] = {
    sha256: createHash("sha256").update(buf).digest("hex"),
    bytes: buf.length,
    width,
    height,
  };
  console.log(`  ${name}  ${(buf.length / 1024).toFixed(0)} kB`);
}

for (const plate of Object.values(plates)) {
  // `maxTier` (src/lib/art.ts) caps emitted widths below whatever the crop
  // itself would allow — a distribution-weight decision for the landing
  // page's image budget, not a fact about the painting. See the field's
  // doc comment for why each plate's value is what it is.
  const widths = PLATE_WIDTHS.filter((w) => w <= (plate.maxTier ?? Infinity));

  console.log(`${plate.id}: fetching`);
  const res = await fetch(originalUrl(plate.commonsFile), {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) {
    throw new Error(`${plate.id}: HTTP ${res.status} for ${plate.commonsFile}`);
  }
  const source = sharp(Buffer.from(await res.arrayBuffer()));
  const meta = await source.metadata();

  if (meta.width !== plate.native.w || meta.height !== plate.native.h) {
    throw new Error(
      `${plate.id}: source is ${meta.width}x${meta.height}, registry says ` +
        `${plate.native.w}x${plate.native.h} — update src/lib/art.ts`,
    );
  }

  const box = {
    left: Math.round(meta.width * plate.crop.x),
    top: Math.round(meta.height * plate.crop.y),
    width: Math.round(meta.width * plate.crop.w),
    height: Math.round(meta.height * plate.crop.h),
  };

  for (const width of widths) {
    // Never upscale. A plate whose crop is narrower than a tier simply
    // does not get that tier.
    if (width > box.width) {
      console.log(`  skip ${width}w (crop is ${box.width}px wide)`);
      continue;
    }
    const base = sharp(await source.clone().extract(box).toBuffer()).resize({
      width,
    });
    const height = Math.round((box.height / box.width) * width);

    record(
      `${plate.id}-${width}.avif`,
      await base.clone().avif({ quality: 62, effort: 6 }).toBuffer(),
      width,
      height,
    );
    record(
      `${plate.id}-${width}.webp`,
      await base.clone().webp({ quality: 76 }).toBuffer(),
      width,
      height,
    );
  }

  // 24px LQIP, inlined as a background while the real plate loads.
  const lqip = await sharp(await source.clone().extract(box).toBuffer())
    .resize({ width: 24 })
    .webp({ quality: 30 })
    .toBuffer();
  const uri = `data:image/webp;base64,${lqip.toString("base64")}`;
  if (uri.length > 400) {
    throw new Error(`${plate.id}: LQIP is ${uri.length} bytes, ceiling is 400`);
  }
  const lqipBuf = Buffer.from(uri, "utf8");
  record(`${plate.id}-lqip.txt`, lqipBuf, 24, 24);
}

writeFileSync("src/lib/art.lock.json", JSON.stringify(lock, null, 2) + "\n");
console.log(`\nwrote src/lib/art.lock.json — ${Object.keys(lock).length} files`);
