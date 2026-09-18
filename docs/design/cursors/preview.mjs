/* Renders the exhibits and the cursor images onto a ground-coloured sheet
   so the metal can be judged at real size and enlarged.
   node docs/design/cursors/preview.mjs (paths resolve from this file). */
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = (f) => join(dirname(fileURLToPath(import.meta.url)), f);
const files = [["exhibit-key.svg", 8], ["exhibit-padlock.svg", 8], ["exhibit-ibeam.svg", 8],
  ["lamplight-key.svg", 1], ["lamplight-padlock.svg", 1], ["lamplight-ibeam.svg", 1], ["lamplight-ibeam-small.svg", 1]];
const layers = []; let x = 24;
for (const [f, k] of files) {
  const buf = await sharp(Buffer.from(readFileSync(here(f), "utf8")), { density: 72 * k }).png().toBuffer();
  const m = await sharp(buf).metadata();
  layers.push({ input: buf, left: x, top: 24 });
  x += m.width + 32;
}
await sharp({ create: { width: x + 24, height: 840, channels: 4, background: "#08070A" } })
  .composite(layers).png().toFile(here("preview.png"));
console.log("preview.png", x + 24);
