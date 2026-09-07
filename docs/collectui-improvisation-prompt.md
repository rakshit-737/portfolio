# CollectUI improvisation prompt — Lamplight portfolio

**What this is.** A copy-pasteable brief for a coding agent (Claude Code / opencode, run from the repo root) that raises the *interaction craft* of the portfolio to the level of the best CollectUI shots — without breaking the world the site already has. Every idea below was pulled from collectui.com on 2026-09-07 (Button, Navigation, Header Navigation, Hover State, Framer, Command Bar, Stamp, Text Effect, Portfolio, Scroll Animation, Switch Button, Mobile Menu) and then *translated* into the site's own grammar: three colours, square corners, hairlines, one lamp, one authored moment per act.

**How to use it.** Save this file in the repo (it lands at `docs/collectui-improvisation-prompt.md`), open the agent in the repo root, and paste everything between the `PROMPT START` / `PROMPT END` markers — or just say `read @docs/collectui-improvisation-prompt.md and do Phase 0`. Run it in phases; don't let it do everything in one go.

---

<!-- PROMPT START -->

## Role and ground rules

You are working inside my portfolio repo (Next.js 16 App Router, React 19, TypeScript, Tailwind 4, static export). Before touching anything, read `AGENTS.md`, `DESIGN.md`, `src/app/globals.css`, `src/lib/motion.ts`, `src/components/Lamp.tsx`, `src/components/Bracket.tsx`, `src/components/Nav.tsx`, and `tests/helpers.ts`. `AGENTS.md` and `DESIGN.md` are the authority; where this brief and they disagree, they win and you tell me.

The job: improvise on a curated set of CollectUI micro-interactions so this site's buttons, navigation, hover states, palette and small text moments feel as considered as the best Dribbble/X shots — **while keeping every rule the site already enforces.** You are translating, not copying. Every reference below is a modern SaaS shot (rounded, gradients, shadows, springs); what you take from each is the *behaviour*, never the look.

Non-negotiables (these are already CI gates or named rules — re-read them in `DESIGN.md` before each task):

1. **Three values, no fourth.** `--color-ground #08070A`, `--color-signal #F2EDE3`, `--color-ember #E8A33D`. No grey, no second accent, no gradient except the lamp's own and the hairline rules (`--color-rule` / `--color-rule-soft` are signal at fractional alpha — graphics only, never type).
2. **Ember is rare.** Ember touches a lit `.ignite` number, the lamp's core, and a `Bracket` seal on hover/focus. Nothing you add may use ember — not a beam, not a marker, not a tooltip border.
3. **No radius, no shadow, no blur, no filled panel, no 3D tilt, no glassmorphism, no `filter: blur()` "gooey" tricks.** Everything is a square, a hairline, or a colour swap.
4. **Emphasis is a local colour swap** (a control swaps its own ground/mark), never a region inversion, never dimmed text, never partial-opacity text.
5. **One light.** The lamp is the only thing that follows the cursor or glows. Any new pointer-follow must read `POINTER_LERP` from `src/lib/motion.ts` — but prefer adding none.
6. **The paintings never move.** No parallax, push-in, mask tricks or filters on any `Plate`. Exhibits and certificate thumbnails are the only imagery you may touch, and only as stated below.
7. **One authored moment per act, once.** New motion must either ride the existing `data-seen` beat (`globals.css`, the `.scrim > *` reveal) or be a *response to input* (hover, focus, press, keyboard, state change). No new entrance animations, no scroll-jacking, no sticky content columns, nothing pinned.
8. **Motion budget per interaction: ≤ 240 ms, one property or two (`transform`, `opacity`, `color`, `background-color`), the site's easing `cubic-bezier(0.16, 1, 0.3, 1)` for movement and `ease` for colour.** No springs, no bounce, no infinite loops, no animation on hover of the paintings.
9. **Zero new dependencies.** CSS, the Web Animations API, the View Transitions API and the native `popover`/`<dialog>` are all you get. No Framer Motion, GSAP, Lenis, Motion One, cmdk, Radix, Base UI, polyfills. (CollectUI's "Framer" category means *sites built in Framer* — that is a visual reference, not a library to add.)
10. **Reduced motion, no-JS, print, forced-colors.** Every addition must be inert under `prefers-reduced-motion: reduce` (the existing `@media` block in `globals.css` zeroes CSS durations — verify yours are covered; **WAAPI animations created in JS are not covered by it**, so check `matchMedia('(prefers-reduced-motion: reduce)').matches` before calling `element.animate()` and skip straight to the end state), invisible or harmless with JS off, dropped in print, and must not override native cursors under `forced-colors`.
11. **Sound stays where it is.** `playUi()` from `src/lib/sound.ts`, one delegated click chime, `data-voice` on any button with its own sound, never a sound on hover, scroll or focus, and never as the only confirmation.
12. **Accessibility is a gate.** Full keyboard path, `:focus-visible` distinct from hover, 44 px targets on controls, heading walk unchanged, axe at zero violations on `/` and all three case files. A decorative marker is `aria-hidden`; anything that conveys state also conveys it in text or ARIA.
13. **Budgets.** Gzipped JS ≤ 214 kB per page (`npm run budget`). The whole Phase 1 set must add ≤ 3 kB gzipped in total. Report the delta.
14. **`src/content.ts` is the only source of words.** You may not invent a label, a proof, a date, a metric or a caption. If an interaction needs copy that isn't in `content.ts`, stop and ask.
15. **Internal links and assets go through `withBase()`** so the GitHub Pages sub-path build keeps working. Never `next/link` prefetch (the smoke test guards the 404).
16. Compound `<html>` attribute selectors are written `[data-a][data-b]` with no space. Never name a class `invert`. Document order is paint order inside `.plate` — don't touch that stack.

Ask me before doing anything that: adds a dependency, uses ember anywhere new, adds a fourth colour value, touches a `Plate`, adds a sound, narrows or rewrites a named rule in `DESIGN.md`, or measures layout in a rAF loop (the lamp is the only rAF loop on the site; idle-stop must keep working — `tests/idle-stop.spec.ts`).

## Working method

- **Phase 0 — plan.** Read the files above. For every improvisation in Phase 1, write a 5-line plan: files, approach, the DESIGN.md sentence you'll add, the test you'll add, the risk to an existing gate. Show me the plan and stop.
- **Phase 1 — ship the six.** One improvisation per commit. After each: `npm run typecheck && npm run lint && npm run build && npm run budget && npm run check:links && npm run check:content && npm test`. All green or you report the conflict — never weaken a threshold or skip a test.
- Each commit also: (a) adds or extends a Playwright spec in `tests/` (there is already a spec per concern — `brand`, `cursor`, `a11y`, `motion`, `sound`, `mobile`, `hirepath`, `lamplight`; put yours next to the closest one), (b) adds a short component note to `DESIGN.md` in the *Components* section and, if a rule is narrowed by exactly one component, names the narrowing there the way the Bracket seal's ember exception is named, (c) records a one-line entry in `AGENTS.md` only if a future agent needs to know a new invariant, (d) captures before/after screenshots at 1440×900 and 390×844 into `docs/screens/` using the Playwright helpers, and (e) checks reduced-motion, no-JS (`javaScriptEnabled: false`) and print with the existing lamplight/a11y patterns.
- **Phase 2** and **Phase 3** only after I've reviewed Phase 1.
- When a reference conflicts with a rule, the rule wins; implement the closest compliant version and say what you dropped.

## Phase 1 — six improvisations to ship

### 1. The cartouche presses like a seal, and its arrow leads

**Take from:** Tural @turaluix — *"Clicks that leave fingerprints"* (a press leaves a mark) · <https://collectui.com/designs/button-ui-design-inspiration/17fd3778-78f5-4f27-9bbb-290066e6044a>; Widya Bayu W @RalconStudio — the arrow slides ahead of the label on hover · <https://collectui.com/designs/button-ui-design-inspiration/838d0c10-4094-4bbd-8194-12a8d3cbd79f>; adrian @adrianabelarde_ — a ticket gets *stamped* on confirmation · <https://collectui.com/designs/stamp-ui-design-inspiration/9d130fa3-e8d8-4e24-b7c2-3b7e638ffef8>.

**Translate into:** `src/components/Bracket.tsx` + `globals.css`.
- `:active` on `.bracket`: the inner label chamber translates 1 px down and the seal's solid wax square scales `1 → 0.75 → 1` over 120 ms — the seal being pressed. Transform only; hover's colour swap and the ember-on-hover/focus seal are untouched.
- Any `BracketLink` whose children include a lucide `ArrowUpRight` (the external ones — "Browse all repositories", the project repo links): on hover/focus-visible the arrow translates `+2px, −2px` over 160 ms and returns. Nothing else moves.
- Keep `min-h-11` hit areas and the doubled hairline geometry; the outer ring never changes.
- Tests: extend `tests/cursor.spec.ts` or `brand.spec.ts` — seal is bone at rest (no ember without hover/focus), the label chamber has no transform at rest, reduced-motion shows no transform at any state, tap target still ≥ 44 px on 390×844 (`mobile.spec.ts` already measures).

### 2. Confirmation is a stamped label, not a swapped one

**Take from:** Swami @SwamiMalode — inline confirm morph · <https://collectui.com/designs/button-ui-design-inspiration/7cd5478b-878c-4fa2-a72d-e21896c6855f>; lochie @lochieaxon — *torph*, dependency-free text-to-text transitions on the Web Animations API · <https://collectui.com/designs/text-effect-ui-design-inspiration/a04b0dc6-fb99-4af4-9a58-e0410dba0289>.

**Translate into:** `src/components/CopyEmailButton.tsx`, `src/components/SoundToggle.tsx`, a tiny shared `src/components/MorphLabel.tsx` (WAAPI, < 40 lines, 0 deps).
- When the label text changes ("Copy" → "Copied", "Soundscape: on" → "off"), the outgoing word slides up 0.3 em and out, the incoming slides in from below, 180 ms, the site's easing — the same word-by-word device the statement already uses, so it reads as one voice. The `Check` icon on copy success scales `1.3 → 1` in 160 ms: the stamp landing.
- One accessible name, one text node per state — no duplicated text for AT (see `Ignite.tsx`'s history for why). The existing `aria-live="polite"` announcement and the 2 s reset stay. `playUi("seal")` and `data-voice` stay exactly as they are.
- Reduced motion: instant swap (today's behaviour). No JS: the buttons are already client-only; nothing to do.
- Tests: extend `tests/sound.spec.ts`/`sound-blocked.spec.ts` — copy still succeeds, the visible text still reads "Copied", the live region still fires; add a reduced-motion assertion that no `Animation` is running (`document.getAnimations()`).

### 3. The active section is carried, not swapped

**Take from:** Jerry @JerryDizs — *"Navbar indicator on a Bézier curve"* · <https://collectui.com/designs/navigation-ui-design-inspiration/9f343652-7a1e-487e-b5ff-278ef0da84b6>; Kailash @kail_designs — one highlight that glides under the active tab · <https://collectui.com/designs/navigation-ui-design-inspiration/bf71a0fa-3cd9-45f2-93e1-8322a43e2863>; Swami @SwamiMalode — "gooey navbar" (take *one travelling highlight*; the goo is a blur filter and is banned) · <https://collectui.com/designs/header-navigation-ui-design-inspiration/1859d1a8-7cda-4d8b-9755-fcd8a605dceb>.

**Translate into:** `src/components/Nav.tsx` + `globals.css`.
- At `min-[90rem]` the `bg-signal text-ground` block that marks the active section link should *travel* to the next link instead of snapping. Do it with the View Transitions API (Baseline since 2025-10; Chrome 111+, Safari 18+, Firefox 144+): give the active link's highlight a `view-transition-name` (only the active one carries it, so the name moves between links and the browser animates the group from the old box to the new — a shared-element transition), wrap the state change in `document.startViewTransition(() => flushSync(() => setActive(id)))` when it exists (`flushSync` from `react-dom`, so the DOM is updated inside the callback), and set `::view-transition-group(nav-active)` to 240 ms with the site's easing. Unsupported browsers get today's instant swap. **Do not measure link positions in JS** — the Nav comment says nothing here measures at runtime, and that stays true.
- Keep `aria-current="location"` as the source of truth; the visual is decoration. Keyboard focus is never moved by a transition (view transitions don't manage focus — leave it where it is).
- `prefers-reduced-motion`: `::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important }`.
- Tests: extend `tests/brand.spec.ts` — `aria-current` still moves through all sections on scroll (the existing scroll-spy), the transition never fires under reduced motion, and `hirepath.spec.ts` interaction counts are unchanged.

### 4. Numbers turn like instruments: the clock and the act counter

**Take from:** Cuvii @thecuvii — split-flap departure-board text · <https://collectui.com/designs/text-effect-ui-design-inspiration/932e67b8-bd2a-4055-add9-6a8c312875e3>; Ahmet Loca @ahmetloca — the huge numeral ticks over as sections pass · <https://collectui.com/designs/framer-ui-design-inspiration/71b15c89-e651-4715-a3c6-e992ac853dce>.

**Translate into:** `src/components/LiveClock.tsx` and the `NN/08` indicator in `Nav.tsx`.
- Only the characters that changed animate: an odometer, not a flap — the old glyph translates up 0.6 em and out, the new one in from below, 180 ms, tabular Chivo Mono so nothing reflows. Render each character in its own inline-block `<span>` — real text, no `aria-hidden`, so the accessible name is unchanged — and drive the change with one WAAPI animation per changed span. The clock's `setInterval` stays a `setInterval` (never a rAF — the lamp's idle-stop contract), and the `<time datetime>` stays a single element.
- Under reduced motion the digits simply change. No animation on the server placeholder (`CLOCK_PLACEHOLDER`) → first reading swap.
- Guard cost: at most 2–3 spans animate per second; confirm with `document.getAnimations().length` in a test that it is 0 when idle between ticks.
- Tests: extend `tests/brand.spec.ts` — `[data-clock]` text still matches `formatClock()`'s shape, `NN/08` still pads to two digits and tracks `aria-current`, no running animations under reduced motion.

### 5. Receipts you can see: provenance and the VERIFIED strip get a hairline tooltip

**Take from:** Colm Tuite @colmtuite — tooltip that follows the trigger (Base UI) · <https://collectui.com/designs/hover-state-ui-design-inspiration/c7089157-21dc-44df-9aaf-93f65f82a339>; jamie @byJWXN — hovering an inline link pops a preview of the thing linked · <https://collectui.com/designs/hover-state-ui-design-inspiration/c086d239-c52e-4c5f-b11f-3cf203e08634>; Noe @noechague — *"every company name pulls up a photo stack tied to that era when you hover it"* (ours pulls up the proof, not photos) · <https://collectui.com/designs/portfolio-ui-design-inspiration/eab6bc60-4950-464c-9750-6b6ef9c10604>.

**Translate into:** the hero VERIFIED strip in `src/app/page.tsx` (the `hero.provenance.tokens` map with `aria-describedby="hero-proof-N"`) and `src/components/Provenance.tsx`.
- The proof text that is currently `sr-only` (`t.proof`) becomes a visible tooltip on hover **and** focus-visible: a `.label` line in a `border border-signal bg-ground` box, square, no shadow, no arrow, opening after 120 ms, sitting directly under the token (a `relative` wrapper + `absolute; top: 100%` — do **not** use CSS anchor positioning, `interestfor` or `popover="hint"`; support is incomplete and polyfills are banned). Keep `aria-describedby` pointing at the same element so AT behaviour is unchanged — which means the hidden state stays `sr-only` (clipped, still in the accessibility tree), never `display: none`. Escape closes it; the pointer may move onto it without it closing; it never covers the token (WCAG 1.4.13).
- In `Provenance.tsx`, only segments that already carry an `href` get the tooltip, and its text is the segment's *destination* stated from existing data (e.g. the `label` + the hostname of `href`) — no new copy. If that reads as noise, do the hero strip only and say so.
- Print: hidden. No-JS: pure CSS `:hover`/`:focus-within` still works; only Escape needs JS.
- Tests: extend `tests/a11y.spec.ts` — axe zero with a tooltip open; keyboard: Tab to a token shows it, Escape hides it, focus stays on the token; `hirepath.spec.ts` unchanged.

### 6. The ledger's one marker glides between records

**Take from:** Noe @noechague — *"the cursor doesn't just highlight a row in my events list, it slides an arrow down to meet it"* · <https://collectui.com/designs/hover-state-ui-design-inspiration/276f59a5-79d6-4fd2-a502-52a0b90092c0>; Rachit Thakur @RachitThakur146 — text-only "Work" rows with one hover device · <https://collectui.com/designs/hover-state-ui-design-inspiration/b6872027-0966-4451-9d58-0badf9187906>.

**Translate into:** the Achievements and Archive lists in the ledger act (`src/app/page.tsx`, the `moreProjects.map` rows and the achievements section) and the command palette's result list (`src/components/CommandPalette.tsx`).
- One shared, `aria-hidden` seal-square marker (the same 6–8 px solid square the sine's nodes and the seal use, bone, never ember) sits in the left gutter of the hovered or focused row and *travels* to the next row instead of each row lighting independently. Rows keep their `border-b border-rule` grammar with no background fill; the marker is the only hover device. Keyboard focus inside a row (`:focus-within`) moves it too.
- Implementation: a single positioned element per list; on `pointerenter`/`focusin` write `--row-y` (the row's `offsetTop`, read once per event — not per frame, not in rAF) and let CSS transition `transform` over 200 ms. Below `md` (touch), don't render it at all.
- In the palette, the selected row keeps its `bg-signal text-ground` swap (that's the accessible state); the marker is an extra beat that follows the selection as the user arrows through results. The wood tap on open/close and the `⌘K`/`Ctrl K` path in `smoke.spec.ts` are untouched.
- Tests: a small `tests/ledger.spec.ts` — hovering the second archive row moves the marker's transform; Tab into a row moves it; it does not exist at 390×844; reduced motion leaves no transition.

## Phase 2 — after review (pick with me)

- **Square switch for the soundscape.** Camden @Designownow_ — the one *square* toggle on CollectUI · <https://collectui.com/designs/switch-button-ui-design-inspiration/26f9d8ca-fb22-4e7f-9b6e-0f29b3c59128>; Lynel @LynelSkroll — "if modern UI existed when screens were black and white" (a two-value control's mood) · <https://x.com/lynelskroll/status/2004547492676038776>. Render `SoundToggle` as a hairline square track with a solid signal knob that slides (transform, 160 ms) beside the existing "Soundscape: on/off" text — the text remains the state; the brass click remains.
- **An eight-notch act rail.** Lucas Jin @lucashjin — *"what if scrollbars were less boring"* · <https://collectui.com/designs/scroll-animation-ui-design-inspiration/905e2d60-4c25-4a4b-825b-182498f0f872>; SHARIAR @shariar_design — "Scroll Island" showing the current heading · <https://collectui.com/designs/scroll-animation-ui-design-inspiration/370324eb-683d-497d-879d-012a7b594e79>; Kazden @kazdenc — eight numbered geometric stamps · <https://collectui.com/designs/stamp-ui-design-inspiration/e88ceb7f-c62e-47bc-b76b-47ae6a6b381c>. At `lg+`, a `nav aria-label="Acts"` of eight square hairline notches fixed at the right edge, reading the **same** scroll-spy state Nav already holds (no second observer, no scroll-driven animation), the active one filled; hover shows `acts[id].label` in `.label`. On phones the `NN/08` reading moves into a square hairline chip bottom-right. This is fixed chrome like the header, not a sticky content column — confirm that reading of the Not-Pinned Rule with me first.
- **Palette metadata chips + masked overflow.** Ilya Miskov @ilyamiskov — a bar whose rows carry metadata chips · <https://collectui.com/designs/command-bar-ui-design-inspiration/cbefe0d1-9a34-4e5c-b3db-15dfec02264a>; Pasquale Vitiello @pacovitiello — *"fade effect on scroll overflow w/ CSS masking"* · <https://collectui.com/designs/command-bar-ui-design-inspiration/31f84a41-5e56-44ca-a09d-3175e9fcd0dd>. Each case-file result in `CommandPalette.tsx` carries `.label` chips from data already in `content.ts` (act number, section, stack); the list's top/bottom overflow edges use a `mask-image` (a graphic — allowed) instead of a hard clip. Never dim the rows themselves.
- **Case-file live index.** Bema @bemiiis — a catalogue index that marks the current row as you scroll · <https://collectui.com/designs/scroll-animation-ui-design-inspiration/d12510a3-8ec5-4f8a-8142-b859053589f8>. In `src/app/projects/[id]/page.tsx`, the sticky `.case-heading` column lists all five sections (Problem → Outcome) with the current one swapped signal/ground, driven by one `IntersectionObserver`; the palette's deep-link slugs are reused. This changes the case-file grammar in `DESIGN.md` — propose first.
- **Certificate thumbnails resolve from coarse blocks.** Adi @AdityaSur11 — "pixelated hover animation" · <https://collectui.com/designs/hover-state-ui-design-inspiration/dc9e6716-cf19-444f-951f-8538f5ccbaac>. On hover/focus of a `CertificateLightbox` thumbnail, a tiny (≈24 px wide) copy rendered with `image-rendering: pixelated` cross-fades to the real thumb in 200 ms. Never a plate. Costs one extra asset tier per certificate — check `npm run budget` and the Museum-Plate Rule before doing it.

## Phase 3 — flagged, probably no (owner decides)

- **A lamplight beam around the cartouche** — Jakub Antalik @Jakubantalik, "Border beam" · <https://collectui.com/designs/button-ui-design-inspiration/2dbd6018-e437-46ee-89dc-b57b2a9c26c4>. A short segment of full-strength signal travelling once around `.bracket`'s outer 1 px ring on hover (conic gradient masked to the ring, `@property`-animated angle, bone only, never ember). It is beautiful and it is arguably a second light — it narrows the One-Light Rule. Prototype it behind a `data-beam` attribute on one hero button, show me, and don't ship without a yes.
- **Scramble-in for the case-file provenance line** — Gustav @gustavwf, "Scrambly Text" · <https://x.com/gustavwf/status/2005669448347443293>. Only ever on the mono provenance line inside the case-file header's existing `data-reveal` beat, never on a Newsreader statement, never on the index. Likely too noisy.
- **A stipple portrait** — Dawood @dawood_adib · <https://collectui.com/designs/framer-ui-design-inspiration/f6cc125d-5dfd-413a-810b-b756b846b475>. Only if a headshot is ever added; conflicts with the Plates-Are-The-Only-Imagery Rule as written. Do not build.

## What NOT to bring back from CollectUI (seen, rejected)

Gooey/blurred navbars; 3D and "realistic" buttons; jelly/rounded iOS toggles; liquid-glass anything; polaroid/photo navbars; boarding-pass or card-reader *gates* before content (Mike Barton's intro — it is charming and it violates Lamp-Dramatizes-Never-Gates); parallax clouds and any scroll-scrubbed imagery; WebGL shader stamps; ASCII glitch ripples on the terminal exhibit; hover sounds; anything that dims the rest of the page to spotlight a control (the torch was removed for exactly that).

## Definition of done for Phase 1

- Six commits, each self-describing (`feat(bracket): press and arrow lead — ref CollectUI/@turaluix, @RalconStudio`).
- All gates green: `check:art`, `typecheck`, `lint`, `build`, `budget` (report the gzipped delta per page; total ≤ +3 kB), `check:links`, `check:content`, `npm test` (axe zero on `/` and the three case files), and the Lighthouse script not lowered.
- `DESIGN.md` Components section updated per item; any narrowed rule named as such.
- `docs/screens/` has before/after pairs at 1440×900 and 390×844 for each item, plus one reduced-motion and one no-JS capture of the index.
- A closing note listing what you dropped from each reference to stay inside the rules, and the two or three things you'd do next.

<!-- PROMPT END -->

---

## Appendix — the full CollectUI reference sheet (for browsing)

Category pages (pattern `https://collectui.com/designs/<slug>-ui-design-inspiration`): Button (93), Navigation (16), Header Navigation (5), Hover State (46), Framer (147), Command Bar (14), Stamp (17), Text Effect (25), Portfolio (109), Scroll Animation (87), Switch Button (15), Mobile Menu (5). Also worth a look later: UI Interaction (640), Motion (272), Web Animation (113), Terminal Aesthetic (41), Typography (31), Tooltip / Popover (27), Footer (47), Dark Mode (103).

| Ref | Designer | What it does | CollectUI | Source post | Used in |
| --- | --- | --- | --- | --- | --- |
| Border beam | Jakub Antalik @Jakubantalik | Light beam travels around a button's border (React, 5 types) | [link](https://collectui.com/designs/button-ui-design-inspiration/2dbd6018-e437-46ee-89dc-b57b2a9c26c4) | [x.com](https://x.com/Jakubantalik/status/2067633938038698097) | Phase 3 |
| Clicks that leave fingerprints | Tural @turaluix | Press leaves a mark; arrow chamber | [link](https://collectui.com/designs/button-ui-design-inspiration/17fd3778-78f5-4f27-9bbb-290066e6044a) | [x.com](https://x.com/turaluix/status/2023356570730639820) | P1 #1 |
| Book Free Strategy Call | Widya Bayu W @RalconStudio | Arrow slides ahead on hover | [link](https://collectui.com/designs/button-ui-design-inspiration/838d0c10-4094-4bbd-8194-12a8d3cbd79f) | [x.com](https://x.com/RalconStudio/status/2085680487822246097) | P1 #1 |
| Request Demo ×4 | reva @revaharke | Four hover variants: icon swap, fill sweep, arrow | [link](https://collectui.com/designs/button-ui-design-inspiration/45f70587-d03f-4096-a6fe-38fb4e3849ee) | [x.com](https://x.com/revaharke/status/2075195538413400417) | reference |
| A brick button | Camden @Designownow_ | Split label/arrow chamber separates on hover | [link](https://collectui.com/designs/button-ui-design-inspiration/57562944-8212-4e07-a660-d129ce762f11) | [x.com](https://x.com/Designownow_/status/2072394692315247059) | reference |
| Inline confirm morph | Swami @SwamiMalode | Icon button expands to check / cancel | [link](https://collectui.com/designs/button-ui-design-inspiration/7cd5478b-878c-4fa2-a72d-e21896c6855f) | [x.com](https://x.com/SwamiMalode/status/2095920200256573466) | P1 #2 |
| torph | lochie @lochieaxon | Text→text transitions, WAAPI, 0 deps | [link](https://collectui.com/designs/text-effect-ui-design-inspiration/a04b0dc6-fb99-4af4-9a58-e0410dba0289) | [x.com](https://x.com/lochieaxon/status/2023434902814003315) | P1 #2 |
| Polar Express golden ticket | adrian @adrianabelarde_ | Ticket is stamped on confirmation | [link](https://collectui.com/designs/stamp-ui-design-inspiration/9d130fa3-e8d8-4e24-b7c2-3b7e638ffef8) | [x.com](https://x.com/adrianabelarde_/status/2076579240880046183) | P1 #1/#2 |
| Navbar indicator on a Bézier curve | Jerry @JerryDizs | Active indicator travels along a curve on scroll | [link](https://collectui.com/designs/navigation-ui-design-inspiration/9f343652-7a1e-487e-b5ff-278ef0da84b6) | [x.com](https://x.com/JerryDizs/status/2092359439793705232) | P1 #3 |
| Gliding tab highlight | Kailash @kail_designs | One highlight glides under the active item | [link](https://collectui.com/designs/navigation-ui-design-inspiration/bf71a0fa-3cd9-45f2-93e1-8322a43e2863) | [x.com](https://x.com/kail_designs/status/2060051529835688054) | P1 #3 |
| Gooey navbar | Swami @SwamiMalode | Highlight morphs between tabs (blur — take the travel only) | [link](https://collectui.com/designs/header-navigation-ui-design-inspiration/1859d1a8-7cda-4d8b-9755-fcd8a605dceb) | [x.com](https://x.com/SwamiMalode/status/2094065656648134690) | P1 #3 |
| Split-flap text | Cuvii @thecuvii | Departure-board letters flip into place | [link](https://collectui.com/designs/text-effect-ui-design-inspiration/932e67b8-bd2a-4055-add9-6a8c312875e3) | [x.com](https://x.com/thecuvii/status/2094747297578115324) | P1 #4 |
| Scrolling Images "01" | Ahmet Loca @ahmetloca | Big numeral ticks as sections pass | [link](https://collectui.com/designs/framer-ui-design-inspiration/71b15c89-e651-4715-a3c6-e992ac853dce) | [x.com](https://x.com/ahmetloca/status/2087140797594341706) | P1 #4 |
| TooltipTrackCursor | Colm Tuite @colmtuite | Tooltip tracks the cursor along the trigger | [link](https://collectui.com/designs/hover-state-ui-design-inspiration/c7089157-21dc-44df-9aaf-93f65f82a339) | [x.com](https://x.com/colmtuite/status/2086771570249269449) | P1 #5 |
| Link preview pop-up | jamie @byJWXN | Hovering a link previews the target | [link](https://collectui.com/designs/hover-state-ui-design-inspiration/c086d239-c52e-4c5f-b11f-3cf203e08634) | [x.com](https://x.com/byJWXN/status/2079313240027471951) | P1 #5 |
| Bio as a component | Noe @noechague | Company names reveal an era on hover | [link](https://collectui.com/designs/portfolio-ui-design-inspiration/eab6bc60-4950-464c-9750-6b6ef9c10604) | [x.com](https://x.com/noechague/status/2095254441901412806) | P1 #5 |
| Events list arrow | Noe @noechague | One arrow glides down to the hovered row | [link](https://collectui.com/designs/hover-state-ui-design-inspiration/276f59a5-79d6-4fd2-a502-52a0b90092c0) | [x.com](https://x.com/noechague/status/2088227391986405546) | P1 #6 |
| Work rows | Rachit Thakur @RachitThakur146 | Text-only portfolio rows with one hover device | [link](https://collectui.com/designs/hover-state-ui-design-inspiration/b6872027-0966-4451-9d58-0badf9187906) | [x.com](https://x.com/RachitThakur146/status/2089571013495529778) | P1 #6 |
| Simple contact interaction | Adi @AdityaSur11 | Email reveals a label chip; icon row reveals labels | [link](https://collectui.com/designs/hover-state-ui-design-inspiration/3cbd1043-2ac5-42b4-9079-62cf72d5509a) | [x.com](https://x.com/AdityaSur11/status/2079393424290001302) | reference |
| Square toggle | Camden @Designownow_ | The one square switch on the site | [link](https://collectui.com/designs/switch-button-ui-design-inspiration/26f9d8ca-fb22-4e7f-9b6e-0f29b3c59128) | [x.com](https://x.com/Designownow_/status/2042377028864000170) | P2 |
| 1-bit UI | Lynel @LynelSkroll | "If modern UI existed when screens were B&W" | — | [x.com](https://x.com/lynelskroll/status/2004547492676038776) | P2 mood |
| Less boring scrollbars | Lucas Jin @lucashjin | Scrollbar that reads position/section | [link](https://collectui.com/designs/scroll-animation-ui-design-inspiration/905e2d60-4c25-4a4b-825b-182498f0f872) | [x.com](https://x.com/lucashjin/status/2091183304506507434) | P2 |
| Scroll Island | SHARIAR @shariar_design | Floating chip shows the current heading | [link](https://collectui.com/designs/scroll-animation-ui-design-inspiration/370324eb-683d-497d-879d-012a7b594e79) | [x.com](https://x.com/shariar_design/status/2046252889447039253) | P2 |
| Eight stamps | Kazden @kazdenc | Numbered geometric stamps, drawn | [link](https://collectui.com/designs/stamp-ui-design-inspiration/e88ceb7f-c62e-47bc-b76b-47ae6a6b381c) | [x.com](https://x.com/kazdenc/status/2060790768378282068) | P2 |
| Metadata-chip bar | Ilya Miskov @ilyamiskov | Command bar rows carry EXIF-like chips | [link](https://collectui.com/designs/command-bar-ui-design-inspiration/cbefe0d1-9a34-4e5c-b3db-15dfec02264a) | [x.com](https://x.com/ilyamiskov/status/2087550129976787173) | P2 |
| Base UI Command | Pasquale Vitiello @pacovitiello | Masked overflow fade, no deps | [link](https://collectui.com/designs/command-bar-ui-design-inspiration/31f84a41-5e56-44ca-a09d-3175e9fcd0dd) | [x.com](https://x.com/pacovitiello/status/2001972145413656601) | P2 |
| Catalogue index | Bema @bemiiis | Index rows mark the current item on scroll | [link](https://collectui.com/designs/scroll-animation-ui-design-inspiration/d12510a3-8ec5-4f8a-8142-b859053589f8) | [x.com](https://x.com/bemiiis/status/2088828952944988464) | P2 |
| Pixelated hover | Adi @AdityaSur11 | Image resolves from coarse blocks | [link](https://collectui.com/designs/hover-state-ui-design-inspiration/dc9e6716-cf19-444f-951f-8538f5ccbaac) | [x.com](https://x.com/AdityaSur11/status/2083575984263958736) | P2 |
| File-path truncation | JohnPhamous @JohnPhamous | Keeps the start and the file name | [link](https://collectui.com/designs/text-effect-ui-design-inspiration/af41c708-9d82-44ca-8e37-6399ca7be238) | [x.com](https://x.com/JohnPhamous/status/1993020612785377791) | reference (ledger truncation already keeps the metric) |
| Forja template | Miguel Queirós @DopeOblivion | Classical painting + mono code UI — closest *world* on the site | [link](https://collectui.com/designs/framer-ui-design-inspiration/e0238590-55ba-489d-8ef2-c3f7ab497471) | [x.com](https://x.com/DopeOblivion/status/2092996828752916622) | mood |
| Projects nav | OPM @mihirtwt | Dark, serif, sparse section nav | [link](https://collectui.com/designs/navigation-ui-design-inspiration/67e80690-2ed1-4482-b0af-119f3cb25883) | [x.com](https://x.com/mihirtwt/status/2016164301329871130) | mood |
| Writings. | Bill Guo @loficosmos1 | Editorial portfolio with a stamp | [link](https://collectui.com/designs/stamp-ui-design-inspiration/8254cc93-95fa-48ba-b414-0cc2209cd820) | [x.com](https://x.com/loficosmos1/status/2059417845549682705) | mood |
| Scrambly Text | Gustav @gustavwf | Scramble-in for titles | — | [x.com](https://x.com/gustavwf/status/2005669448347443293) | Phase 3 |
| Stipple morph | Dawood @dawood_adib | Dot-stipple portrait morph | [link](https://collectui.com/designs/framer-ui-design-inspiration/f6cc125d-5dfd-413a-810b-b756b846b475) | [x.com](https://x.com/dawood_adib/status/2090437307761328634) | Phase 3 (no) |
| Boarding-pass intro | Mike Barton (via @cameronmoll) | Swipe a pass through a reader to enter | — | [x.com](https://x.com/cameronmoll/status/2093333082912829808) | rejected (a gate) |
| cuelume | Daniel White @dwhitedesign | 10 UI sound cues synthesised live, ~2 kB, 0 deps | — | [x.com](https://x.com/dwhitedesign/status/2075718377922769343) | same philosophy as `src/lib/sound.ts` |
