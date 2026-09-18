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

/* The generated block in globals.css. The header comment there has always
   claimed `node build.mjs` regenerates it, but nothing here ever did —
   the block was pasted by hand. It is spliced now: everything from the
   generated-block marker through the close of the forced-colors media
   query is replaced, and the hand-written explanation above the marker
   is left untouched. */
const CSS_FILE = "../../src/app/globals.css";
const MARK = "/* Lamplight cursors — the key, the lock, and the mark that opens text.";
const css = readFileSync(CSS_FILE, "utf8");
const from = css.indexOf(MARK);
if (from < 0) throw new Error("generated-block marker not found in globals.css");
const fc = css.indexOf("@media (forced-colors: active) {", from);
if (fc < 0) throw new Error("forced-colors query not found after the cursor block");
let depth = 0, to = -1;
for (let i = css.indexOf("{", fc); i < css.length; i++) {
  if (css[i] === "{") depth++;
  else if (css[i] === "}" && --depth === 0) { to = i + 1; break; }
}
if (to < 0) throw new Error("forced-colors query is unbalanced");
writeFileSync(CSS_FILE, css.slice(0, from) + A.css().trimEnd() + css.slice(to));
console.log("globals.css cursor block rewritten");

// The three scripts the client loads are served from public/cursors/.
for (const f of ["lamplight-cursor-art.js", "lamplight-cursor-overlay.js", "lamplight-cursor-playful.js"])
  writeFileSync("../../public/cursors/" + f, readFileSync(f, "utf8"));
console.log("public/cursors synced");
