/* Lamplight cursor artwork — one geometry, three artifacts.
   Three values only: ground #08070A, bone #F2EDE3, ember #E8A33D.
   "Aged metal" is bone at partial opacity over ground (a lighting
   variation, never a fourth colour); ember lives only in the gem.
   The "R" is MARK_PATH from src/lib/mark.ts — the seal monogram itself. */
window.LamplightCursorArt = window.LamplightCursorArt || (function () {
  const BONE = "#F2EDE3", GROUND = "#08070A", EMBER = "#E8A33D";
  const MARK_PATH =
    "M34.11 30.83Q36.62 30.83 38.49 29.81Q40.36 28.78 41.40 26.97Q42.44 25.17 42.44 22.85Q42.44 20.43 41.02 19.26Q39.60 18.09 36.26 18.09H30.91L31.25 17.00H37.43Q40.59 17.00 42.53 17.75Q44.47 18.50 45.38 19.82Q46.29 21.14 46.29 22.83Q46.29 25.31 44.99 27.23Q43.70 29.14 41.21 30.24Q38.73 31.35 35.13 31.46V31.41Q36.62 31.41 37.62 31.87Q38.62 32.33 39.30 33.26Q39.98 34.19 40.48 35.63L43.05 43.03Q43.57 44.49 43.92 45.15Q44.26 45.81 44.76 45.97Q45.27 46.14 46.21 46.14L45.98 46.87Q44.10 47.04 42.92 46.99Q41.73 46.94 41.01 46.56Q40.29 46.18 39.84 45.41Q39.40 44.64 38.98 43.36L36.51 35.76Q35.95 34.00 35.53 33.19Q35.11 32.38 34.65 32.15Q34.19 31.92 33.44 31.92H26.67L27.01 30.83ZM25.63 45.62 29.01 46.45 28.91 46.87H17.71L17.84 46.45L21.56 45.62L29.89 18.25L26.49 17.42L26.61 17.00H34.34Z";

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
      `<stop offset="0" stop-color="${BONE}" stop-opacity=".30"/>` +
      `<stop offset=".16" stop-color="${BONE}" stop-opacity=".62"/>` +
      `<stop offset=".31" stop-color="${BONE}" stop-opacity="1"/>` +
      `<stop offset=".44" stop-color="${BONE}" stop-opacity=".82"/>` +
      `<stop offset=".72" stop-color="${BONE}" stop-opacity=".50"/>` +
      `<stop offset="1" stop-color="${BONE}" stop-opacity=".26"/>` +
      `</linearGradient>` +
      // Rim: lit edge to shaded edge in one stroke, always diagonal so the
      // light stays upper-left whichever way the piece runs.
      `<linearGradient id="${p}e" class="lc-rim" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${BONE}" stop-opacity=".95"/>` +
      `<stop offset=".38" stop-color="${BONE}" stop-opacity=".22"/>` +
      `<stop offset=".56" stop-color="${GROUND}" stop-opacity=".35"/>` +
      `<stop offset="1" stop-color="${GROUND}" stop-opacity=".85"/>` +
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
  /* The seal's R, struck into the metal: a ground shadow cast down-right,
     the letter itself, then a hairline of bone on its lit edge. `halo`
     keeps it legible where it sits straight on a painting. */
  const monogram = (cx, cy, h, fill, halo) => {
    const k = (h / 30).toFixed(4), sw = (30 / h * (halo ? 1.5 : 0.5)).toFixed(2);
    const at = (dx, dy) => `transform="translate(${(cx + dx).toFixed(2)} ${(cy + dy).toFixed(2)}) scale(${k}) translate(-32 -32)"`;
    const d = MARK_PATH;
    return (fill === BONE ? `<path d="${d}" ${at(h * 0.045, h * 0.05)} fill="${GROUND}" opacity=".8"/>` : "") +
      `<path d="${d}" ${at(0, 0)} fill="${fill}"${halo ? ` stroke="${GROUND}" stroke-width="${sw}" paint-order="stroke" stroke-linejoin="round"` : ""}/>` +
      (fill === BONE ? `<path d="${d}" ${at(-h * 0.028, -h * 0.03)} fill="none" stroke="${BONE}" stroke-width="${(Number(sw) * 0.5).toFixed(2)}" opacity=".55"/>` : "");
  };

  /* THE KEY — 40×96, tip at (20,1), bow at the bottom. Cross-warded bit,
     lozenge engraving on the shaft, two moulded collars, a rosette bow
     (eight petals, eight trefoils) around the boss, the seal's R at the
     bow's lower right, the gem at its centre. */
  const KEY = { w: 40, h: 96, tip: [20, 1] };
  function key(p = "k") {
    const CX = 20, CY = 78, R = 15;                    // the bow's rose window
    // Tracery: eight mullions out of the boss, eight lancets between them,
    // a trefoil in every spandrel — a rose window, not a daisy.
    // One lancet: a pointed arch springing from the boss to the ring.
    const lancet = (cx, cy) => `M${cx - 1.8} ${cy - 5.9}L${cx - 1.6} ${cy - 10.3}Q${cx} ${cy - 13.4} ${cx + 1.6} ${cy - 10.3}L${cx + 1.8} ${cy - 5.9}Z`;
    let rose = "";
    for (let i = 0; i < 8; i++) {
      const t = `rotate(${i * 45} ${CX} ${CY})`;
      rose += `<path d="${lancet(CX, CY)}" transform="${t}" fill="${GROUND}" stroke="${GROUND}" stroke-width="2.2"/>`;
    }
    for (let i = 0; i < 8; i++) {
      const t = `rotate(${i * 45} ${CX} ${CY})`;
      rose += `<path d="${lancet(CX, CY)}" transform="${t}" fill="none" stroke="url(#${p}m)" stroke-width="1.15"/>`;
      // A small eye in the spandrel between two lancets.
      const u = `rotate(${22.5 + i * 45} ${CX} ${CY})`;
      rose += `<circle cx="${CX}" cy="${CY - 10.4}" r="1.35" transform="${u}" fill="${GROUND}" stroke="${GROUND}" stroke-width="1.6"/>`;
      rose += `<circle cx="${CX}" cy="${CY - 10.4}" r="1.35" transform="${u}" fill="none" stroke="${BONE}" stroke-width=".85" opacity=".92"/>`;
    }
    return defs(p, "h") +
      // Tip, shaft, and a cross-warded bit: two wards cut from the flag,
      // a stepped throat, the whole thing narrower than the bow.
      piece(p, "rect", 'x="18.2" y="1" width="3.6" height="5.4"') +
      piece(p, "rect", 'x="17.6" y="5" width="4.8" height="52"', "lc-shaft") +
      piece(p, "path", 'd="M22.4 8H31.6V11H28.6V13.4H31.6V16.6H28.2V19H31.6V22H22.4Z"') +
      // Lozenge engraving, struck: a shadow and a lit face, not a hole.
      `<g>` + [26, 34, 42].map((y) =>
        `<g transform="rotate(45 20 ${y + 1.1})"><rect x="18.8" y="${y - 0.1}" width="2.4" height="2.4" fill="${GROUND}" opacity=".9"/><rect x="19.1" y="${y + 0.2}" width="1.5" height="1.5" fill="${BONE}" opacity=".28"/></g>`).join("") + `</g>` +
      // Two moulded collars where the shaft meets the bow.
      piece(p, "rect", 'x="15.2" y="55.6" width="9.6" height="5"') +
      piece(p, "rect", 'x="16.6" y="60.8" width="6.8" height="3.4"') +
      // The bow: a seated ring, its hollow, the tracery, the boss.
      `<circle cx="${CX}" cy="${CY}" r="${R + 2.2}" fill="${GROUND}"/>` +
      stroked(p, "circle", `cx="${CX}" cy="${CY}" r="${R}"`, 3.4) +
      `<circle cx="${CX}" cy="${CY}" r="${R - 2.6}" fill="none" stroke="${GROUND}" stroke-width="1.1" opacity=".8"/>` +
      `<circle cx="${CX}" cy="${CY}" r="${R - 2.6}" fill="url(#${p}o)"/>` +
      rose +
      // The boss: a raised collar around the gem.
      piece(p, "circle", `cx="${CX}" cy="${CY}" r="5.2"`) +
      gem(p, CX, CY, 3.1) +
      monogram(CX + 0.4, CY + 8.4, 8.2, BONE, true);
  }

  /* THE PADLOCK — 40×48, keyhole at (20,31). Footed shackle, a riveted
     plate over a round body, a raised escutcheon with its own rivet, two
     scrolls, and the keyhole. No ember: a padlock is a graphic. */
  const LOCK = { w: 40, h: 48, hole: [20, 31] };
  function padlock(p = "p") {
    return defs(p, "h") +
      stroked(p, "path", 'd="M12 22V14A8 8 0 0 1 28 14V22"', 3.4, "lc-shackle") +
      piece(p, "rect", 'x="10" y="19" width="4" height="4.5"') +
      piece(p, "rect", 'x="26" y="19" width="4" height="4.5"') +
      piece(p, "path", 'd="M6 21H34V29A14 14 0 0 1 6 29Z"') +
      `<path d="M6.6 29H33.4" stroke="${GROUND}" stroke-width=".8" opacity=".7"/>` +
      `<g fill="${GROUND}" opacity=".85"><rect x="11.9" y="30.4" width="2.2" height="2.2" transform="rotate(45 13 31.5)"/><rect x="25.9" y="30.4" width="2.2" height="2.2" transform="rotate(45 27 31.5)"/></g>` +
      `<g fill="${BONE}" stroke="${GROUND}" stroke-width=".7"><circle cx="9" cy="24.6" r="1.25"/><circle cx="31" cy="24.6" r="1.25"/><circle cx="11.6" cy="36.4" r="1.05"/><circle cx="28.4" cy="36.4" r="1.05"/></g>` +
      piece(p, "rect", 'x="16.2" y="23" width="7.6" height="15.6"') +
      `<rect x="16.9" y="23.7" width="6.2" height="14.2" fill="none" stroke="${GROUND}" stroke-width=".5" opacity=".6"/>` +
      `<circle cx="20" cy="25.8" r="1" fill="${BONE}" stroke="${GROUND}" stroke-width=".7"/>` +
      // Two C-scrolls chased into the face, mirrored about the escutcheon.
      [1, -1].map((f) => `<g transform="translate(20 0) scale(${f} 1) translate(-20 0)">` +
        `<path d="M24.8 26.6Q30 27 30.3 31.4Q30.4 34.8 27.4 35.3Q25.7 35.5 25.7 33.9Q25.7 32.7 27.1 32.7" fill="none" stroke="${GROUND}" stroke-width="1.9" stroke-linecap="round"/>` +
        `<path d="M24.8 26.6Q30 27 30.3 31.4Q30.4 34.8 27.4 35.3Q25.7 35.5 25.7 33.9Q25.7 32.7 27.1 32.7" fill="none" stroke="${BONE}" stroke-width=".85" opacity=".85" stroke-linecap="round"/>` +
        `</g>`).join("") +
      `<g class="lc-hole" fill="${GROUND}" style="transition:fill 160ms"><circle cx="20" cy="30.6" r="1.9"/><path d="M18.7 31.6H21.3L22.2 37H17.8Z"/></g>`;
  }

  /* THE I-BEAM — 24×48, hotspot at its centre (12,24). A forged shaft
     with mirrored ward terminals, a cross-shaped boss carrying the gem and
     the seal's R. `small` drops the engraving and swaps the R for the
     seal's square so the silhouette survives 16–20px. */
  const IBEAM = { w: 24, h: 48, center: [12, 24] };
  function ibeam(p = "i", small = false) {
    const term =
      `<g id="${p}t">` +
      piece(p, "rect", 'x="4" y="3.8" width="16" height="2.6"') +
      piece(p, "rect", 'x="2.4" y="2" width="3.6" height="6.4"') +
      piece(p, "rect", 'x="18" y="2" width="3.6" height="6.4"') +
      piece(p, "rect", 'x="9.3" y="2" width="5.4" height="2.6"') +
      (small ? "" : `<g fill="${GROUND}" opacity=".85"><rect x="6.7" y="2.3" width="1.5" height="1.5"/><rect x="15.8" y="2.3" width="1.5" height="1.5"/><circle cx="4.2" cy="5.1" r=".55"/><circle cx="19.8" cy="5.1" r=".55"/></g>`) +
      `</g>`;
    return defs(p, "h") +
      piece(p, "rect", 'x="10.4" y="6" width="3.2" height="36"', "lc-shaft") +
      term + `<use href="#${p}t" transform="translate(0 48) scale(1 -1)"/>` +
      piece(p, "path", 'd="M9.4 17H14.6V19.8H17.2V27.6H14.6V30.4H9.4V27.6H6.8V19.8H9.4Z"') +
      gem(p, 12, 21.2, 1.8) +
      (small ? `<rect x="11" y="25.8" width="2" height="2" fill="${GROUND}"/>` : monogram(12, 27, 4.4, GROUND, false));
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

  return { BONE, GROUND, EMBER, MARK_PATH, KEY, LOCK, IBEAM, CLICKABLE, TEXT, key, padlock, ibeam, svg, dataUri, cursorKey, cursorPadlock, cursorIbeam, css };
})();
