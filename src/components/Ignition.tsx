"use client";

import { useEffect, useRef } from "react";
import { experience } from "@/content";
import {
  decodeImage,
  selectedImageSource,
  startPlateWarmup,
  waitForOpeningFonts,
  type AssetResult,
} from "@/lib/asset-readiness";
import { INTRO_CLAIM_EVENT, INTRO_OPEN_EVENT, getTier, subscribeFx } from "@/lib/fx";

const PHASES = ["ember", "kindle", "label", "lit", "open", "done"] as const;
type Phase = (typeof PHASES)[number];
type Readiness = "ready" | "degraded" | "timed-out" | "skipped";

/** Dispatched once the archive is lit and the veil is gone. */
export const IGNITED_EVENT = "lamplight:ignited";

const DIAL_TICKS = Array.from({ length: 72 }, (_, i) => i);

/**
 * The ignition — "the website wasn't loaded, it was illuminated".
 *
 * Server-rendered, so it exists at first paint; shown only when the head
 * boot script (src/lib/fx.ts) set `data-intro` on <html> — full on every
 * index load, brief on a case file, absent under reduced motion, forced
 * colours or automation (unless forced with ?ignite). A dark veil holds a single
 * ember at the lamp's rest point; it opens outward from that point,
 * revealing the painting, then the name (the hero's real h1, held by
 * `data-intro-hold` until now), then the nav, which sits farthest from
 * the light. The calibration dial flies to the corner instrument and
 * becomes it.
 *
 * Progress is only ever real: hydration extends the crosshair and prints
 * the ember's measured coordinates; the opening font faces and both rendered
 * plate layers must settle before the veil reaches the painting. A small,
 * controlled warm-up starts for the other committed plates while this beat
 * plays, but it is not part of the hero's success result. A slow network is
 * capped with an explicit degraded state, never silently called ready. Any
 * scroll, key or press skips straight to the open. The veil never takes input
 * (`pointer-events: none`), is `aria-hidden`, and the boot script's own
 * degraded failsafe removes it even if this component never runs.
 */
export default function Ignition({
  target,
  credit,
  lamp,
  name,
}: {
  /** The record's name — shown as the archive's title card, as generated
   *  content, so the hero's h1 stays the only copy in the text. */
  name: string;
  /** Where the light is: the hero act's lamp, or a case file's plate. */
  target: "hero" | "case";
  /** The plate's credit line — the provenance notation under the index. */
  credit: string;
  /** The plate's lamp rest point (fractions of the frame), for first paint. */
  lamp: { x: number; y: number };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const coord = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    const mode = root.getAttribute("data-intro");
    if (!el || !mode || root.getAttribute("data-intro-phase") === "done") return;
    const full = mode === "full";
    let cancelled = false;
    let current = 0;
    // Each beat has a floor in full mode (owner, 2026-09-24: "too
    // fast"): a real event can only advance the sequence once its beat
    // has had time to read. Readiness still gates it — a slow network
    // waits for the real piece, a fast one waits for the beat.
    const t0 = performance.now();
    const FLOOR: Partial<Record<Phase, number>> = full
      ? { kindle: 500, label: 1500, lit: 2700 }
      : {};
    let opened = false;
    let assetsReady = false;
    const pending: number[] = [];
    const isTerminal = () => root.getAttribute("data-intro-phase") === "done";
    const phase = (p: Phase) => {
      if (cancelled || isTerminal()) return false;
      if (p === "lit" && !assetsReady) return false;
      const i = PHASES.indexOf(p);
      if (i <= current) return false;
      const wait = (FLOOR[p] ?? 0) - (performance.now() - t0);
      if (wait > 0 && p !== "open" && p !== "done") {
        pending.push(window.setTimeout(() => phase(p), wait));
        return false;
      }
      current = i;
      root.setAttribute("data-intro-phase", p);
      return true;
    };

    // Measure the real lamp point (Lamp.tsx's own rest formula).
    const narrow = window.matchMedia("(max-width: 48rem)").matches;
    let px = window.innerWidth / 2;
    let py = window.innerHeight / 2;
    const act = document.getElementById("hero");
    const plate = (act ?? document).querySelector<HTMLElement>(".plate");
    if (target === "hero" && act) {
      const r = act.getBoundingClientRect();
      const x = narrow ? lamp.x : Math.max(0.52, lamp.x);
      const y = narrow ? Math.min(0.38, lamp.y) : lamp.y;
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (r.height + vh)));
      px = r.left + x * r.width;
      py = r.top + (y - 0.22 + p * 0.44) * r.height;
    } else if (plate) {
      const r = plate.getBoundingClientRect();
      px = r.left + r.width / 2;
      py = r.top + r.height / 2;
    }
    el.style.setProperty("--ig-x", `${px.toFixed(1)}px`);
    el.style.setProperty("--ig-y", `${py.toFixed(1)}px`);
    if (coord.current) {
      coord.current.textContent = `x ${(px / window.innerWidth).toFixed(3)} · y ${(py / window.innerHeight).toFixed(3)}`;
    }
    phase("kindle");

    const start = performance.now();
    const minBeat = full ? 4000 : 0;
    const cap = full ? 5000 : 900;
    const timers: number[] = [];
    let openingTimer: number | undefined;
    let generation = 0;
    let gate: AbortController | undefined;
    let frame = 0;
    let paintFrame = 0;
    let sources = new Map<HTMLImageElement, string>();
    root.setAttribute("data-intro-assets", "pending");
    root.setAttribute("data-intro-fonts", "pending");

    // The two layers are distinct rendered elements even though the browser
    // normally coalesces their request for the same selected URL. Decode both
    // elements, and include the small brand seal visible in the first
    // viewport. No below-fold screenshot/certificate asset enters this gate.
    const requiredLayers = Array.from(
      plate?.querySelectorAll<HTMLImageElement>("img.plate-dark, img.plate-lit") ?? [],
    );
    const requiredImages = [...new Set([
      ...requiredLayers,
      ...document.querySelectorAll<HTMLImageElement>("header img"),
    ])];

    // Only after the hero's critical image work has settled, warm the seven
    // remaining plates in order, one pair at a time at low priority. The real
    // pictures choose crop/format/width; no URL probe or certificate enters it.
    let warmup: ReturnType<typeof startPlateWarmup> | undefined;
    const warmRemainingPlates = () => {
      if (cancelled || warmup || target !== "hero") return;
      const remainingPlates = Array.from(
        document.querySelectorAll<HTMLImageElement>("[data-plate] img.plate-lit"),
      ).filter((image) => !image.closest("#hero"));
      if (remainingPlates.length > 0) {
        root.setAttribute("data-plate-warmup", "warming");
        warmup = startPlateWarmup(remainingPlates, (status) => {
          if (!cancelled && status !== "warming") {
            root.setAttribute(
              "data-plate-warmup",
              status === "ready" ? "ready" : "degraded",
            );
          }
        });
      } else {
        root.setAttribute("data-plate-warmup", "ready");
      }
    };

    const open = (fast: boolean, readiness: Readiness) => {
      if (cancelled || opened || isTerminal()) return;
      opened = true;
      if (readiness === "timed-out") root.setAttribute("data-intro-assets", "timed-out");
      if (!root.hasAttribute("data-intro-readiness")) {
        root.setAttribute("data-intro-readiness", readiness);
      }
      // The dial flies to the instrument and becomes it.
      const inst = document.querySelector<HTMLElement>("[data-instrument]");
      const dial = el.querySelector<SVGElement>(".ig-dial");
      if (inst && dial) {
        const a = dial.getBoundingClientRect();
        const b = inst.getBoundingClientRect();
        el.style.setProperty("--fly-x", `${(b.left + b.width / 2 - (a.left + a.width / 2)).toFixed(1)}px`);
        el.style.setProperty("--fly-y", `${(b.top + b.height / 2 - (a.top + a.height / 2)).toFixed(1)}px`);
        el.style.setProperty("--fly-s", (b.width / Math.max(1, a.width)).toFixed(3));
      }
      if (fast) root.setAttribute("data-intro-fast", "");
      root.removeAttribute("data-intro-hold");
      phase("open");
      // The boot watchdog no longer owns a hydrated, committed handoff.
      window.dispatchEvent(new Event(INTRO_OPEN_EVENT));
      const dur = fast ? 500 : full ? 2200 : 700;
      timers.push(
        window.setTimeout(() => {
          if (cancelled || isTerminal()) {
            root.removeAttribute("data-intro-fast");
            return;
          }
          const completed = phase("done");
          root.removeAttribute("data-intro-fast");
          if (completed) window.dispatchEvent(new Event(IGNITED_EVENT));
        }, dur),
      );
    };
    const sourcesMatch = () => requiredImages.every(
      (image) => sources.get(image) === selectedImageSource(image),
    );
    const prepare = () => {
      if (cancelled || opened || isTerminal()) return;
      const version = ++generation;
      gate?.abort();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(paintFrame);
      if (openingTimer !== undefined) window.clearTimeout(openingTimer);
      assetsReady = false;
      root.setAttribute("data-intro-assets", "pending");
      root.setAttribute("data-intro-fonts", "pending");
      gate = new AbortController();
      const options = {
        signal: gate.signal,
        timeoutMs: Math.max(1, cap - (performance.now() - start)),
      };
      const active = () => !cancelled && !opened && !isTerminal() && version === generation;

      // Let the original pictures evaluate a new media/DPR candidate after
      // resize; never substitute their widest <img src> as a preload URL.
      frame = requestAnimationFrame(() => {
        if (!active()) return;
        const images: Promise<AssetResult[]> = requiredLayers.length === 2
          ? Promise.all(requiredImages.map((image) => decodeImage(image, options)))
          : Promise.resolve([{ status: "failed", reason: "missing" }]);
        // Warming is independent of the final intro state and continues on
        // skip/cap. It never delays this gate or claims every site image ready.
        void images.then(() => {
          if (version === generation) warmRemainingPlates();
        });
        const fonts = waitForOpeningFonts(document, options);
        void fonts.then((result) => {
          if (!active()) return;
          root.setAttribute("data-intro-fonts", result.status);
          if (result.status === "ready") phase("label");
        });
        void Promise.all([images, fonts]).then(([results, font]) => {
          if (!active()) return;
          sources = new Map(requiredImages.map((image, index) => [
            image, results[index]?.source ?? "",
          ]));
          const failures = [...results, font].filter((result) => result.status === "failed");
          const readiness: Readiness = failures.some((result) => result.reason === "timeout")
            ? "timed-out" : failures.length > 0 ? "degraded" : "ready";
          // Fonts are loaded and both elements decoded; allow layout and a
          // paint opportunity for those glyphs and the synchronous CSS/SVG
          // instrument before authorizing the painting-bearing aperture.
          paintFrame = requestAnimationFrame(() => {
            if (!active()) return;
            if (readiness === "ready" && !sourcesMatch()) {
              prepare();
              return;
            }
            assetsReady = readiness === "ready";
            root.setAttribute("data-intro-assets", readiness);
            if (assetsReady) phase("lit");
            openingTimer = window.setTimeout(() => {
              if (!active()) return;
              if (assetsReady && !sourcesMatch()) prepare();
              else open(false, readiness);
            }, Math.max(0, minBeat - (performance.now() - start)));
          });
        });
      });
    };
    prepare();
    window.addEventListener("resize", prepare, { passive: true });
    // This is a policy decision, not a successful asset result. It keeps a
    // genuinely offline page usable and records why the full gate was not
    // achieved so late promises cannot rewrite history.
    timers.push(
      window.setTimeout(
        () => open(false, "timed-out"),
        Math.max(0, cap - (performance.now() - start)),
      ),
    );

    // Never make anyone wait: any intent skips to the open.
    const skip = () => open(true, "skipped");
    const events = ["wheel", "pointerdown", "keydown", "touchstart"] as const;
    for (const e of events) window.addEventListener(e, skip, { passive: true, once: true });
    // Claim only after listeners exist: pre-hydration input belongs to the
    // boot path; hydrated input keeps the original short fast-open handoff.
    window.dispatchEvent(new Event(INTRO_CLAIM_EVENT));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const forcedColors = window.matchMedia("(forced-colors: active)");
    const checkEffects = () => {
      if (cancelled || isTerminal()) return;
      if (getTier() !== "off" && !reduced.matches && !forcedColors.matches) return;
      opened = true;
      root.setAttribute("data-intro-readiness", "skipped");
      root.removeAttribute("data-intro-hold");
      root.removeAttribute("data-intro-fast");
      phase("done");
      gate?.abort();
      window.dispatchEvent(new Event(INTRO_OPEN_EVENT));
      window.dispatchEvent(new Event(IGNITED_EVENT));
    };
    const unsubscribeFx = subscribeFx(checkEffects);
    reduced.addEventListener("change", checkEffects);
    forcedColors.addEventListener("change", checkEffects);
    checkEffects();
    return () => {
      cancelled = true;
      gate?.abort();
      warmup?.cancel();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(paintFrame);
      if (openingTimer !== undefined) window.clearTimeout(openingTimer);
      window.removeEventListener("resize", prepare);
      unsubscribeFx();
      reduced.removeEventListener("change", checkEffects);
      forcedColors.removeEventListener("change", checkEffects);
      for (const t of timers) window.clearTimeout(t);
      for (const t of pending) window.clearTimeout(t);
      for (const e of events) window.removeEventListener(e, skip);
    };
  }, [target, lamp.x, lamp.y]);

  const x = target === "hero" ? Math.max(0.52, lamp.x) : 0.5;
  return (
    <div
      ref={ref}
      className="ignition print-drop"
      aria-hidden="true"
      data-target={target}
      style={
        {
          "--ig-x0": `${(x * 100).toFixed(2)}vw`,
          "--ig-y0":
            target === "hero"
              ? `calc(3.5rem + ${(lamp.y * 100).toFixed(2)}svh)`
              : "calc(3.5rem + 30svh)",
          "--ig-x0n": `${((target === "hero" ? lamp.x : 0.5) * 100).toFixed(2)}vw`,
          "--ig-y0n":
            target === "hero"
              ? `calc(3.5rem + ${(Math.min(0.38, lamp.y) * 100).toFixed(2)}svh)`
              : "calc(3.5rem + 30svh)",
        } as React.CSSProperties
      }
    >
      <div className="ig-veil" />
      <span className="ig-cross ig-cross-h" />
      <span className="ig-cross ig-cross-v" />
      <svg className="ig-dial" viewBox="-60 -60 120 120">
        <circle r="54" className="ig-ring" pathLength={100} />
        <g className="ig-ticks">
          {DIAL_TICKS.map((i) => (
            <line
              key={i}
              x1="0"
              y1="-54"
              x2="0"
              y2={i % 6 === 0 ? -47 : -51}
              transform={`rotate(${i * 5})`}
            />
          ))}
        </g>
        <ellipse rx="40" ry="14" className="ig-ring ig-gimbal" pathLength={100} />
        <circle r="30" className="ig-ring ig-inner" pathLength={100} />
      </svg>
      <span className="ig-ember" />
      <span className="ig-corner ig-tl" />
      <span className="ig-corner ig-tr" />
      <span className="ig-corner ig-bl" />
      <span className="ig-corner ig-br" />
      <div className="ig-caption">
        <p className="ig-index label">{experience.indexMark}</p>
        <p className="ig-name" data-name={name} />
        {/* The credit as generated content: it already renders, as real
            text, on the act's own provenance line — this is its echo. */}
        <p className="ig-credit label normal-case" data-credit={credit} />
        <p className="ig-coord label">
          {experience.calibrating} · <span ref={coord}>—</span>
        </p>
      </div>
    </div>
  );
}
