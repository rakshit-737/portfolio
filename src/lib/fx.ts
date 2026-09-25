/**
 * The effects tier, Deep mode and the lighting preset — one small store
 * shared by every layer of "the instrument" (docs/superpowers/specs/
 * 2026-09-24-the-instrument-design.md).
 *
 * The initial values are decided before first paint by BOOT_SCRIPT
 * (inlined into <head> by layout.tsx), which writes them onto <html>:
 *   data-fx-auto  the tier the device earns on its own
 *   data-fx       the tier in force: full | lite | off
 *   data-deep     present while Deep mode is on
 *   data-light    "open" while the lamp is set aside (fully lit reading)
 *   data-intro    the ignition mode for this load: full | brief
 * This module only reads and changes them at runtime.
 */

import { wakeLamp } from "@/lib/lampBus";
import { setSoundDeep } from "@/lib/sound";

export type FxTier = "full" | "lite" | "off";

export const FX_KEY = "lamplight:fx";
export const DEEP_KEY = "lamplight:deep";
export const LIGHT_KEY = "lamplight:light";

const subs = new Set<() => void>();
function emit() {
  for (const s of subs) s();
}
export function subscribeFx(cb: () => void): () => void {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

function store(key: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(key);
    else localStorage.setItem(key, v);
  } catch {
    // Storage blocked — the choice still holds for this visit.
  }
}

const root = () => document.documentElement;

export function getTier(): FxTier {
  if (typeof document === "undefined") return "off";
  const v = root().getAttribute("data-fx");
  return v === "full" || v === "lite" ? v : "off";
}

/** The visitor's own "Reduce effects" switch. Never raises the tier past
 *  what the device earned (reduced motion stays off). */
export function setReducedEffects(on: boolean) {
  store(FX_KEY, on ? "off" : null);
  const auto = (root().getAttribute("data-fx-auto") as FxTier) || "off";
  root().setAttribute("data-fx", on ? "off" : auto);
  if (on) setDeep(false);
  emit();
}
export function isReducedByUser(): boolean {
  try {
    return localStorage.getItem(FX_KEY) === "off";
  } catch {
    return false;
  }
}

export function isDeep(): boolean {
  return typeof document !== "undefined" && root().hasAttribute("data-deep");
}
export function setDeep(on: boolean) {
  if (on && getTier() === "off") return;
  root().toggleAttribute("data-deep", on);
  store(DEEP_KEY, on ? "on" : null);
  setSoundDeep(on);
  wakeLamp();
  emit();
}

/** Called once on mount so a persisted Deep mode reaches the sound. */
export function syncDeepSound() {
  setSoundDeep(isDeep());
}

export function isOpenLight(): boolean {
  return typeof document !== "undefined" && root().getAttribute("data-light") === "open";
}
export function setOpenLight(on: boolean) {
  if (on) root().setAttribute("data-light", "open");
  else root().removeAttribute("data-light");
  store(LIGHT_KEY, on ? "open" : null);
  emit();
}

/** A tiny snapshot for useSyncExternalStore. */
export function fxSnapshot(): string {
  if (typeof document === "undefined") return "off||";
  return `${getTier()}|${isDeep() ? "deep" : ""}|${isOpenLight() ? "open" : ""}`;
}

/**
 * Runs in <head>, before the body parses, so no layer ever flashes in the
 * wrong state. Plain ES5 in a string: it cannot import anything. `BASE`
 * is replaced with the build's basePath (GitHub Pages sub-path).
 *
 * Ignition modes: `full` on every load of the index, `brief` on every
 * load of any other page (owner request 2026-09-25: the loader plays every
 * time, not only on a first visit); none under reduced motion / forced colours / reduced effects, and
 * under automation (navigator.webdriver) — `?ignite` (or `?ignite=brief`)
 * forces it for a test or a demo. The 7.5s timer is the failsafe: even if
 * the app bundle never runs, the veil and the hero's hold are gone by then.
 */
export const BOOT_SCRIPT = `(function(){try{
var d=document.documentElement,w=window,n=navigator,c=n.connection||{};
function m(q){return w.matchMedia(q).matches}
function g(s,k){try{return w[s].getItem(k)}catch(e){return null}}
var rm=m('(prefers-reduced-motion: reduce)'),fc=m('(forced-colors: active)');
var low=(n.deviceMemory&&n.deviceMemory<=4)||(n.hardwareConcurrency&&n.hardwareConcurrency<=4);
var slow=c.saveData||/2g|3g/.test(c.effectiveType||'');
var auto=(rm||fc)?'off':(slow||(m('(pointer: coarse)')&&low))?'lite':'full';
d.setAttribute('data-fx-auto',auto);
var fx=g('localStorage','${FX_KEY}')==='off'?'off':auto;
d.setAttribute('data-fx',fx);
if(fx!=='off'&&g('localStorage','${DEEP_KEY}')==='on')d.setAttribute('data-deep','');
if(g('localStorage','${LIGHT_KEY}')==='open')d.setAttribute('data-light','open');
var q=location.search,force=/[?&]ignite\\b/.test(q),mode='';
var path=location.pathname.replace(/index\\.html$/,'').replace(/\\/$/,'');
var index=path==='BASE'.replace(/\\/$/,'');
if(fx!=='off'&&(force||!n.webdriver)){
if(force)mode=/ignite=brief/.test(q)?'brief':'full';
else mode=index?'full':'brief';
}
if(mode){d.setAttribute('data-intro',mode);d.setAttribute('data-intro-phase','ember');d.setAttribute('data-intro-hold','');
w.setTimeout(function(){d.removeAttribute('data-intro-hold');d.setAttribute('data-intro-phase','done')},7500);}
}catch(e){}})();`;
