// Fetches the plate originals from Wikimedia Commons, crops them to the
// registry's crop box, and emits AVIF + WebP variants plus a tiny LQIP.
// Also emits narrow (portrait-crop) stills for plates that need them, and a
// scroll-scrubbed WebM for plates that carry a `motion` descriptor.
//
// Run manually (`npm run art`); the output is committed. CI never runs
// this — it runs check-art.mjs against the lockfile instead.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";

const { plates, PLATE_WIDTHS } = await import("../src/lib/art.ts");

const OUT = join("public", "art");
const UA = "rakshit-portfolio-art/1.0 (https://github.com/rakshit-737/portfolio)";
mkdirSync(OUT, { recursive: true });

/** Widths emitted for a plate's narrow (portrait) crop. A phone never
 *  needs more than 960px wide. */
const NARROW_WIDTHS = [640, 960];

/** Motion clip parameters. 4s at 25fps, VP9, no audio track — a slow drift
 *  over a still image, not a video in the ordinary sense. */
const MOTION_FPS = 25;
const MOTION_SECONDS = 4;
const MOTION_FRAMES = MOTION_FPS * MOTION_SECONDS;
const MOTION_BUDGET_BYTES = 250 * 1024;

/** Round to the nearest even integer — VP9's yuv420p needs even dimensions. */
const evenRound = (n) => Math.round(n / 2) * 2;

/** Builds a zoompan filter that linearly interpolates crop-relative centre
 *  (x, y) and zoom (scale) from `from` to `to` across `frames` output
 *  frames, driven by ffmpeg's own `on` (output frame index) variable —
 *  not accumulated per-frame state, so it is exactly reproducible. */
function zoompanFilter(from, to, frames, outW, outH) {
  const d1 = frames - 1;
  const zoom = `${from.scale}+(${to.scale}-${from.scale})*on/${d1}`;
  const x = `(${from.x}+(${to.x}-${from.x})*on/${d1})*iw-(iw/zoom/2)`;
  const y = `(${from.y}+(${to.y}-${from.y})*on/${d1})*ih-(ih/zoom/2)`;
  return `zoompan=z='${zoom}':x='${x}':y='${y}':d=${frames}:s=${outW}x${outH}:fps=${MOTION_FPS},format=yuv420p`;
}

/** Encodes a plate's motion descriptor to VP9/WebM. Starts at the spec's
 *  1600w/crf40 and, if the result exceeds the 250KB per-file ceiling, steps
 *  down resolution first and then quality — a slow drift over a still image
 *  should compress hard, so a large file means the encode is wrong, not
 *  that the budget is tight. */
async function encodeMotion(plate, sourceBuf, box) {
  const { motion } = plate;
  if (!motion) return null;

  // A clean, lossless PNG working source, wide enough that even the
  // tightest zoom (scale 1.12) never upscales.
  const workingWidth = 1920;
  const pngBuf = await sharp(sourceBuf).resize({ width: workingWidth }).png().toBuffer();
  const tmpIn = join(tmpdir(), `art-motion-src-${plate.id}-${process.pid}.png`);
  writeFileSync(tmpIn, pngBuf);

  const attempts = [
    { width: 1600, crf: 40 },
    { width: 1280, crf: 40 },
    { width: 1280, crf: 42 },
    { width: 1280, crf: 44 },
    { width: 1280, crf: 46 },
    { width: 1280, crf: 48 },
    { width: 1280, crf: 50 },
    { width: 1280, crf: 54 },
    { width: 960, crf: 46 },
    { width: 960, crf: 50 },
  ];

  let best = null;
  try {
    for (const attempt of attempts) {
      const outH = evenRound((box.height / box.width) * attempt.width);
      const filter = zoompanFilter(motion.from, motion.to, MOTION_FRAMES, attempt.width, outH);
      const tmpOut = join(tmpdir(), `art-motion-out-${plate.id}-${process.pid}.webm`);
      execFileSync(
        ffmpegPath,
        [
          "-y",
          "-loop", "1",
          "-i", tmpIn,
          "-vf", filter,
          "-frames:v", String(MOTION_FRAMES),
          "-c:v", "libvpx-vp9",
          "-crf", String(attempt.crf),
          "-b:v", "0",
          "-an",
          "-g", "25",
          "-tile-columns", "0",
          "-row-mt", "1",
          // VP9's default `-deadline best` is dramatically slower for no
          // visible gain on a 100-frame clip of a slow drift over a still
          // image — `good` + a cpu-used budget is the standard realtime-ish
          // tradeoff and is what keeps eight plates × up to ten fallback
          // attempts inside a sane wall-clock time.
          "-deadline", "good",
          "-cpu-used", "4",
          "-pix_fmt", "yuv420p",
          tmpOut,
        ],
        // A hard ceiling per attempt: a wedged ffmpeg process should fail
        // loudly, not hang the whole pipeline silently.
        { stdio: ["ignore", "ignore", "ignore"], timeout: 60_000 },
      );
      const buf = readFileSync(tmpOut);
      unlinkSync(tmpOut);
      console.log(
        `    motion attempt ${attempt.width}w crf${attempt.crf}: ${(buf.length / 1024).toFixed(0)} kB`,
      );
      best = { buf, width: attempt.width, height: outH };
      if (buf.length <= MOTION_BUDGET_BYTES) break;
    }
  } finally {
    unlinkSync(tmpIn);
  }

  if (!best || best.buf.length > MOTION_BUDGET_BYTES) {
    throw new Error(
      `${plate.id}: motion webm still ${((best?.buf.length ?? 0) / 1024).toFixed(0)}kB ` +
        `after every fallback — the encode is wrong, not the budget`,
    );
  }
  return best;
}

/** Commons Special:FilePath serves the original bytes for a File: name. */
const originalUrl = (file) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`;

const lock = {};

function record(name, buf, width, height) {
  writeFileSync(join(OUT, name), buf);
  lock[name] = {
    sha256: createHash("sha256").update(buf).digest("hex"),
    bytes: buf.length,
    width,
    height,
  };
  console.log(`  ${name}  ${(buf.length / 1024).toFixed(0)} kB`);
}

for (const plate of Object.values(plates)) {
  console.log(`${plate.id}: fetching`);
  const res = await fetch(originalUrl(plate.commonsFile), {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) {
    throw new Error(`${plate.id}: HTTP ${res.status} for ${plate.commonsFile}`);
  }
  const source = sharp(Buffer.from(await res.arrayBuffer()));
  const meta = await source.metadata();

  if (meta.width !== plate.native.w || meta.height !== plate.native.h) {
    throw new Error(
      `${plate.id}: source is ${meta.width}x${meta.height}, registry says ` +
        `${plate.native.w}x${plate.native.h} — update src/lib/art.ts`,
    );
  }

  const box = {
    left: Math.round(meta.width * plate.crop.x),
    top: Math.round(meta.height * plate.crop.y),
    width: Math.round(meta.width * plate.crop.w),
    height: Math.round(meta.height * plate.crop.h),
  };

  for (const width of PLATE_WIDTHS) {
    // Never upscale. A plate whose crop is narrower than a tier simply
    // does not get that tier.
    if (width > box.width) {
      console.log(`  skip ${width}w (crop is ${box.width}px wide)`);
      continue;
    }
    const base = sharp(await source.clone().extract(box).toBuffer()).resize({
      width,
    });
    const height = Math.round((box.height / box.width) * width);

    record(
      `${plate.id}-${width}.avif`,
      await base.clone().avif({ quality: 62, effort: 6 }).toBuffer(),
      width,
      height,
    );
    record(
      `${plate.id}-${width}.webp`,
      await base.clone().webp({ quality: 76 }).toBuffer(),
      width,
      height,
    );
  }

  // Narrow (portrait) crop, only for plates whose subject the landscape
  // crop cuts off on a phone. 640/960 only — a phone never needs more.
  if (plate.cropNarrow) {
    const nbox = {
      left: Math.round(meta.width * plate.cropNarrow.x),
      top: Math.round(meta.height * plate.cropNarrow.y),
      width: Math.round(meta.width * plate.cropNarrow.w),
      height: Math.round(meta.height * plate.cropNarrow.h),
    };
    const narrowBuf = await source.clone().extract(nbox).toBuffer();

    for (const width of NARROW_WIDTHS) {
      if (width > nbox.width) {
        console.log(`  skip narrow ${width}w (crop is ${nbox.width}px wide)`);
        continue;
      }
      const base = sharp(narrowBuf).resize({ width });
      const height = Math.round((nbox.height / nbox.width) * width);

      record(
        `${plate.id}-narrow-${width}.avif`,
        await base.clone().avif({ quality: 62, effort: 6 }).toBuffer(),
        width,
        height,
      );
      record(
        `${plate.id}-narrow-${width}.webp`,
        await base.clone().webp({ quality: 76 }).toBuffer(),
        width,
        height,
      );
    }
  }

  // 24px LQIP, inlined as a background while the real plate loads.
  const lqip = await sharp(await source.clone().extract(box).toBuffer())
    .resize({ width: 24 })
    .webp({ quality: 30 })
    .toBuffer();
  const uri = `data:image/webp;base64,${lqip.toString("base64")}`;
  if (uri.length > 400) {
    throw new Error(`${plate.id}: LQIP is ${uri.length} bytes, ceiling is 400`);
  }
  const lqipBuf = Buffer.from(uri, "utf8");
  record(`${plate.id}-lqip.txt`, lqipBuf, 24, 24);

  // Scroll-scrubbed motion, only for plates carrying a `motion` descriptor.
  if (plate.motion) {
    console.log(`  ${plate.id}: encoding motion`);
    const motion = await encodeMotion(plate, await source.clone().extract(box).toBuffer(), box);
    if (motion) {
      record(`${plate.id}-motion.webm`, motion.buf, motion.width, motion.height);
    }
  }
}

writeFileSync("src/lib/art.lock.json", JSON.stringify(lock, null, 2) + "\n");
console.log(`\nwrote src/lib/art.lock.json — ${Object.keys(lock).length} files`);
