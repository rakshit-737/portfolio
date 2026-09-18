/* Lamplight cursor artwork — one geometry, three artifacts.
   Three values only: ground #08070A, bone #F2EDE3, ember #E8A33D.
   "Aged metal" is bone at partial opacity over ground (a lighting
   variation, never a fourth colour); ember lives only in the gem.

   Everything here is drawn to be read at 32-40px, which is the whole
   constraint: the bow is about fourteen screen pixels across and the
   beam sixteen wide. Detail finer than that does not shrink, it silts
   up — the first cut of these carried rose-window tracery, chased
   scrollwork and the seal's R, and all three averaged into grey. Any
   ornament added back has to survive a 1x render on the ground colour
   before it ships. */
window.LamplightCursorArt = window.LamplightCursorArt || (function () {
  const BONE = "#F2EDE3", GROUND = "#08070A", EMBER = "#E8A33D";
  /* The metal. One light, upper-left — the lamp. Every facet gets the same
     four passes, which is what makes flat vectors read as forged iron:
     a ground halo (legibility over a painting, and the seam where two
     pieces meet), the body in a bevel gradient, a rim that is bone on the
     lit edge and ground on the shaded one, and a narrow specular streak.
     Still three values: "metal" is bone at fractional alpha over ground. */
  const defs = (p, dir) => {
    const ax = dir === "v" ? 'x1="0" y1="0" x2="0" y2="1"' : dir === "d" ? 'x1="0" y1="0" x2="1" y2="1"' : 'x1="0" y1="0" x2="1" y2="0"';
    return `<defs>` +
      // Body: shadowed edge, a bright band a third in, a slow fall to the
      // far edge — a cylinder, not a plate.
      `<linearGradient id="${p}m" class="lc-metal" ${ax}>` +
      `<stop offset="0" stop-color="${BONE}" stop-opacity=".54"/>` +
      `<stop offset=".16" stop-color="${BONE}" stop-opacity=".80"/>` +
      `<stop offset=".31" stop-color="${BONE}" stop-opacity="1"/>` +
      `<stop offset=".44" stop-color="${BONE}" stop-opacity=".94"/>` +
      `<stop offset=".72" stop-color="${BONE}" stop-opacity=".72"/>` +
      `<stop offset="1" stop-color="${BONE}" stop-opacity=".50"/>` +
      `</linearGradient>` +
      // Rim: lit edge to shaded edge in one stroke, always diagonal so the
      // light stays upper-left whichever way the piece runs.
      `<linearGradient id="${p}e" class="lc-rim" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${BONE}" stop-opacity=".95"/>` +
      `<stop offset=".38" stop-color="${BONE}" stop-opacity=".34"/>` +
      `<stop offset=".62" stop-color="${GROUND}" stop-opacity=".30"/>` +
      `<stop offset="1" stop-color="${GROUND}" stop-opacity=".70"/>` +
      `</linearGradient>` +
      // Specular: a narrow travelling glint, laid over the body.
      `<linearGradient id="${p}s" class="lc-spec" ${ax}>` +
      `<stop offset=".18" stop-color="${BONE}" stop-opacity="0"/>` +
      `<stop offset=".29" stop-color="${BONE}" stop-opacity=".85"/>` +
      `<stop offset=".38" stop-color="${BONE}" stop-opacity="0"/>` +
      `</linearGradient>` +
      // Occlusion: the hollow under a raised disc or a bow.
      `<radialGradient id="${p}o" cx=".5" cy=".5" r=".5">` +
      `<stop offset=".55" stop-color="${GROUND}" stop-opacity="0"/>` +
      `<stop offset="1" stop-color="${GROUND}" stop-opacity=".7"/>` +
      `</radialGradient>` +
      // The gem: a lit dome — bone spark, ember body, ember rim in shadow.
      `<radialGradient id="${p}g" cx=".36" cy=".30" r=".82">` +
      `<stop offset="0" stop-color="${BONE}" stop-opacity=".95"/>` +
      `<stop offset=".18" stop-color="${EMBER}"/>` +
      `<stop offset=".62" stop-color="${EMBER}" stop-opacity=".92"/>` +
      `<stop offset=".88" stop-color="${EMBER}" stop-opacity=".55"/>` +
      `<stop offset="1" stop-color="${GROUND}" stop-opacity=".55"/>` +
      `</radialGradient>` +
      `</defs>`;
  };
  /* A forged piece: halo, body, rim, glint. `flat` drops the glint for the
     small engraved facets, where a streak would only read as noise. */
  const piece = (p, tag, attrs, cls, flat) => `<g${cls ? ` class="${cls}"` : ""}>` +
    `<${tag} ${attrs} fill="${GROUND}" stroke="${GROUND}" stroke-width="2.2" stroke-linejoin="miter"/>` +
    `<${tag} ${attrs} fill="url(#${p}m)"/>` +
    `<${tag} ${attrs} fill="none" stroke="url(#${p}e)" stroke-width=".9"/>` +
    (flat ? "" : `<${tag} ${attrs} fill="url(#${p}s)"/>`) +
    `</g>`;
  const stroked = (p, tag, attrs, w, cls) => `<g${cls ? ` class="${cls}"` : ""}>` +
    `<${tag} ${attrs} fill="none" stroke="${GROUND}" stroke-width="${w + 2.2}" stroke-linecap="square"/>` +
    `<${tag} ${attrs} fill="none" stroke="url(#${p}m)" stroke-width="${w}" stroke-linecap="square"/>` +
    `<${tag} ${attrs} fill="none" stroke="url(#${p}e)" stroke-width="${(w * 0.34).toFixed(2)}" stroke-linecap="square" opacity=".8"/>` +
    `</g>`;
  /* The gem sits in a bezel: a shadowed seat, a claw ring lit upper-left,
     the dome, its spark, and the light it throws back onto the bezel. */
  const gem = (p, cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${(r + 1.5).toFixed(2)}" fill="${GROUND}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${(r + 0.9).toFixed(2)}" fill="none" stroke="${BONE}" stroke-width="${(r * 0.34).toFixed(2)}" opacity=".9"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${(r + 0.9).toFixed(2)}" fill="none" stroke="url(#${p}e)" stroke-width="${(r * 0.34).toFixed(2)}"/>` +
    `<circle class="lc-gem" cx="${cx}" cy="${cy}" r="${r}" fill="url(#${p}g)"/>` +
    `<circle cx="${(cx - r * 0.34).toFixed(2)}" cy="${(cy - r * 0.34).toFixed(2)}" r="${(r * 0.24).toFixed(2)}" fill="${BONE}" opacity=".95"/>` +
    `<circle cx="${(cx + r * 0.42).toFixed(2)}" cy="${(cy + r * 0.44).toFixed(2)}" r="${(r * 0.13).toFixed(2)}" fill="${EMBER}" opacity=".8"/>`;
  /* THE KEY — 40×96, tip at (20,1), bow at the bottom. Cross-warded bit,
     lozenge engraving on the shaft, two moulded collars, a rosette bow
     (eight petals, eight trefoils) around the boss, the seal's R at the
     bow's lower right, the gem at its centre. */
  const KEY = { w: 40, h: 96, tip: [20, 1] };
  function key(p = "k") {
    const CX = 20, CY = 78, R = 15;                    // the bow's rose window
    // Four openings pierced through the bow, on the diagonals so they
    // never collide with the shaft. Each is a hole first — ground, with
    // one lit edge — because a hole is the only tracery that reads here.
    let rose = "";
    for (let i = 0; i < 4; i++) {
      const t = `rotate(${45 + i * 90} ${CX} ${CY})`;
      rose += `<g transform="${t}">` +
        `<circle cx="${CX}" cy="${CY - 9}" r="2.4" fill="${GROUND}"/>` +
        `<circle cx="${CX}" cy="${CY - 9}" r="2.4" fill="none" stroke="url(#${p}e)" stroke-width=".9"/>` +
        `</g>`;
    }
    return defs(p, "h") +
      // Tip, shaft, and a cross-warded bit: two wards cut from the flag,
      // a stepped throat, the whole thing narrower than the bow.
      piece(p, "rect", 'x="17.8" y="1" width="4.4" height="5.4"') +
      piece(p, "rect", 'x="17" y="5" width="6" height="52"', "lc-shaft") +
      piece(p, "path", 'd="M23 8H33V12.4H28.6V15.6H33V20H28.6V23.4H33V27.8H23Z"') +
      // Lozenge engraving, struck: a shadow and a lit face, not a hole.
      `<g>` + [34, 43].map((y) =>
        `<g transform="rotate(45 20 ${y + 1.5})"><rect x="18.4" y="${y - 0.3}" width="3.2" height="3.2" fill="${GROUND}" opacity=".9"/><rect x="18.9" y="${y + 0.2}" width="2.2" height="2.2" fill="${BONE}" opacity=".34"/></g>`).join("") + `</g>` +
      // Two moulded collars where the shaft meets the bow.
      piece(p, "rect", 'x="14.4" y="55.4" width="11.2" height="5.6"') +
      piece(p, "rect", 'x="16.2" y="61.4" width="7.6" height="3.4"') +
      // The bow: a seated ring, its hollow, the tracery, the boss.
      `<circle cx="${CX}" cy="${CY}" r="${R + 2.2}" fill="${GROUND}"/>` +
      stroked(p, "circle", `cx="${CX}" cy="${CY}" r="${R}"`, 3.4) +
      `<circle cx="${CX}" cy="${CY}" r="${R - 2.6}" fill="none" stroke="${GROUND}" stroke-width="1"/>` +
      rose +
      // The boss: a raised collar around the gem.
      piece(p, "circle", `cx="${CX}" cy="${CY}" r="6"`) +
      gem(p, CX, CY, 4);
  }

  /* THE PADLOCK — 40×48, keyhole at (20,31). Footed shackle, a riveted
     plate over a round body, a raised escutcheon with its own rivet, two
     scrolls, and the keyhole. No ember: a padlock is a graphic. */
  const LOCK = { w: 40, h: 48, hole: [20, 31] };
  function padlock(p = "p") {
    return defs(p, "h") +
      stroked(p, "path", 'd="M12 21V12.5A8 8 0 0 1 28 12.5V21"', 4, "lc-shackle") +
      piece(p, "rect", 'x="9.6" y="18" width="4.8" height="5"') +
      piece(p, "rect", 'x="25.6" y="18" width="4.8" height="5"') +
      piece(p, "path", 'd="M5 20.5H35V29A15 15 0 0 1 5 29Z"') +
      `<path d="M5.6 29H34.4" stroke="${GROUND}" stroke-width=".9" opacity=".55"/>` +
      // Two rivets, big enough to resolve, and nothing else on the face.
      `<g fill="${BONE}" stroke="${GROUND}" stroke-width=".8" opacity=".9"><circle cx="9.4" cy="25.4" r="1.5"/><circle cx="30.6" cy="25.4" r="1.5"/></g>` +
      // The keyhole, seated in a shadow so it reads as cut, not printed.
      `<circle cx="20" cy="31" r="4.6" fill="url(#${p}o)"/>` +
      `<g class="lc-hole" fill="${GROUND}" style="transition:fill 160ms"><circle cx="20" cy="30" r="3"/><path d="M17.9 31.4H22.1L23.4 38.4H16.6Z"/></g>` +
      `<g fill="none" stroke="${BONE}" stroke-width=".7" opacity=".5"><circle cx="20" cy="30" r="3.9"/></g>`;
  }

  /* THE I-BEAM — 24×48, hotspot at its centre (12,24). A forged shaft
     with mirrored ward terminals, a cross-shaped boss carrying the gem and
     the seal's R. `small` drops the engraving and swaps the R for the
     seal's square so the silhouette survives 16–20px. */
  const IBEAM = { w: 24, h: 48, center: [12, 24] };
  function ibeam(p = "i", small = false) {
    // One serif cap: a bar with two small feet turned down towards the
    // shaft, which is what makes a caret read as struck metal.
    const term =
      `<g id="${p}t">` +
      piece(p, "rect", 'x="5.2" y="2.4" width="13.6" height="3.4"') +
      piece(p, "rect", 'x="5.2" y="5.2" width="2.8" height="3"') +
      piece(p, "rect", 'x="16" y="5.2" width="2.8" height="3"') +
      `</g>`;
    return defs(p, "h") +
      piece(p, "rect", 'x="9.2" y="4.4" width="5.6" height="39.2"', "lc-shaft") +
      term + `<use href="#${p}t" transform="translate(0 48) scale(1 -1)"/>` +
      gem(p, 12, 24, small ? 1.7 : 2.1);
  }

  const svg = (inner, w, h, attrs = "") => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ${attrs}>${inner}</svg>`;
  const dataUri = (s) => `url("data:image/svg+xml,${encodeURIComponent(s).replace(/%20/g, " ").replace(/%22/g, "'")}")`;

  /* Cursor images — the key rotated 45° so its tip points up-left like a
     pointer; hotspots are the tip, the keyhole, and the beam's centre. */
  function cursorKey(height = 40) {
    const s = height / KEY.h, a = -Math.PI / 4, c = Math.cos(a), si = Math.sin(a);
    const rot = ([x, y]) => [x * s * c - y * s * si, x * s * si + y * s * c];
    const pts = [[0, 0], [KEY.w, 0], [0, KEY.h], [KEY.w, KEY.h]].map(rot);
    const minX = Math.min(...pts.map((q) => q[0])), minY = Math.min(...pts.map((q) => q[1]));
    const w = Math.ceil(Math.max(...pts.map((q) => q[0])) - minX + 2), h = Math.ceil(Math.max(...pts.map((q) => q[1])) - minY + 2);
    const tip = rot(KEY.tip);
    const inner = `<g transform="translate(${(1 - minX).toFixed(2)} ${(1 - minY).toFixed(2)}) rotate(-45) scale(${s.toFixed(4)})">${key("k")}</g>`;
    return { svg: svg(inner, w, h), w, h, hx: Math.round(tip[0] - minX + 1), hy: Math.round(tip[1] - minY + 1) };
  }
  function cursorPadlock(height = 40) {
    const s = height / LOCK.h, w = Math.ceil(LOCK.w * s), h = Math.ceil(LOCK.h * s);
    return { svg: svg(`<g transform="scale(${s.toFixed(4)})">${padlock("p")}</g>`, w, h), w, h, hx: Math.round(LOCK.hole[0] * s), hy: Math.round(LOCK.hole[1] * s) };
  }
  function cursorIbeam(height = 32, small = height < 28) {
    const s = height / IBEAM.h, w = Math.ceil(IBEAM.w * s), h = Math.ceil(IBEAM.h * s);
    return { svg: svg(`<g transform="scale(${s.toFixed(4)})">${ibeam("i", small)}</g>`, w, h), w, h, hx: Math.round(IBEAM.center[0] * s), hy: Math.round(IBEAM.center[1] * s) };
  }

  const CLICKABLE = 'a, button, [role="button"], [role="option"], summary, select, label[for], input[type="checkbox"], input[type="radio"], input[type="range"], [data-lock]';
  const TEXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, [contenteditable="true"], p, li, blockquote, dd, .statement, .prose-field, [data-text]';

  /* The static CSS block — a drop-in replacement for the "key and the
     lock" block at the end of globals.css. Same media gates, same
     selector lists, with the I-beam added to the text list. */
  function css() {
    const k = cursorKey(40), l = cursorPadlock(40), i = cursorIbeam(32, false);
    return `/* Lamplight cursors — the key, the lock, and the mark that opens text.
   Generated from cursors/lamplight-cursor-art.js. Fine pointers only;
   native fallbacks declared after every image. */
@media (pointer: fine) and (hover: hover) {
  html {
    cursor: ${dataUri(k.svg)} ${k.hx} ${k.hy}, auto;
  }
  ${CLICKABLE} {
    cursor: ${dataUri(l.svg)} ${l.hx} ${l.hy}, pointer;
  }
  ${TEXT} {
    cursor: ${dataUri(i.svg)} ${i.hx} ${i.hy}, text;
  }
}
@media (forced-colors: active) {
  html { cursor: auto; }
  ${CLICKABLE} { cursor: auto; }
  ${TEXT} { cursor: auto; }
}
`;
  }

  return { BONE, GROUND, EMBER, KEY, LOCK, IBEAM, CLICKABLE, TEXT, key, padlock, ibeam, svg, dataUri, cursorKey, cursorPadlock, cursorIbeam, css };
})();
