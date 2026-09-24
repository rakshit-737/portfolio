/**
 * The smallest WebGL2 kit the instrument and the atmosphere share: a
 * context gate that refuses software rasterisers (SwiftShader, llvmpipe,
 * WARP — a phone or a VM rendering a full-viewport shader on the CPU would
 * trip the lamp's frame-budget guard and cost the visitor the lamp
 * itself), shader compilation, and a few 4x4 matrix helpers. No
 * dependency: three.js is ~150 kB gzipped to draw three rings.
 */

export type Mat4 = Float32Array;

/** `?fx=gl` forces GL past the software check — for screenshots of the
 *  real render from a headless browser, never the default. */
function forced(): boolean {
  return typeof location !== "undefined" && /[?&]fx=gl\b/.test(location.search);
}

export function getGL(
  canvas: HTMLCanvasElement,
  attrs: WebGLContextAttributes = {},
): WebGL2RenderingContext | null {
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      powerPreference: "low-power",
      failIfMajorPerformanceCaveat: !forced(),
      ...attrs,
    });
  } catch {
    return null;
  }
  if (!gl) return null;
  if (!forced()) {
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    if (/swiftshader|llvmpipe|software|basic render|warp/i.test(renderer)) {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return null;
    }
  }
  return gl;
}

export function program(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram | null {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const p = gl.createProgram()!;
  const v = make(gl.VERTEX_SHADER, vs);
  const f = make(gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.warn(gl.getShaderInfoLog(v) || gl.getShaderInfoLog(f) || gl.getProgramInfoLog(p));
    return null;
  }
  gl.deleteShader(v);
  gl.deleteShader(f);
  return p;
}

export const mat = {
  identity(): Mat4 {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  },
  mul(a: Mat4, b: Mat4): Mat4 {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
      }
    return o;
  },
  perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
    const f = 1 / Math.tan(fovy / 2);
    const m = new Float32Array(16);
    m[0] = f / aspect;
    m[5] = f;
    m[10] = (far + near) / (near - far);
    m[11] = -1;
    m[14] = (2 * far * near) / (near - far);
    return m;
  },
  translate(x: number, y: number, z: number): Mat4 {
    const m = mat.identity();
    m[12] = x;
    m[13] = y;
    m[14] = z;
    return m;
  },
  rotX(a: number): Mat4 {
    const m = mat.identity();
    const c = Math.cos(a);
    const s = Math.sin(a);
    m[5] = c;
    m[6] = s;
    m[9] = -s;
    m[10] = c;
    return m;
  },
  rotY(a: number): Mat4 {
    const m = mat.identity();
    const c = Math.cos(a);
    const s = Math.sin(a);
    m[0] = c;
    m[2] = -s;
    m[8] = s;
    m[10] = c;
    return m;
  },
  rotZ(a: number): Mat4 {
    const m = mat.identity();
    const c = Math.cos(a);
    const s = Math.sin(a);
    m[0] = c;
    m[1] = s;
    m[4] = -s;
    m[5] = c;
    return m;
  },
  scale(k: number): Mat4 {
    const m = mat.identity();
    m[0] = m[5] = m[10] = k;
    return m;
  },
};

/** A critically-damped-ish spring on one number. */
export class Spring {
  v = 0;
  constructor(
    public x: number,
    public k = 0.08,
    public damp = 0.82,
  ) {}
  step(target: number): boolean {
    this.v = (this.v + (target - this.x) * this.k) * this.damp;
    this.x += this.v;
    return Math.abs(this.v) > 1e-4 || Math.abs(target - this.x) > 1e-3;
  }
}
