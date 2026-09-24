/**
 * The atmosphere — raking light and air, inside the lamp's pool only.
 *
 * The paintings never move (owner ruling, 2026-08-20). Their depth comes
 * from light instead: this shader reads the painting's own luminance as a
 * height field (a canvas's impasto is where its highlights were loaded
 * thickest) and lights that surface from the lamp's real position, so
 * as the lamp walks down a plate the brushwork catches it — a conservator's
 * raking light. Dust motes hang in the same pool; they drift only while
 * the visitor moves (the air is disturbed) and hang still when the page is
 * idle, so the lamp's loop can still stop.
 *
 * One canvas, moved into whichever act is most visible: it is appended
 * INSIDE that act's `.plate`, after `.plate-lit` and before the plate's
 * `::after` dissolve (document order is paint order — AGENTS.md), so it
 * sits under the scrim and never touches text. `mix-blend-mode:
 * soft-light` against the painting; neutral outside the pool.
 */
import { getGL, program } from "@/lib/gl";
import { onLampFrame, type LampFrame } from "@/lib/lampBus";

const VS = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }`;

const FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uTex;
uniform vec2 uBox;      // plate box, css px
uniform vec2 uImgOff;   // rendered image offset inside the box, px
uniform vec2 uImgSize;  // rendered image size, px
uniform vec2 uTexel;    // 1 / texture size
uniform vec2 uLamp;     // lamp point in box px
uniform float uR;       // lamp radius px
uniform float uStrength;
uniform float uMotes;
uniform float uDrift;
float lum(vec2 uv){ return dot(texture(uTex, uv, 1.2).rgb, vec3(0.299,0.587,0.114)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
void main(){
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uBox;
  vec2 uv = (px - uImgOff) / uImgSize;
  float d = length(px - uLamp) / max(uR, 1.0);
  float pool = 1.0 - smoothstep(0.2, 1.0, d);
  if (pool <= 0.0) { o = vec4(0.0); return; }
  vec2 e = uTexel * 2.0;
  float hx = lum(uv + vec2(e.x,0.0)) - lum(uv - vec2(e.x,0.0));
  float hy = lum(uv + vec2(0.0,e.y)) - lum(uv - vec2(0.0,e.y));
  vec3 n = normalize(vec3(-hx * 5.0, hy * 5.0, 1.0));
  vec3 l = normalize(vec3(uLamp - px, uR * 0.35) * vec3(1.0,-1.0,1.0));
  float relief = dot(n, l) - l.z;               // 0 on a flat canvas
  float spec = pow(max(dot(reflect(-l, n), vec3(0,0,1)), 0.0), 28.0) * 0.25;
  float shade = (relief * 1.4 + spec) * uStrength;
  // Motes: one per 90px cell, hashed, drifting only with uDrift.
  float m = 0.0;
  if (uMotes > 0.0) {
    vec2 cell = floor(px / 90.0);
    for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
      vec2 c = cell + vec2(float(i), float(j));
      float h = hash(c);
      if (h > uMotes) continue;
      vec2 at = (c + vec2(hash(c+3.1), hash(c+7.7))) * 90.0
        + vec2(sin(uDrift*0.6 + h*40.0), cos(uDrift*0.45 + h*31.0)) * 26.0;
      float r = 0.5 + h * 0.8;
      m += smoothstep(r + 1.2, r * 0.3, length(px - at)) * (0.5 + 0.5 * sin(uDrift * 1.7 + h * 90.0));
    }
  }
  float v = clamp(0.5 + shade + m * 0.1, 0.0, 1.0);
  o = vec4(vec3(v) * pool, pool);
}`;

interface Tex {
  tex: WebGLTexture;
  w: number;
  h: number;
  used: number;
}

export interface AtmosphereHandle {
  destroy(): void;
}

export function mountAtmosphere(): AtmosphereHandle | null {
  const canvas = document.createElement("canvas");
  canvas.className = "atmosphere";
  canvas.setAttribute("aria-hidden", "true");
  const gl = getGL(canvas, { antialias: false });
  if (!gl) return null;
  const prog = program(gl, VS, FS);
  if (!prog) return null;

  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  const u = (n: string) => gl.getUniformLocation(prog, n);
  const U = {
    box: u("uBox"),
    off: u("uImgOff"),
    size: u("uImgSize"),
    texel: u("uTexel"),
    lamp: u("uLamp"),
    r: u("uR"),
    strength: u("uStrength"),
    motes: u("uMotes"),
    drift: u("uDrift"),
  };

  // At most three paintings resident on the GPU at once.
  const textures = new Map<string, Tex>();
  const loading = new Set<string>();
  let clock = 0;
  const load = (src: string) => {
    if (textures.has(src) || loading.has(src)) return;
    loading.add(src);
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    img
      .decode()
      .then(() => {
        loading.delete(src);
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        textures.set(src, { tex, w: img.naturalWidth, h: img.naturalHeight, used: clock });
        if (textures.size > 3) {
          let oldest: string | null = null;
          for (const [k, t] of textures) if (!oldest || t.used < textures.get(oldest)!.used) oldest = k;
          if (oldest && oldest !== src) {
            gl.deleteTexture(textures.get(oldest)!.tex);
            textures.delete(oldest);
          }
        }
      })
      .catch(() => loading.delete(src));
  };

  let drift = 0;
  let lastPointer = { x: -1, y: -1 };
  let lastScroll = window.scrollY;
  let fade = 0;
  let current: HTMLElement | null = null;

  const render = (f: LampFrame) => {
    clock++;
    if (!document.documentElement.getAttribute("data-lamp")) return false;
    // The act the reader is mostly looking at owns the canvas.
    let best: LampFrame["acts"][number] | null = null;
    let bestA = 0;
    for (const a of f.acts) {
      const vis = Math.max(0, Math.min(f.vh, a.rect.bottom) - Math.max(0, a.rect.top));
      if (vis > bestA) {
        bestA = vis;
        best = a;
      }
    }
    if (!best) return false;
    const plate = best.el.querySelector<HTMLElement>(".plate");
    const img = plate?.querySelector<HTMLImageElement>("img.plate-lit");
    if (!plate || !img || !img.currentSrc) return false;
    if (current !== plate) {
      current = plate;
      fade = 0;
      // After the lit layer, before ::after — paint order is document order.
      plate.appendChild(canvas);
    }
    const src = img.currentSrc;
    load(src);
    const t = textures.get(src);
    if (!t) return true; // decoding — keep the loop alive until it lands
    t.used = clock;

    const pr = plate.getBoundingClientRect();
    const deep = document.documentElement.hasAttribute("data-deep");
    const scale = Math.min(1, Math.sqrt(650_000 / Math.max(1, pr.width * pr.height)));
    const cw = Math.max(1, Math.round(pr.width * scale));
    const ch = Math.max(1, Math.round(pr.height * scale));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    // object-fit: cover + the plate's own object-position, in box px.
    const s = Math.max(pr.width / t.w, pr.height / t.h);
    const rw = t.w * s;
    const rh = t.h * s;
    const pos = getComputedStyle(img).objectPosition.split(" ").map((v) => parseFloat(v) / 100);
    const ox = (pr.width - rw) * (isNaN(pos[0]) ? 0.5 : pos[0]);
    const oy = (pr.height - rh) * (isNaN(pos[1]) ? 0.5 : pos[1]);

    // The lamp in plate px (the ledger's plate is sticky, so its box is
    // not the act's box — convert through the viewport).
    const lampX = best.rect.left + best.x * best.rect.width - pr.left;
    const lampY = best.rect.top + best.y * best.rect.height - pr.top;

    // Air moves when you move.
    const moved =
      Math.abs(f.pointer.x - lastPointer.x) + Math.abs(f.pointer.y - lastPointer.y) > 0.0005 ||
      Math.abs(window.scrollY - lastScroll) > 0.5;
    if (moved) drift += 0.016;
    lastPointer = { x: f.pointer.x, y: f.pointer.y };
    lastScroll = window.scrollY;
    if (deep) drift += 0.01;
    fade = Math.min(1, fade + 0.04);

    gl.viewport(0, 0, cw, ch);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.uniform2f(U.box, pr.width, pr.height);
    gl.uniform2f(U.off, ox, oy);
    gl.uniform2f(U.size, rw, rh);
    gl.uniform2f(U.texel, 1 / t.w, 1 / t.h);
    gl.uniform2f(U.lamp, lampX, lampY);
    gl.uniform1f(U.r, best.r);
    gl.uniform1f(U.strength, (deep ? 0.34 : 0.2) * fade);
    gl.uniform1f(U.motes, (deep ? 0.3 : 0.12) * fade);
    gl.uniform1f(U.drift, drift);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
    return fade < 1;
  };

  const off = onLampFrame(render);
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    off();
    canvas.remove();
  });
  return {
    destroy() {
      off();
      for (const t of textures.values()) gl.deleteTexture(t.tex);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    },
  };
}
