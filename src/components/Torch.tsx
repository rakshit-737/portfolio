"use client";

import { useEffect } from "react";
import { POINTER_LERP, createFrameBudgetGuard } from "@/lib/motion";

/**
 * A page-wide flashlight, layered above every act's own lamp.
 *
 * The site already has a light — the per-act lamp in Lamp.tsx that reveals
 * each painting. This is not a second, independent light: it is the same
 * pointer, rendered as a wider, softer wash that dims the page outside a
 * beam and leaves it fully visible inside. Two uncorrelated light sources
 * would read as a bug; one pointer driving two coordinated effects reads
 * as a single flashlight moving over a dark archive.
 *
 * Written to the same shape as Lamp.tsx: one rAF loop, one passive
 * pointermove listener, CSS custom properties only, no React state per
 * pointer event, no re-renders. It needs no IntersectionObserver — the
 * overlay is fixed and viewport-wide, not scoped to an act — so it adds
 * nothing Lamp.tsx already provides.
 *
 * Position is driven by `transform: translate3d()`, not by moving the
 * gradient's own centre — a gradient recomputed from a changing `at x y`
 * forces a repaint of the whole overlay every frame, which measured out
 * as real, visible jank on this page (a fixed-size gradient sits on a
 * div twice the viewport in each direction, sized so a full sweep never
 * uncovers an edge, and only ever *moves*). The radius, which does
 * change the gradient's own definition, is written only when it has
 * actually moved past the point where the difference is visible — most
 * frames touch nothing but the transform.
 *
 * Default, JS-free state is fully transparent: `.torch` ships at
 * `opacity: 0` in CSS, so with no JavaScript the element renders but is
 * inert and undimmed. Only a genuine pointer entry turns it on.
 */
export default function Torch() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hover = window.matchMedia("(hover: none)");
    // Desktop only: a touch device or a reduced-motion visitor gets no
    // listeners at all, not merely a hidden effect.
    if (reduce.matches || hover.matches) return;

    const root = document.documentElement;

    // The rest radius, per breakpoint. Read once on mount and again on
    // resize — never recomputed inside the per-frame loop.
    let baseRadius = window.innerWidth <= 1024 ? 200 : 240;
    // Interactive elements ask for a slightly wider beam. Detected with a
    // single delegated listener pair on `document`, not one per element.
    let hovering = false;
    let targetRadius = baseRadius;

    const updateRadius = () => {
      baseRadius = window.innerWidth <= 1024 ? 200 : 240;
      targetRadius = hovering ? baseRadius + 20 : baseRadius;
    };

    const isInteractive = (node: EventTarget | null) =>
      node instanceof Element && !!node.closest("a, button, [role='button']");

    const onPointerOver = (e: PointerEvent) => {
      if (isInteractive(e.target)) {
        hovering = true;
        targetRadius = baseRadius + 20;
      }
    };
    const onPointerOut = (e: PointerEvent) => {
      if (isInteractive(e.target) && !isInteractive(e.relatedTarget)) {
        hovering = false;
        targetRadius = baseRadius;
      }
    };

    // Position is expressed as an offset from viewport centre — that's
    // what the CSS transform below expects, matching `.torch`'s centred
    // rest position.
    const raw = { dx: 0, dy: 0 };
    // The beam trails the pointer rather than snapping to it, using the
    // exact same POINTER_LERP as Lamp.tsx's lantern — the lamp's pool and
    // the torch's beam are one light, so they must converge on the cursor
    // at the same relative rate or a viewer sees two pools drifting apart
    // instead of one flashlight.
    const smooth = { dx: 0, dy: 0, r: baseRadius };
    // Forces one real write on the first frame — `--torch-r` should exist
    // as soon as the torch is on, not only once it first eases away from
    // its resting value. -1 is never a real radius, so the first frame's
    // threshold check always passes.
    let lastWrittenR = -1;
    let active = false;
    let frame = 0;
    let last = 0;
    // Whether the frame-budget guard has shed this effect's work. Distinct
    // from `active` (has the pointer ever moved): `data-torch` should read
    // "on" only when both are true, so every place that changes either one
    // goes through `syncArmed` rather than setting the attribute directly.
    let suspended = false;

    const syncArmed = () => {
      if (active && !suspended) {
        root.setAttribute("data-torch", "on");
      } else {
        root.removeAttribute("data-torch");
      }
    };

    // Suspends rather than tears down: a device that can't hold frame
    // budget gets the torch turned off, but the rAF loop below keeps
    // running and keeps feeding this guard real timestamps either way, so
    // it notices the device recovering from a transient stall (scroll-and-
    // decode burst, a background tab catching up) and re-arms on its own.
    // See src/lib/motion.ts (FRAME_BUDGET, createFrameBudgetGuard) for the
    // rolling-window numbers and why they replace the old "10 consecutive
    // frames over 32ms → teardown()" breaker, which fired on ordinary
    // scrolling and, once tripped, never recovered for the rest of the
    // session — the exact bug this guard exists to fix.
    const guard = createFrameBudgetGuard(
      () => {
        suspended = true;
        syncArmed();
      },
      () => {
        suspended = false;
        syncArmed();
      },
    );

    const onPointer = (e: PointerEvent) => {
      raw.dx = e.clientX - window.innerWidth / 2;
      raw.dy = e.clientY - window.innerHeight / 2;
      if (!active) {
        // First movement: snap the smoothed position to the raw one so
        // the beam doesn't sweep in from the viewport centre, then let
        // the CSS opacity transition carry the actual "fade in".
        smooth.dx = raw.dx;
        smooth.dy = raw.dy;
        active = true;
        syncArmed();
      }
    };

    const tick = (now: number) => {
      guard.sample(now, last);
      last = now;

      // Suspended: skip the per-frame work the guard exists to shed, but
      // keep the loop alive — `guard.sample` above still runs every tick,
      // which is what lets `onRecover` fire once frame budget is healthy
      // again.
      if (suspended) {
        frame = requestAnimationFrame(tick);
        return;
      }

      if (active) {
        smooth.dx += (raw.dx - smooth.dx) * POINTER_LERP;
        smooth.dy += (raw.dy - smooth.dy) * POINTER_LERP;
      }
      // The radius has no counterpart in Lamp.tsx to stay unified with —
      // reusing the same constant here is just consistency, not a
      // correctness requirement.
      smooth.r += (targetRadius - smooth.r) * POINTER_LERP;

      // Cheap every frame: each variable only ever feeds `transform`,
      // which is composited, never painted.
      root.style.setProperty("--torch-x", `${smooth.dx.toFixed(1)}px`);
      root.style.setProperty("--torch-y", `${smooth.dy.toFixed(1)}px`);
      // Expensive if written every frame: changing the gradient's own
      // radius repaints the overlay. It only actually needs to move
      // while easing toward a new target (hover in/out), so skip the
      // write once it has visibly converged.
      if (Math.abs(smooth.r - lastWrittenR) > 0.1) {
        root.style.setProperty("--torch-r", `${smooth.r.toFixed(1)}px`);
        lastWrittenR = smooth.r;
      }

      frame = requestAnimationFrame(tick);
    };

    const teardown = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", updateRadius);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
    };

    updateRadius();
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("resize", updateRadius, { passive: true });
    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });
    frame = requestAnimationFrame(tick);

    return () => {
      teardown();
      root.removeAttribute("data-torch");
    };
  }, []);

  return <div className="torch" aria-hidden="true" />;
}
