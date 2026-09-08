/* Renders the exhibits and the cursor images onto a ground-coloured sheet
   so the metal can be judged at real size and enlarged. node preview.mjs */
import sharp from "sharp";
import { readFileSync } from "node:fs";
const files = [["exhibit-key.svg", 8], ["exhibit-padlock.svg", 8], ["exhibit-ibeam.svg", 8],
  ["lamplight-key.svg", 1], ["lamplight-padlock.svg", 1], ["lamplight-ibeam.svg", 1], ["lamplight-ibeam-small.svg", 1]];
const layers = []; let x = 24;
for (const [f, k] of files) {
  const buf = await sharp(Buffer.from(readFileSync(f, "utf8")), { density: 72 * k }).png().toBuffer();
  const m = await sharp(buf).metadata();
  layers.push({ input: buf, left: x, top: 24 });
  x += m.width + 32;
}
await sharp({ create: { width: x + 24, height: 840, channels: 4, background: "#08070A" } })
  .composite(layers).png().toFile("preview.png");
console.log("preview.png", x + 24);
