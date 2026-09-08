// Generates public/favicon.ico from public/icon.png — the seal plate the
// site links as its icon (public/apple-icon.png is the same image at
// Apple's 180px touch size). A browser fetches /favicon.ico directly
// regardless of the <link rel="icon"> Next.js emits, so it has to exist
// as a real, matching file — this is the classic-fallback path.
//
// sharp can resize PNG but cannot write the .ico container itself, so
// this script composes one by hand. The format is simple: an ICONDIR
// header, one ICONDIRENTRY per frame, then the frames themselves —
// modern readers (every current browser, Windows Vista+) accept a raw
// PNG per frame instead of the legacy BMP DIB, which is what this writes.
//
// Run manually (`npm run favicon`); the output is committed, the same
// convention as `npm run art`.
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const SOURCE_PATH = "public/icon.png";
const OUT_PATH = "public/favicon.ico";

/** The icon is a photographic plate, so every frame is a downscale of
 *  the same source — there is no hand-pixelled small size to keep in
 *  step with a vector any more. `kernel: "lanczos3"` keeps the carved
 *  "R" legible at 16px. */
async function rasterise(size) {
  return sharp(SOURCE_PATH)
    .resize(size, size, { fit: "cover", kernel: "lanczos3" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Composes a multi-image .ico from PNG-encoded frames. */
function buildIco(frames) {
  const HEADER_SIZE = 6;
  const ENTRY_SIZE = 16;
  const dirSize = HEADER_SIZE + ENTRY_SIZE * frames.length;

  const header = Buffer.alloc(HEADER_SIZE);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(frames.length, 4);

  const entries = [];
  const images = [];
  let offset = dirSize;
  for (const { size, png } of frames) {
    const entry = Buffer.alloc(ENTRY_SIZE);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width, 0 = 256
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height, 0 = 256
    entry.writeUInt8(0, 2); // color count (0 = no palette, PNG)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset of image data
    entries.push(entry);
    images.push(png);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...images]);
}

const [png16, png32, png48] = await Promise.all([
  rasterise(16),
  rasterise(32),
  rasterise(48),
]);

const ico = buildIco([
  { size: 16, png: png16 },
  { size: 32, png: png32 },
  { size: 48, png: png48 },
]);

writeFileSync(OUT_PATH, ico);
console.log(
  `favicon: wrote ${OUT_PATH} (${ico.length} bytes — 16/32/48px PNG frames)`,
);
