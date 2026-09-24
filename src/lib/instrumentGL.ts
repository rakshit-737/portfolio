/**
 * The instrument's WebGL body — loaded only after the visitor's first
 * real movement (Experience.tsx, "the wake"), and only on a hardware GPU.
 *
 * A three-ring gimbal (a ship's-compass mounting) around a glass lens
 * whose core is the lamp's ember. It is LIT BY THE PAGE'S OWN LAMP: each
 * frame the light direction is the vector from the instrument to the
 * lamp's real pixel position in the current act, so when the lamp walks
 * down a painting, the instrument's highlights walk with it. The outer
 * ring follows the pointer's yaw, the middle ring its pitch, and the
 * inner ring turns with scroll. Bone metal on ground; ember only at the
 * lens core (the lamp's own core — DESIGN.md, Ember Is Rare).
 *
 * Renders on the lamp's tick (lampBus) — no loop of its own — and reports
 * busy only while its springs are still settling.
 */
import { getGL, mat, program, Spring, type Mat4 } from "@/lib/gl";
import { onLampFrame, wakeLamp, type LampFrame } from "@/lib/lampBus";

const VS = `#version 300 es
in vec3 aPos; in vec3 aNor;
uniform mat4 uProj, uView, uModel;
out vec3 vN; out vec3 vP; out vec3 vL;
void main(){
  vec4 wp = uView * uModel * vec4(aPos,1.0);
  vP = wp.xyz; vL = aPos;
  vN = mat3(uView * uModel) * aNor;
  gl_Position = uProj * wp;
}`;

const FS = `#version 300 es
precision highp float;
in vec3 vN; in vec3 vP; in vec3 vL;
uniform vec3 uLight; uniform float uKind; uniform float uTicks; uniform float uGlow; uniform float uLit;
out vec4 o;
const vec3 GROUND = vec3(0.031,0.027,0.039);
const vec3 BONE = vec3(0.949,0.929,0.890);
const vec3 EMBER = vec3(0.910,0.639,0.239);
void main(){
  vec3 n = normalize(vN); vec3 v = normalize(-vP); vec3 l = normalize(uLight);
  float d = max(dot(n,l),0.0);
  float s = pow(max(dot(reflect(-l,n),v),0.0), 36.0);
  float f = pow(1.0 - max(dot(n,v),0.0), 3.0);
  if (uKind < 0.5) {
    // Bone metal. Engraved ticks on rings that carry a scale.
    float a = atan(vL.y, vL.x) / 6.2831853 + 0.5;
    float tick = uTicks > 0.0 ? step(0.86, fract(a * uTicks)) * step(0.0, vL.z) : 0.0;
    float major = uTicks > 0.0 ? step(0.93, fract(a * uTicks / 5.0)) : 0.0;
    float k = 0.07 + uLit * (0.55 * d + 0.85 * s) + 0.22 * f;
    k *= 1.0 - 0.55 * max(tick, major);
    o = vec4(mix(GROUND, BONE, clamp(k,0.0,1.0)), 1.0);
  } else {
    // The lens: dark glass with a bone rim, the ember at its heart.
    float core = pow(max(dot(n,v),0.0), 7.0) * uGlow;
    vec3 c = GROUND + BONE * (0.55 * f + 0.9 * s * uLit) + EMBER * core;
    o = vec4(c, 1.0);
  }
}`;

function torus(R: number, r: number, seg = 120, side = 14) {
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const u = (i / seg) * Math.PI * 2;
    for (let j = 0; j <= side; j++) {
      const w = (j / side) * Math.PI * 2;
      const cx = Math.cos(u);
      const cy = Math.sin(u);
      const nx = Math.cos(w) * cx;
      const ny = Math.cos(w) * cy;
      const nz = Math.sin(w);
      pos.push((R + r * Math.cos(w)) * cx, (R + r * Math.cos(w)) * cy, r * nz);
      nor.push(nx, ny, nz);
    }
  }
  for (let i = 0; i < seg; i++)
    for (let j = 0; j < side; j++) {
      const a = i * (side + 1) + j;
      const b = a + side + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  return { pos, nor, idx };
}

function sphere(r: number, seg = 28, rings = 18) {
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const t = (i / rings) * Math.PI;
    for (let j = 0; j <= seg; j++) {
      const p = (j / seg) * Math.PI * 2;
      const x = Math.sin(t) * Math.cos(p);
      const y = Math.cos(t);
      const z = Math.sin(t) * Math.sin(p);
      pos.push(x * r, y * r, z * r);
      nor.push(x, y, z);
    }
  }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j;
      const b = a + seg + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  return { pos, nor, idx };
}

export interface InstrumentHandle {
  explode(on: boolean): void;
  frames(): number;
  destroy(): void;
}

export function mountInstrument(host: HTMLElement): InstrumentHandle | null {
  const canvas = document.createElement("canvas");
  canvas.className = "inst-gl";
  canvas.setAttribute("aria-hidden", "true");
  const gl = getGL(canvas);
  if (!gl) return null;
  const prog = program(gl, VS, FS);
  if (!prog) return null;
  host.appendChild(canvas);

  const loc = {
    pos: gl.getAttribLocation(prog, "aPos"),
    nor: gl.getAttribLocation(prog, "aNor"),
    proj: gl.getUniformLocation(prog, "uProj"),
    view: gl.getUniformLocation(prog, "uView"),
    model: gl.getUniformLocation(prog, "uModel"),
    light: gl.getUniformLocation(prog, "uLight"),
    kind: gl.getUniformLocation(prog, "uKind"),
    ticks: gl.getUniformLocation(prog, "uTicks"),
    glow: gl.getUniformLocation(prog, "uGlow"),
    lit: gl.getUniformLocation(prog, "uLit"),
  };

  const mesh = (g: { pos: number[]; nor: number[]; idx: number[] }) => {
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buf = (data: number[], at: number) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(at);
      gl.vertexAttribPointer(at, 3, gl.FLOAT, false, 0, 0);
    };
    buf(g.pos, loc.pos);
    buf(g.nor, loc.nor);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(g.idx), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, count: g.idx.length };
  };

  const outer = mesh(torus(1.0, 0.05));
  const middle = mesh(torus(0.8, 0.042));
  const inner = mesh(torus(0.62, 0.036));
  const lens = mesh(sphere(0.3));
  const pin = mesh(sphere(0.07, 12, 8));

  // Springs. A fast initial spin on the inner rings is the "spin-up" on
  // wake; it settles into the pointer's pose within about a second.
  const yaw = new Spring(0, 0.06, 0.86);
  const pitch = new Spring(0, 0.06, 0.86);
  const spin = new Spring(-Math.PI * 2.2, 0.035, 0.9);
  const burst = new Spring(1, 0.05, 0.85); // lens glow flare on wake
  const blow = new Spring(0, 0.06, 0.84); // exploded view
  let exploded = 0;
  let glowTarget = 0.55;
  let frames = 0;
  let tilt: { x: number; y: number } | null = null;
  let lost = false;

  const onOrient = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null) return;
    tilt = { x: Math.max(-1, Math.min(1, e.gamma / 35)), y: Math.max(-1, Math.min(1, (e.beta - 45) / 35)) };
  };
  // Device tilt only where no permission prompt is needed (Android);
  // iOS's requestPermission is never triggered from here.
  const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: unknown } | undefined;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse && DOE && typeof DOE.requestPermission !== "function") {
    window.addEventListener("deviceorientation", onOrient, { passive: true });
  }
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    lost = true;
    canvas.remove();
    host.removeAttribute("data-gl");
  });

  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 160;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(w * dpr);
  };
  size();
  window.addEventListener("resize", size, { passive: true });

  const draw = (f: LampFrame | null) => {
    if (lost) return false;
    frames++;
    const hr = host.getBoundingClientRect();
    const hx = hr.left + hr.width / 2;
    const hy = hr.top + hr.height / 2;

    // Pointer (or tilt) pose, and the lamp's direction.
    let px = 0;
    let py = 0;
    if (tilt) {
      px = tilt.x;
      py = tilt.y;
    } else if (f?.pointer.active) {
      px = f.pointer.x * 2 - 1;
      py = f.pointer.y * 2 - 1;
    }
    let lx = -0.4;
    let ly = 0.6;
    let lit = 0.55;
    if (f && f.acts.length) {
      // The most visible act owns the light.
      let best = f.acts[0];
      let bestA = -1;
      for (const a of f.acts) {
        const vis = Math.max(0, Math.min(f.vh, a.rect.bottom) - Math.max(0, a.rect.top));
        if (vis > bestA) {
          bestA = vis;
          best = a;
        }
      }
      const ax = best.rect.left + best.x * best.rect.width;
      const ay = best.rect.top + best.y * best.rect.height;
      const len = Math.hypot(ax - hx, ay - hy) || 1;
      lx = (ax - hx) / len;
      ly = -(ay - hy) / len;
      lit = 0.6 + 0.4 * Math.min(1, best.r / (len + 1));
    }
    const deep = document.documentElement.hasAttribute("data-deep");
    const scrollTurn = (window.scrollY / Math.max(1, document.body.scrollHeight)) * Math.PI * 4;

    let busy = false;
    busy = yaw.step(px * 0.55) || busy;
    busy = pitch.step(0.42 + py * 0.35) || busy;
    busy = spin.step(scrollTurn) || busy;
    busy = burst.step(0) || busy;
    busy = blow.step(exploded) || busy;

    const glow = glowTarget + burst.x * 0.9 + (deep ? 0.25 : 0);
    const e = blow.x;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.useProgram(prog);
    const proj = mat.perspective(0.52, 1, 0.1, 20);
    const view = mat.translate(0, 0, -5.4 - e * 1.6);
    gl.uniformMatrix4fv(loc.proj, false, proj);
    gl.uniformMatrix4fv(loc.view, false, view);
    gl.uniform3f(loc.light, lx * 0.9, ly * 0.9, 0.75);
    gl.uniform1f(loc.lit, lit);
    gl.uniform1f(loc.glow, glow);

    const base = mat.mul(mat.rotX(pitch.x), mat.rotY(yaw.x));
    const draw1 = (m: { vao: WebGLVertexArrayObject; count: number }, model: Mat4, kind: number, ticks: number) => {
      gl.uniformMatrix4fv(loc.model, false, model);
      gl.uniform1f(loc.kind, kind);
      gl.uniform1f(loc.ticks, ticks);
      gl.bindVertexArray(m.vao);
      gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_SHORT, 0);
    };
    // Outer ring: a vertical meridian carrying the 60-division scale.
    const mOuter = mat.mul(base, mat.mul(mat.translate(0, e * 0.5, 0), mat.rotY(Math.PI / 2)));
    draw1(outer, mOuter, 0, 60);
    // Middle ring: pivots on the outer ring's horizontal pins.
    const mMid = mat.mul(base, mat.mul(mat.rotX(Math.PI / 2 + pitch.x * 0.6), mat.rotZ(spin.x * 0.5)));
    draw1(middle, mMid, 0, 24);
    // Inner ring: turns with the page.
    const mIn = mat.mul(base, mat.mul(mat.translate(0, -e * 0.5, 0), mat.mul(mat.rotY(spin.x), mat.rotX(0.9))));
    draw1(inner, mIn, 0, 0);
    // Pins where the rings are mounted.
    for (const sx of [-1, 1]) {
      draw1(pin, mat.mul(base, mat.translate(sx * (0.9 + e * 0.4), 0, 0)), 0, 0);
    }
    // The lens holds still: it is the lamp, and the lamp faces you.
    draw1(lens, mat.mul(mat.translate(0, 0, e * 0.6), mat.rotY(yaw.x * 0.2)), 1, 0);
    gl.bindVertexArray(null);
    return busy;
  };

  draw(null);
  const off = onLampFrame(draw);
  return {
    explode(on) {
      exploded = on ? 1 : 0;
      glowTarget = on ? 0.9 : 0.55;
      wakeLamp();
    },
    frames: () => frames,
    destroy() {
      off();
      window.removeEventListener("resize", size);
      window.removeEventListener("deviceorientation", onOrient);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    },
  };
}
