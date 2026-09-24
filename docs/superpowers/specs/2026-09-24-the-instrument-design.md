# The Instrument — Lamplight, pushed into space

Date: 2026-09-24 · Owner brief: "aggressively elevate the UI/UX … award-level
interactive digital experience", plus a cinematic loader ("light the
archive"). Full autonomy (standing preference); this spec records the
design and the rulings it had to make.

## Intent

Keep Lamplight — an engineer's record lit by a moving lamp — and make the
light *physical*: it has a body (an instrument), air (motes), a surface to
rake across (the paint's relief), a start (the ignition) and an end (the
final chamber). Every addition is a consequence of the one lamp, not a
second effect beside it.

## Rulings this design keeps (and the ones it reinterprets)

| Standing rule | How it holds |
|---|---|
| Three values, no fourth | The instrument is bone metal on ground, lit by the lamp; ember only at its lens core (the lamp's own core). Relief and motes are light on the painting — graphics at fractional alpha, never a new hue. |
| One light | Nothing here is a second light source. The ignition *is* the lamp being lit; the instrument's lens *is* the lamp; relief/motes exist only inside the lamp's pool; the contact act's closing vignette is the lamp narrowing. No sweeps, no beams elsewhere. |
| Paintings never move (2026-08-20) | Kept. "Depth" comes from raking light: a shader reads the paint's own luminance as a height field and lights it from the lamp's position. The pixels of the painting never translate, scale or warp. |
| Never scroll-jack | Nothing intercepts wheel/touch. All spatial effects read native scroll. |
| JS-free default is fully lit | Every layer is progressive: no JS, reduced motion, or `data-fx="off"` = today's page exactly. |
| One rAF loop | Lamp.tsx stays the only loop. New renderers subscribe to its tick (`src/lib/lampBus.ts`) and may ask it to keep running while they settle, so idle-stop still holds. |
| Cursor: owner prefers the original key/lock drawing (a6ba23b) | Untouched. Context states arrive as a small *annotation reticle* beside it, not a replacement cursor. |
| Scroll stays silent | Kept in normal mode. Section tones exist only in Deep mode, which is opt-in. |
| No audio files | Kept — new sounds (gear, breath, swell, deep drone) are synthesized. |

## The pieces

1. **Ignition** (loader) — `Ignition.tsx` + a head boot script. A dark
   veil with an ember at the hero lamp's rest point; a calibration ring
   draws itself; the index mark (`RR / ARCHIVE`, the hero plate's real
   credit) resolves; the veil opens from the ember outward, revealing the
   painting, then the name (the real `h1` word-landing, held until now),
   then the nav. The ring flies to the instrument's corner and becomes
   it. Progress is told by real events only: fonts ready → the label
   resolves; hero plate decoded → the ring closes and the ember brightens;
   hydration → the crosshair extends. Modes: `full` first visit ever,
   `brief` (≈450ms sweep) on a later visit, `none` within a session, under
   reduced motion, under `data-fx="off"`, and under automation
   (`navigator.webdriver`, escape hatch `?ignite`). Never blocks: the veil
   is `pointer-events: none`, `aria-hidden`, any scroll/key/pointerdown
   skips to the open, and a CSS failsafe removes it at 4s even if the
   bundle never runs.
2. **Wake** (moment one) — the first real movement (pointer, scroll,
   touch, key) sets `data-awake`: the lamp flares once (`--kindle`), its
   core warms, the instrument's WebGL body loads and spins up, motes fade
   in. GL never loads before this, so Lighthouse's untouched page never
   pays for it.
3. **The Instrument** — `Instrument.tsx` (SVG baseline, a real button:
   opens the control center) + `instrumentGL.ts` (raw WebGL2, no
   dependency): a three-ring gimbal around a glass lens whose core is the
   lamp's ember. Rings settle on springs toward the pointer (desktop),
   touch drag / device tilt where no permission is needed (mobile), and
   scroll progress. Software GL (SwiftShader/llvmpipe) is refused — the
   SVG stays.
4. **Atmosphere** — `atmosphereGL.ts`: one WebGL2 canvas that moves into
   the current act's `.plate` (after `.plate-lit`, before `::after`), so it
   sits under the scrim and never touches text. It draws raking-light
   relief from the painting's luminance and slow motes, both masked to
   the lamp's pool. `soft-light` blend. Deep mode doubles both.
5. **Specimens** (moment two) — each featured project's numbers, stack
   and CTAs sit in a specimen frame: registration marks, a catalogue line
   (`SPEC. 03 · WARDEN · FORGE`), coordinate ticks. On first arrival the
   marks fly in from the frame's corners and a single scan line crosses
   once; on hover the frame tilts ≤4° toward the pointer, its border
   catches the light at the pointer, and the stack chips step forward.
   "Read the case file" hands off through a cross-document View
   Transition: the act's plate morphs into the case file's header plate.
6. **Constellation** — the ledger's skills become a spatial map: group
   hubs with their items, hairlines hub→item, and chords between items
   used by the same project (`featuredProjects`/`moreProjects` `tech`,
   exact-name match only — nothing inferred). Hover/focus lights a node,
   its chords, and a readout of the projects that list it. The same
   markup is the plain list without JS.
7. **System layer** — real telemetry only: lamp `x`/`y`/`r`/`p` per frame,
   the act's plate and year, the build's own sha. A section index on each
   act (`PL. III — FORGE, 1771 · 0.52 / 0.41`). In Deep mode: a vertical
   ruler with the act's progress, the live lamp readout, a faint
   registration grid. No binary, no "SYSTEM ONLINE".
8. **Transitions, per act** — projects: registration + scan (above);
   research: the chart's axis rules draw before its bars grow; ledger: a
   page ruling — hairlines draw left to right, rows rise in sequence;
   contact: the final chamber — as `--p` rises the lamp narrows and the
   frame's edges close in.
9. **Reticle** — cursor context: inspection lens (project specimens),
   measurement brackets (`.ignite`), viewing aperture (open painting),
   departure tag (external links). 24px, hairline bone, lerped, fine
   pointers only, hidden under reduced motion / forced colours.
10. **Control center** — the palette gains: Deep mode, Reduce effects,
    Lighting (lamp / open light), jump-to-metric for every headline
    number, archive rows, certifications, skills, re-light the archive.
    Hidden (typed exactly, never listed): `extinguish`, `relight`,
    `calibrate`.
11. **Deep mode** — `data-deep`: stronger relief and motes, a candle
    flicker in the lamp radius (keeps the loop alive — opt-in only), the
    system overlays, a sub-octave chamber drone, a tonal swell on first
    arrival at each act. `Shift+D` or the palette. Persisted.
12. **Secrets** (unadvertised) — Konami → the instrument opens into an
    exploded view engraved with the build's sha; hold `L` → the lamp is
    snuffed to its ember and follows only the pointer's pool, release to
    relight; visiting all eight acts leaves a mark on the lens and adds
    "archive complete" to the palette; seven clicks on the instrument →
    the same exploded view.
13. **Grain** — one static noise tile generated at runtime to a `data:`
    URL (CSP already allows `img-src data:`), fixed, `overlay`, 4% alpha.

## Fallback tiers (`data-fx`)

`full` → everything. `lite` (coarse pointer + low memory/cores, Save-Data,
2g/3g, software GL) → no relief shader, motes only if GL is fast, SVG
instrument. `off` (reduced motion, forced colours, or the user's "Reduce
effects") → today's page. The tier is decided in the head boot script so
nothing flashes.

## Budgets

Eager JS stays under the 214 kB gate: every GL module and the
constellation's line drawing are dynamic imports. No new dependency. No
new CSP allowance (no blob:, no workers).

## Testing

Existing suite stays green (automation skips the ignition by design; the
wake/GL path self-disables on software GL). New tests: ignition modes
(forced by `?ignite`), reduced-motion/no-JS no-veil, never blocks input,
instrument is a real button with a name, constellation readout traces to
content, palette commands exist, deep mode toggles and persists, budget
and CSP unchanged.
