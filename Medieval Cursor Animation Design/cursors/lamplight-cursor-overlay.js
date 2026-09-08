/* Lamplight cursor overlay — the animated rendering of the three
   artifacts. Framework-free (mount once from a client component or with
   <script src="lamplight-cursor-overlay.js" data-auto>). The static CSS
   cursors (lamplight-cursors.css) stay the baseline: this layer only
   mounts on a fine, hovering pointer with motion allowed and forced
   colours off; everywhere else it does nothing and the CSS block wins.

   Motion budget, on purpose: the artifact sits ON the pointer (no lag,
   no trail); the I-beam's shaft blinks like a caret only once the
   pointer has been still; the gem breathes very slightly; a state change
   is a 120ms crossfade; a press lifts the padlock's shackle 3px. The
   metal's highlight leans a little with the pointer's position across the
   viewport — the one thing that makes it read as lit, forged metal rather
   than a flat glyph. Nothing else moves. */
(function () {
  const A = window.LamplightCursorArt;

  function mount(root, opts) {
    root = root || document.documentElement;
    opts = opts || {};
    const fine = matchMedia("(pointer: fine) and (hover: hover)").matches;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const forced = matchMedia("(forced-colors: active)").matches;
    if (!A || !fine || reduce || forced) return function () {};

    const size = opts.size || 40; // the key's height in px; the lock matches, the beam is 0.8×
    const blink = opts.blink !== false, breathe = opts.gem !== false, lighting = opts.lighting !== false, lift = opts.press !== false;
    const ks = size / A.KEY.h, ls = size / A.LOCK.h, is = (size * 0.8) / A.IBEAM.h;
    const isRoot = root === document.documentElement || root === document.body;

    const layer = document.createElement("div");
    layer.setAttribute("aria-hidden", "true");
    layer.className = "lc-layer" + (isRoot ? " lc-fixed" : "");
    layer.innerHTML =
      `<style>
.lc-layer{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:2147483000}
.lc-layer.lc-fixed{position:fixed}
[data-lc-root],[data-lc-root] *{cursor:none!important}
.lc-art{position:absolute;left:0;top:0;width:0;height:0;opacity:0;transition:opacity 120ms ease;will-change:transform}
.lc-art.on{opacity:1}
.lc-art>svg{position:absolute;display:block;overflow:visible}
.lc-key>svg{width:${A.KEY.w * ks}px;height:${A.KEY.h * ks}px;left:${-A.KEY.tip[0] * ks}px;top:${-A.KEY.tip[1] * ks}px;transform-origin:${A.KEY.tip[0] * ks}px ${A.KEY.tip[1] * ks}px;transform:rotate(-45deg)}
.lc-lock>svg{width:${A.LOCK.w * ls}px;height:${A.LOCK.h * ls}px;left:${-A.LOCK.hole[0] * ls}px;top:${-A.LOCK.hole[1] * ls}px}
.lc-beam>svg{width:${A.IBEAM.w * is}px;height:${A.IBEAM.h * is}px;left:${-A.IBEAM.center[0] * is}px;top:${-A.IBEAM.center[1] * is}px}
.lc-shackle{transition:transform 160ms cubic-bezier(.16,1,.3,1)}
.lc-layer.lc-press .lc-shackle{transform:translateY(-3px)}
${blink ? ".lc-layer.lc-still .lc-beam .lc-shaft{animation:lc-blink 1.06s steps(1,end) infinite}@keyframes lc-blink{50%{opacity:.32}}" : ""}
${breathe ? ".lc-gem{animation:lc-gem 2.8s ease-in-out infinite}@keyframes lc-gem{50%{opacity:.76}}" : ""}
</style>` +
      `<div class="lc-art lc-key">${A.svg(A.key("lck"), A.KEY.w, A.KEY.h)}</div>` +
      `<div class="lc-art lc-lock">${A.svg(A.padlock("lcp"), A.LOCK.w, A.LOCK.h)}</div>` +
      `<div class="lc-art lc-beam">${A.svg(A.ibeam("lci", size * 0.8 < 28), A.IBEAM.w, A.IBEAM.h)}</div>`;
    root.appendChild(layer);
    root.setAttribute("data-lc-root", "");

    const arts = { key: layer.querySelector(".lc-key"), lock: layer.querySelector(".lc-lock"), beam: layer.querySelector(".lc-beam") };
    const metals = layer.querySelectorAll(".lc-metal, .lc-spec");
    let state = "", stillTimer = 0, lastLight = 99;

    const setState = (s) => {
      if (s === state) return;
      state = s;
      for (const k in arts) arts[k].classList.toggle("on", k === s);
    };
    const place = (x, y) => {
      const t = `translate3d(${x}px, ${y}px, 0)`;
      arts.key.style.transform = t; arts.lock.style.transform = t; arts.beam.style.transform = t;
    };
    const light = (fx) => {
      if (!lighting) return;
      const dx = Math.max(-0.28, Math.min(0.28, (fx - 0.5) * -0.5));
      if (Math.abs(dx - lastLight) < 0.01) return;
      lastLight = dx;
      for (const g of metals) g.setAttribute("gradientTransform", `translate(${(dx * (g.classList.contains("lc-spec") ? 1.9 : 1)).toFixed(3)} 0)`);
    };

    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      const r = isRoot ? { left: 0, top: 0 } : root.getBoundingClientRect();
      place(e.clientX - r.left, e.clientY - r.top);
      const el = e.target instanceof Element ? e.target : null;
      const inside = el && root.contains(el);
      if (!inside) { setState(""); return; }
      const click = el.closest(A.CLICKABLE), text = !click && el.closest(A.TEXT);
      setState(click ? "lock" : text ? "beam" : "key");
      light(e.clientX / window.innerWidth);
      layer.classList.remove("lc-still");
      clearTimeout(stillTimer);
      stillTimer = setTimeout(() => layer.classList.add("lc-still"), 700);
    };
    const hide = () => { setState(""); layer.classList.remove("lc-press"); };
    const onDown = (e) => { if (state === "lock" && lift) layer.classList.add("lc-press"); };
    const onUp = () => layer.classList.remove("lc-press");
    const onLeave = (e) => { if (!e.relatedTarget) hide(); };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", hide);

    return function unmount() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", hide);
      document.removeEventListener("visibilitychange", hide);
      clearTimeout(stillTimer);
      root.removeAttribute("data-lc-root");
      layer.remove();
    };
  }

  window.LamplightCursor = { mount };
  const me = document.currentScript;
  if (me && me.hasAttribute("data-auto")) {
    const go = () => mount(document.documentElement, { size: Number(me.dataset.size) || 40 });
    document.body ? go() : document.addEventListener("DOMContentLoaded", go);
  }
})();
