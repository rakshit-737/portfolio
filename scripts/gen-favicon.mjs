// Generates public/favicon.ico from src/app/icon.svg — the seal monogram
// whose geometry lives in src/lib/mark.ts (also drawn by
// src/app/apple-icon.png/route.tsx via Satori, and inline in the nav by
// src/components/Mark.tsx). A browser fetches /favicon.ico directly regardless of
// the <link rel="icon"> Next.js emits for icon.svg, so it has to exist as
// a real, matching file — this is the classic-fallback path.
//
// sharp can rasterise SVG to PNG but cannot write the .ico container
// itself, so this script composes one by hand. The format is simple: an
// ICONDIR header, one ICONDIRENTRY per frame, then the frames themselves
// — modern readers (every current browser, Windows Vista+) accept a raw
// PNG per frame instead of the legacy BMP DIB, which is what this writes.
//
// Run manually (`npm run favicon`); the output is committed, the same
// convention as `npm run art`.
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const SVG_PATH = "src/app/icon.svg";
const OUT_PATH = "public/favicon.ico";

const GROUND = { r: 0x08, g: 0x07, b: 0x0a, alpha: 1 };
const SIGNAL = { r: 0xf2, g: 0xed, b: 0xe3, alpha: 1 };

/**
 * The 16px frame is NOT a downscale of icon.svg. Rasterising a serif "R"
 * and a doubled hairline frame down to 16px anti-aliases both into grey
 * mush — a third value this palette doesn't have, and illegible besides.
 *
 * This is a purpose-drawn pixel version instead: a 1px frame one pixel
 * in from the edge, and a 5×7 pixel "R" centred in it, on the grid.
 * Built as a raw pixel buffer, not a rasterised vector, so there is no
 * fractional coverage anywhere — every pixel is exactly GROUND or
 * exactly SIGNAL, honouring the "two values, no third" rule literally.
 */
function build16pxFrame() {
  const SIZE = 16;
  const FRAME = { from: 1, to: 14 }; // inclusive edges of the 1px frame
  // The letter, row by row, top to bottom; `#` is a lit pixel.
  const R = ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"];
  const R_X = 5;
  const R_Y = 4;

  const pixels = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const onFrame =
        x >= FRAME.from &&
        x <= FRAME.to &&
        y >= FRAME.from &&
        y <= FRAME.to &&
        (x === FRAME.from || x === FRAME.to || y === FRAME.from || y === FRAME.to);
      const row = R[y - R_Y];
      const onLetter = row !== undefined && row[x - R_X] === "#";
      const c = onFrame || onLetter ? SIGNAL : GROUND;
      const off = (y * SIZE + x) * 4;
      pixels[off] = c.r;
      pixels[off + 1] = c.g;
      pixels[off + 2] = c.b;
      pixels[off + 3] = 255;
    }
  }

  return sharp(pixels, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .png()
    .toBuffer();
}

async function rasterise(size) {
  return sharp(SVG_PATH, { density: 96 * (size / 64) })
    .resize(size, size)
    .png()
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
  build16pxFrame(),
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
