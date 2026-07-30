# UI/UX polish — "evidence file, deepened"

Date: 2026-07-30 · Approved by user ("all of it") after bundle proposal.

Goal: remove the "tasteful template" feel. Every addition deepens the existing
"evidence file" concept; zero new runtime dependencies; design tokens, WCAG AA,
reduced-motion, and static export are all preserved.

## A. Motion + spatial craft

1. **Scroll-orchestrated reveals** — new `Reveal` client wrapper
   (IntersectionObserver, `once: true`). Server HTML stays visible (no-JS
   safe); hydration hides below-fold elements just-in-time, observer reveals
   with a small stagger. `prefers-reduced-motion` disables entirely via CSS.
   Applied to section headers, featured cards, more-project cards.
2. **Nav sliding indicator** — animated underline bar in the desktop nav that
   glides (left/width transition) to the scroll-spy's active link, replacing
   the color-only swap. Hidden when no section is active or on reduced motion
   (jumps instead).
3. **Section numbering** — `Section` takes an `index`; eyebrow renders
   `01 / about` … `08 / contact` in the existing mono style.
4. **Card cursor glow** — `GlowCard` client wrapper sets `--mx/--my` on
   mousemove; a masked border pseudo-element shows a steel radial hairline
   highlight following the cursor. Hover also tints pass/fail evidence-strip
   segments with a faint chip background (`group-hover`). No shadows, no lift.

## B. Signature features

5. **Command palette (`Ctrl/⌘+K`) — "evidence index"** — hand-rolled dialog:
   fuzzy-filterable actions (jump to section, open repos, copy email, download
   résumé, GitHub/LinkedIn). Full keyboard nav (arrows/Enter/Esc), dialog
   semantics, focus restore. A `⌘K` hint chip sits in the desktop nav.
6. **Live evidence** — build-time GitHub API fetch (`src/lib/github.ts`):
   stars, latest commit short SHA + date, latest Actions conclusion per public
   repo. Rendered as extra evidence-strip segments (`★ n`, `head abc1234`,
   `ci: passing`). Fetch failures degrade silently to the current static
   strips (offline local builds keep working). Optional `GITHUB_TOKEN` raises
   the rate limit in CI.

## C. Quick wins

7. **Scrollbar** — thin, hairline-thumb custom scrollbar. (Selection color +
   focus rings already exist; no change.)
8. **404** — already styled with an evidence strip; no change.
9. **Caret persists** — hero typed line keeps a blinking amber caret after
   typing completes (blink disabled by reduced-motion CSS).
10. **Research sparkline** — only if real benchmark numbers are available from
    the scheduler repo; fabricated data is banned on an evidence site.

## Non-goals

Light mode, page transitions, new heavy libraries, redesign of layout/tokens.
