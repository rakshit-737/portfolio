"use client";

import { useEffect, useRef } from "react";
import Instrument, { EXPLODE_EVENT, WAKE_EVENT } from "@/components/Instrument";
import Reticle from "@/components/Reticle";
import { experience } from "@/content";
import { getTier, isDeep, setDeep, syncDeepSound } from "@/lib/fx";
import { flareLamp, getKindle, onLampFrame, setKindle } from "@/lib/lampBus";
import { playUi } from "@/lib/sound";

export const ARCHIVE_KEY = "lamplight:acts-visited";
export const SNUFF_EVENT = "lamplight:snuff";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const typing = (t: EventTarget | null) =>
  t instanceof HTMLInputElement ||
  t instanceof HTMLTextAreaElement ||
  (t instanceof HTMLElement && t.isContentEditable);

/** Snuff or relight the lamp — shared by the held-L secret and the
 *  palette's hidden `extinguish` / `relight` commands. */
export function snuff(on: boolean) {
  const root = document.documentElement;
  if (on === root.hasAttribute("data-snuffed")) return;
  root.toggleAttribute("data-snuffed", on);
  setKindle(on ? 0.2 : 1);
  playUi(on ? "breath" : "strike");
}

/**
 * The instrument layer's host (docs/superpowers/specs/
 * 2026-09-24-the-instrument-design.md). Mounted once in layout.tsx.
 *
 * - The wake (moment one): the first real movement — pointer travel,
 *   scroll, touch or key — sets `data-awake`, flares the lamp once
 *   (the lamp's own tick — src/lib/lampBus.ts), and only then loads the WebGL bodies,
 *   so a page nobody touches never pays for them.
 * - Telemetry: the lamp's live coordinates, written as text on the
 *   lamp's own tick, visible in Deep mode.
 * - Specimens: a tilt toward the pointer and a light on the frame.
 * - Secrets, unadvertised: Konami; hold L; all eight acts; Shift+D.
 * - Grain: one noise tile, generated here as a data: URL.
 */
export default function Experience() {
  const tele = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const cleanups: (() => void)[] = [];
    const on = <K extends keyof WindowEventMap>(
      target: Window | Document,
      type: K,
      fn: (e: WindowEventMap[K]) => void,
      opts?: AddEventListenerOptions,
    ) => {
      target.addEventListener(type, fn as EventListener, opts);
      cleanups.push(() => target.removeEventListener(type, fn as EventListener, opts));
    };

    // ——— the wake ———
    let awake = false;
    let atmosphere: { destroy(): void } | null = null;
    let lastX = -1;
    let lastY = -1;
    const wake = () => {
      if (awake) return;
      awake = true;
      root.setAttribute("data-awake", "");
      if (getTier() !== "off" && !root.hasAttribute("data-snuffed")) flareLamp();
      window.dispatchEvent(new Event(WAKE_EVENT));
      if (getTier() === "full") {
        void import("@/lib/atmosphereGL").then(({ mountAtmosphere }) => {
          if (!atmosphere && getTier() === "full") atmosphere = mountAtmosphere();
        });
      }
    };
    on(window, "pointermove", (e) => {
      if (awake) return;
      if (lastX < 0) {
        lastX = e.clientX;
        lastY = e.clientY;
        return;
      }
      if (Math.hypot(e.clientX - lastX, e.clientY - lastY) > 24) wake();
    }, { passive: true });
    on(window, "scroll", wake, { passive: true });
    on(window, "touchstart", wake, { passive: true });
    on(window, "keydown", wake);

    // ——— telemetry, acts visited, Deep swells ———
    let visited: Set<string>;
    try {
      visited = new Set(JSON.parse(localStorage.getItem(ARCHIVE_KEY) ?? "[]"));
    } catch {
      visited = new Set();
    }
    const markComplete = () => {
      if (visited.size >= 8) root.setAttribute("data-archive-complete", "");
    };
    markComplete();
    const greeted = new Set<string>();
    let teleText = "";
    const offFrame = onLampFrame((f) => {
      let best = f.acts[0];
      let bestA = -1;
      for (const a of f.acts) {
        const vis = Math.max(0, Math.min(f.vh, a.rect.bottom) - Math.max(0, a.rect.top));
        if (vis > bestA) {
          bestA = vis;
          best = a;
        }
        if (vis > f.vh * 0.5 && a.el.id && !visited.has(a.el.id)) {
          visited.add(a.el.id);
          try {
            localStorage.setItem(ARCHIVE_KEY, JSON.stringify([...visited]));
          } catch {}
          markComplete();
        }
      }
      if (!best) return false;
      if (isDeep() && bestA > f.vh * 0.6 && !greeted.has(best.el.id)) {
        greeted.add(best.el.id);
        playUi("swell");
      }
      if (tele.current && isDeep()) {
        const text = `${experience.telemetry} x ${best.x.toFixed(3)} · y ${best.y.toFixed(3)} · r ${Math.round(best.r)} · p ${best.p.toFixed(3)}`;
        if (text !== teleText) {
          teleText = text;
          tele.current.textContent = text;
        }
      }
      return false;
    });
    cleanups.push(offFrame);

    // ——— specimens: tilt toward the pointer, light on the frame ———
    if (window.matchMedia("(pointer: fine) and (hover: hover)").matches) {
      let active: HTMLElement | null = null;
      on(document, "pointermove", (e) => {
        if (getTier() === "off") return;
        const t = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-specimen]") : null;
        if (active && active !== t) {
          active.style.removeProperty("--rx");
          active.style.removeProperty("--ry");
          active.removeAttribute("data-hot");
        }
        active = t;
        if (!t) return;
        const r = t.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width;
        const ny = (e.clientY - r.top) / r.height;
        t.style.setProperty("--mx", `${(nx * 100).toFixed(1)}%`);
        t.style.setProperty("--my", `${(ny * 100).toFixed(1)}%`);
        t.style.setProperty("--ry", `${((nx - 0.5) * 5).toFixed(2)}deg`);
        t.style.setProperty("--rx", `${((0.5 - ny) * 4).toFixed(2)}deg`);
        t.setAttribute("data-hot", "");
      }, { passive: true });
    }

    // ——— secrets ———
    let konami = 0;
    on(window, "keydown", (e) => {
      if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const want = KONAMI[konami];
      konami = e.key === want || e.key.toLowerCase() === want ? konami + 1 : e.key === KONAMI[0] ? 1 : 0;
      if (konami === KONAMI.length) {
        konami = 0;
        window.dispatchEvent(new Event(EXPLODE_EVENT));
        playUi("gear");
      }
      if (e.shiftKey && e.key.toLowerCase() === "d" && getTier() !== "off") {
        setDeep(!isDeep());
        playUi("gear");
      }
      if (e.key.toLowerCase() === "l" && !e.shiftKey && !e.repeat) {
        // Held, not pressed: a tap of L does nothing.
        const timer = window.setTimeout(() => snuff(true), 350);
        const up = (u: KeyboardEvent) => {
          if (u.key.toLowerCase() !== "l") return;
          window.clearTimeout(timer);
          window.removeEventListener("keyup", up);
          if (root.hasAttribute("data-snuffed") && getKindle() < 1) snuff(false);
        };
        window.addEventListener("keyup", up);
      }
    });
    const onSnuff = (e: Event) => snuff((e as CustomEvent<boolean>).detail);
    window.addEventListener(SNUFF_EVENT, onSnuff);
    cleanups.push(() => window.removeEventListener(SNUFF_EVENT, onSnuff));

    // ——— the case-file hand-off: the act's painting morphs into the
    // case file's header plate (a cross-document View Transition; CSS
    // names the header `case-plate`, this names the act's plate on the
    // click that leaves). Any other navigation skips the transition.
    on(document, "click", (e) => {
      const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!a || !/\/projects\/[^/]+\/?$/.test(a.pathname)) return;
      for (const p of document.querySelectorAll<HTMLElement>(".plate")) p.style.viewTransitionName = "";
      const plate = a.closest("[data-act]")?.querySelector<HTMLElement>(".plate");
      if (plate) plate.style.viewTransitionName = "case-plate";
    });
    on(window, "pageswap" as keyof WindowEventMap, (e) => {
      const ev = e as Event & {
        viewTransition?: { skipTransition(): void } | null;
        activation?: { entry?: { url?: string } } | null;
      };
      const to = ev.activation?.entry?.url ?? "";
      if (ev.viewTransition && !/\/projects\/[^/]+\/?(#.*)?$/.test(new URL(to || location.href).pathname)) {
        ev.viewTransition.skipTransition();
      }
    });
    on(window, "pageshow", () => {
      for (const p of document.querySelectorAll<HTMLElement>(".plate")) p.style.viewTransitionName = "";
    });
    syncDeepSound();

    // ——— grain: a 96px noise tile, generated, never fetched ———
    if (getTier() !== "off") {
      const c = document.createElement("canvas");
      c.width = c.height = 96;
      const g = c.getContext("2d");
      if (g) {
        const img = g.createImageData(96, 96);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = Math.random() < 0.5 ? 8 : 242;
          img.data[i] = v;
          img.data[i + 1] = v === 8 ? 7 : 237;
          img.data[i + 2] = v === 8 ? 10 : 227;
          img.data[i + 3] = Math.floor(Math.random() * 255);
        }
        g.putImageData(img, 0, 0);
        root.style.setProperty("--grain", `url("${c.toDataURL("image/png")}")`);
      }
    }

    return () => {
      for (const c of cleanups) c();
      atmosphere?.destroy();
    };
  }, []);

  return (
    <>
      <Instrument />
      <Reticle />
      <p ref={tele} className="telemetry label print-drop" aria-hidden="true" />
      <div className="grain print-drop" aria-hidden="true" />
      <div className="deep-grid print-drop" aria-hidden="true" />
    </>
  );
}
