/* Regenerates every SVG and the CSS block from lamplight-cursor-art.js.
   node build.mjs — run after editing the artwork. */
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync("lamplight-cursor-art.js", "utf8"), ctx);
const A = ctx.window.LamplightCursorArt;

const out = (name, s) => { writeFileSync(name, s + "\n"); console.log(name, s.length); };

// Upright artwork for previews and docs.
out("exhibit-key.svg", A.svg(A.key("k"), A.KEY.w, A.KEY.h));
out("exhibit-padlock.svg", A.svg(A.padlock("p"), A.LOCK.w, A.LOCK.h));
out("exhibit-ibeam.svg", A.svg(A.ibeam("i", false), A.IBEAM.w, A.IBEAM.h));
out("exhibit-ibeam-small.svg", A.svg(A.ibeam("i", true), A.IBEAM.w, A.IBEAM.h));

// Cursor images at cursor size, with their hotspots printed.
for (const [name, c] of [
  ["lamplight-key.svg", A.cursorKey(40)],
  ["lamplight-padlock.svg", A.cursorPadlock(40)],
  ["lamplight-ibeam.svg", A.cursorIbeam(32, false)],
  ["lamplight-ibeam-small.svg", A.cursorIbeam(20, true)],
]) { out(name, c.svg); console.log("   hotspot", c.hx, c.hy); }

out("lamplight-cursors.css", A.css());
