/* Lamplight cursor — the playful rendering (Key & Lock Cursor.dc.html,
   framework-free). Needs lamplight-cursor-art.js loaded first.

   The key sits a beat behind the pointer (a held key, not a snap); over
   anything clickable the padlock appears at the pointer and the key slides
   into its keyhole; a press turns it a quarter, pops the shackle, warms the
   keyhole to ember, flashes a small ember square and plays the site's brass
   click + wax thud; over text the pointer becomes the I-beam key and blinks
   like a caret once still; candle-smoke wisps rise off the bow while the
   key moves; an ember glint travels the shaft after a second of rest.

   Mounts only on a fine, hovering pointer with motion allowed and forced
   colours off — everywhere else it is a no-op and the static CSS cursors
   (lamplight-cursors.css) stand. Unmount by calling the returned function. */
(function () {
  const BONE = "#F2EDE3", GROUND = "#08070A", EMBER = "#E8A33D";

  function mount(root, o) {
    const A = window.LamplightCursorArt;
    root = root || document.documentElement;
    o = Object.assign({ size: 56, lag: 0.35, smoke: true, ember: true, sound: true }, o || {});
    const fine = matchMedia("(pointer: fine) and (hover: hover)").matches;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const forced = matchMedia("(forced-colors: active)").matches;
    if (!A || !fine || reduce || forced) return function () {};

    const isRoot = root === document.documentElement || root === document.body;
    const s = o.size / A.KEY.h;
    const layer = document.createElement("div");
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML =
      `<style>
[data-lc-root],[data-lc-root] *{cursor:none!important}
.lcp{position:${isRoot ? "fixed" : "absolute"};inset:0;overflow:hidden;pointer-events:none;z-index:2147483000}
.lcp canvas{position:absolute;inset:0;width:100%;height:100%}
.lcp .a{position:absolute;left:0;top:0;width:0;height:0;opacity:0;will-change:transform,opacity}
.lcp .a>div{position:absolute}
.lcp .a svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.lcp .beam{transition:opacity 120ms ease}
.lcp .flash{position:absolute;left:-13px;top:-13px;width:26px;height:26px;border:1px solid ${EMBER};opacity:0}
.lcp .lc-gem{animation:lcp-gem 2.8s ease-in-out infinite}
.lcp .still .lc-shaft{animation:lcp-blink 1.06s steps(1,end) infinite}
.lcp .lc-shackle{transform-origin:28px 22px;transition:transform 240ms cubic-bezier(.16,1,.3,1)}
.lcp .lc-hole{transition:fill 160ms}
@keyframes lcp-gem{50%{opacity:.76}}@keyframes lcp-blink{50%{opacity:.32}}
</style>
<div class="lcp"><canvas></canvas><div class="flash"></div>
<div class="a lock"><div style="left:-20px;top:-31px;width:40px;height:48px">${A.svg(A.padlock("lpp"), A.LOCK.w, A.LOCK.h)}</div></div>
<div class="a key"><div style="left:0;top:0;width:0;height:0;transform:rotate(-90deg);transform-origin:0 0"><div style="position:absolute;left:-20px;top:-1px;width:40px;height:96px">${A.svg(A.key("lpk"), A.KEY.w, A.KEY.h)}</div></div></div>
<div class="a beam"><div style="left:-12px;top:-24px;width:24px;height:48px">${A.svg(A.ibeam("lpi", false), A.IBEAM.w, A.IBEAM.h)}</div></div></div>`;
    root.appendChild(layer);
    root.setAttribute("data-lc-root", "");
    const lcp = layer.querySelector(".lcp"), canvas = layer.querySelector("canvas"), flashEl = layer.querySelector(".flash");
    const key = layer.querySelector(".key"), lock = layer.querySelector(".lock"), beam = layer.querySelector(".beam");
    const ksvg = key.querySelector("svg");
    const gl = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gl.innerHTML = `<defs><linearGradient id="lpglint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="${o.ember ? EMBER : "#fff"}" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><clipPath id="lpclip"><rect x="17.6" y="1" width="4.8" height="56"/><rect x="22.4" y="8" width="9.2" height="14"/><rect x="15.2" y="55.6" width="9.6" height="8.6"/><path clip-rule="evenodd" d="M20 60.8a17.2 17.2 0 1 0 0.01 0ZM20 64.6a13.4 13.4 0 1 1 -0.01 0Z"/></clipPath></defs><g clip-path="url(#lpclip)"><g class="glint" style="opacity:0"><rect x="-10" y="-7" width="60" height="11" transform="skewY(-24)" fill="url(#lpglint)"/></g></g>`;
    ksvg.appendChild(gl);
    const glint = ksvg.querySelector(".glint"), gem = ksvg.querySelector(".lc-gem");
    const shackle = lock.querySelector(".lc-shackle"), hole = lock.querySelector(".lc-hole");
    const metals = layer.querySelectorAll(".lc-metal, .lc-spec");

    const g2 = canvas.getContext("2d");
    let rect = { left: 0, top: 0, width: innerWidth, height: innerHeight };
    const measure = () => { rect = isRoot ? { left: 0, top: 0, width: innerWidth, height: innerHeight } : root.getBoundingClientRect(); };
    const resize = () => { measure(); const dpr = Math.min(2, devicePixelRatio || 1); canvas.width = Math.max(1, rect.width * dpr); canvas.height = Math.max(1, rect.height * dpr); g2.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(isRoot ? document.body : root);
    const sprite = document.createElement("canvas"); sprite.width = sprite.height = 64;
    const sg = sprite.getContext("2d"), grad = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(242,237,227,.9)"); grad.addColorStop(.5, "rgba(242,237,227,.35)"); grad.addColorStop(1, "rgba(242,237,227,0)");
    sg.fillStyle = grad; sg.fillRect(0, 0, 64, 64);

    const S = { px: 0, py: 0, x: 0, y: 0, vx: 0, vy: 0, rot: 45, rotT: 45, ins: 0, lockA: 0, keyA: 0, lx: 0, ly: 0, mode: "out", turned: false, open: false, glint: 0, lastMove: 0, lean: 0, parts: [] };
    let frame = 0, last = 0, running = false;
    const wake = () => { if (!running) { running = true; last = 0; frame = requestAnimationFrame(tick); } };
    const setMode = (m) => { if (m !== "lock") { S.open = false; S.turned = false; } if (m === "lock" && S.mode !== "lock") { S.lx = S.px; S.ly = S.py; } S.mode = m; };

    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      measure();
      S.px = e.clientX - rect.left; S.py = e.clientY - rect.top; S.lastMove = performance.now();
      if (S.mode === "out") { S.x = S.px; S.y = S.py; }
      const el = e.target instanceof Element ? e.target : null;
      if (!el || !root.contains(el)) { setMode("out"); wake(); return; }
      const click = el.closest(A.CLICKABLE), text = !click && el.closest(A.TEXT);
      setMode(click ? "lock" : text ? "text" : "key");
      const lean = Math.max(-.28, Math.min(.28, (e.clientX / innerWidth - .5) * -.5));
      if (Math.abs(lean - S.lean) > .01) { S.lean = lean; for (const m of metals) m.setAttribute("gradientTransform", `translate(${(lean * (m.classList.contains("lc-spec") ? 1.9 : 1)).toFixed(3)} 0)`); }
      wake();
    };
    const hide = () => { setMode("out"); wake(); };
    const onLeave = (e) => { if (!e.relatedTarget) hide(); };
    const onDown = (e) => {
      if (S.mode !== "lock" || (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen")) return;
      S.turned = true; S.open = true; flash(); sound();
    };
    const onUp = () => { S.turned = false; };

    const flash = () => {
      flashEl.style.borderColor = o.ember ? EMBER : BONE;
      const at = `translate(${S.lx}px,${S.ly}px) rotate(45deg)`;
      flashEl.animate([{ opacity: .9, transform: at + " scale(.3)" }, { opacity: 0, transform: at + " scale(1.9)" }], { duration: 520, easing: "cubic-bezier(.16,1,.3,1)" });
    };

    // The site's brass click, then the wax thud as the shackle pops (from src/lib/sound.ts).
    // If the site's own `playUi` is passed in, it is used instead.
    let ac = null, white = null;
    const sound = () => {
      if (!o.sound) return;
      if (typeof o.playUi === "function") { o.playUi("click"); setTimeout(() => o.playUi("seal"), 70); return; }
      try {
        ac = ac || new AudioContext(); if (ac.state !== "running") ac.resume();
        const t = ac.currentTime, out = ac.createGain(); out.gain.value = .18; out.connect(ac.destination); setTimeout(() => out.disconnect(), 700);
        const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 900; hp.connect(out);
        for (const f of [2100, 2700]) { const osc = ac.createOscillator(); osc.type = "triangle"; osc.frequency.value = f; const g = ac.createGain(); g.gain.setValueAtTime(.4, t); g.gain.exponentialRampToValueAtTime(.0001, t + .035); osc.connect(g).connect(hp); osc.start(t); osc.stop(t + .05); }
        const t2 = t + .07, press = ac.createOscillator(); press.frequency.value = 90;
        const pg = ac.createGain(); pg.gain.setValueAtTime(.0001, t2); pg.gain.exponentialRampToValueAtTime(.8, t2 + .015); pg.gain.exponentialRampToValueAtTime(.0001, t2 + .18);
        press.connect(pg).connect(out); press.start(t2); press.stop(t2 + .2);
        if (!white) { white = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = white.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
        const src = ac.createBufferSource(); src.buffer = white; const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 300;
        const tg = ac.createGain(); tg.gain.setValueAtTime(.3, t2); tg.gain.exponentialRampToValueAtTime(.0001, t2 + .09);
        src.connect(lp).connect(tg).connect(out); src.start(t2, Math.random() * .8, .1);
      } catch (e) { /* silent */ }
    };

    const spawn = (n) => {
      const a = S.rot * Math.PI / 180, bx = S.x + 77 * s * Math.cos(a), by = S.y + 77 * s * Math.sin(a);
      for (let i = 0; i < n && S.parts.length < 140; i++) S.parts.push({ x: bx + (Math.random() - .5) * 4, y: by + (Math.random() - .5) * 4, vx: (Math.random() - .5) * .02, vy: -.018 - Math.random() * .02, r: 2.5 + Math.random() * 2, life: 1100 + Math.random() * 700, age: 0, sw: Math.random() * 6.28 });
    };

    const tick = (now) => {
      const dt = Math.min(48, last ? now - last : 16); last = now;
      const inLock = S.mode === "lock", visible = S.mode === "key" || inLock;
      let tx, ty;
      if (inLock) { S.lx += (S.px - S.lx) * o.lag; S.ly += (S.py - S.ly) * o.lag; S.ins += (1 - S.ins) * .16; tx = S.lx + (1 - S.ins) * 30 * s; ty = S.ly; S.rotT = S.turned ? 90 : 0; }
      else { S.ins += (0 - S.ins) * .25; tx = S.px; ty = S.py; }
      const nx = S.x + (tx - S.x) * o.lag, ny = S.y + (ty - S.y) * o.lag;
      S.vx = nx - S.x; S.vy = ny - S.y; S.x = nx; S.y = ny;
      const speed = Math.hypot(S.vx, S.vy);
      if (!inLock) S.rotT = 45 + Math.max(-22, Math.min(22, S.vx * 1.1 - S.vy * .4));
      S.rot += (S.rotT - S.rot) * (S.turned ? .3 : .14);
      S.lockA += ((inLock ? 1 : 0) - S.lockA) * .2;
      S.keyA += ((visible ? 1 : 0) - S.keyA) * .25;
      key.style.transform = `translate(${S.x.toFixed(2)}px,${S.y.toFixed(2)}px) rotate(${S.rot.toFixed(2)}deg) scale(${s})`;
      key.style.opacity = S.keyA.toFixed(3);
      lock.style.transform = `translate(${S.lx.toFixed(2)}px,${S.ly.toFixed(2)}px) scale(${(s * 1.05 * (.7 + .3 * S.lockA)).toFixed(3)})`;
      lock.style.opacity = (S.lockA * S.keyA).toFixed(3);
      if (shackle) shackle.style.transform = S.open ? "translate(4px,-9px) rotate(-16deg)" : "none";
      const warm = o.ember && S.ins > .85;
      if (hole) hole.style.fill = warm ? EMBER : GROUND;
      if (gem) gem.style.filter = S.turned ? "brightness(1.5)" : "none";
      const idle = now - S.lastMove, beamOn = S.mode === "text";
      beam.style.transform = `translate(${S.px.toFixed(2)}px,${S.py.toFixed(2)}px) scale(${(s * .8).toFixed(3)})`;
      beam.style.opacity = beamOn ? "1" : "0";
      beam.classList.toggle("still", beamOn && idle > 700);
      if (idle > 1100 && visible && !inLock) { S.glint = (S.glint + dt / 3400) % 1; const ph = Math.min(1, S.glint / .5); glint.style.transform = `translate(0,${(-16 + ph * 120).toFixed(1)}px)`; glint.style.opacity = S.glint < .5 ? "1" : "0"; }
      else { S.glint = 0; glint.style.opacity = "0"; }
      if (o.smoke && visible && !inLock) { if (speed > 1.2) spawn(Math.min(3, Math.floor(speed * .22) + (Math.random() < speed * .08 ? 1 : 0))); else if (Math.random() < dt / 900) spawn(1); }
      g2.clearRect(0, 0, rect.width, rect.height);
      for (let i = S.parts.length - 1; i >= 0; i--) {
        const p = S.parts[i]; p.age += dt; if (p.age >= p.life) { S.parts.splice(i, 1); continue; }
        const k = p.age / p.life; p.x += (p.vx + Math.sin(p.age / 320 + p.sw) * .014) * dt; p.y += p.vy * dt;
        const r = p.r + k * 11; g2.globalAlpha = .17 * (1 - k) * Math.min(1, k * 6); g2.drawImage(sprite, p.x - r, p.y - r, r * 2, r * 2);
      }
      g2.globalAlpha = 1;
      if (!visible && !beamOn && S.parts.length === 0 && S.lockA < .01 && S.keyA < .01) { running = false; return; }
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", hide);
    return function unmount() {
      cancelAnimationFrame(frame); ro.disconnect();
      window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerdown", onDown); window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave); window.removeEventListener("blur", hide); document.removeEventListener("visibilitychange", hide);
      root.removeAttribute("data-lc-root"); layer.remove();
    };
  }

  window.LamplightCursorPlayful = { mount };
})();
