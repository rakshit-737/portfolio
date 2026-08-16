# Portfolio Upgrade Prompt

**How to use:** open Claude Code (or any coding agent) in the repo root and say
*"Read UPGRADE_PROMPT.md and follow it"* — or paste everything below the line.
Run phases one at a time; review between them.

---

You are working in my portfolio repo — Next.js 16 (App Router) + TypeScript + Tailwind 4, fully statically exported (`next build` → `./out`), deployed to Vercel and GitHub Pages. Your job: take this site from very good to exceptional — the strongest possible portfolio for software/security-engineering placements and internships — without breaking its concept or constraints.

## Step 1 — Understand the site before touching anything

1. Read `README.md` (the design brief lives there), `src/content.ts` (single source of truth for every word on the site), `src/app/page.tsx`, `src/app/globals.css`, and skim every file in `src/components/` and `src/lib/`.
2. Run `npm install`, `npm run build`, `npm run lint`. The build must stay at zero type errors after every change you make.
3. Internalize the concept you must preserve: **"the evidence file"** — the site reads like a precise researcher's record. Signature elements:
   - The mono **evidence strip** on every card (date · status · stack · repo · tests/CI), augmented at build time with live GitHub stars/head-sha/CI from `src/lib/github.ts`.
   - The typed `verified:` line under the hero name.
   - Graphite palette; **verdict amber** reserved for key numbers only; **steel** for interactive; pass/fail greens/reds only inside metadata chips.
   - Archivo (display) / Public Sans (body) / IBM Plex Mono (all metadata and numbers). Dark, precise, no emoji, minimal deliberate motion.

   Everything you add must strengthen this concept, not dilute it. If a proposed change fights the concept, say so and propose an on-concept alternative.

## Hard rules

- **Never invent facts.** Every claim, metric, project detail, and date comes from `src/content.ts`, the linked repos, or me. If a section needs information you don't have (certificate URL, more achievements, a headshot, "currently building" line), ask me — do not fabricate or embellish. A portfolio that overclaims is worse than a plain one.
- `src/content.ts` stays the single source of truth: any new section or page gets its copy from typed structures exported there.
- The static export must keep working, including GitHub Pages sub-path deploys: route all internal asset/links through the existing `withBase` / `NEXT_PUBLIC_BASE_PATH` mechanism (see `next.config.ts` and `.github/workflows/deploy-pages.yml`). Verify the footer "source" link and workflow assumptions match the actual repo name.
- No heavy dependencies: no UI kits, no animation frameworks. Prefer CSS and small hand-rolled components like the existing ones. Any new dependency needs a one-line justification.
- Accessibility is non-negotiable: full keyboard path, visible focus states, correct landmarks/heading order, WCAG AA contrast, and a `prefers-reduced-motion` fallback for every animation you add.
- Work in small, reviewable commits. **After each phase:** run build + lint, take screenshots at 375px and 1440px, summarize what changed, and pause for my review before the next phase.

## Phase 0 — Audit (report only, change nothing)

- Build and serve `./out`; screenshot 375 / 768 / 1440.
- Record a baseline: first-load JS size, Lighthouse (or equivalent) scores, any console warnings, any lint findings.
- Do a "10-second recruiter skim" review: what is visible above the fold on a laptop and a phone? Is there immediate proof (numbers, CI, repos) or just claims?
- Deliver a findings list ranked by impact vs. effort. Wait for my go-ahead.

## Phase 1 — Visual & UX polish (stay single-page)

- **Typography pass:** stronger hero display scale, consistent vertical rhythm between sections, body measure ~65–75ch, tuned line heights. Small changes, big feel.
- **Hero:** add a quiet CTA row ("view projects →" anchor + résumé download). Surface a compact mono stat strip of 2–3 real headline numbers already in `content.ts` (e.g. CGPA 9.07 · 40 tests in CI · 45,432 dispatch instants) so proof is above the fold. Optionally a *very* faint background texture (ruled grid / dot matrix ≤3% opacity) if it reads as "record paper," not decoration.
- **Nav:** scroll-spy active state for the current section; audit the mobile menu for tap targets and focus trapping.
- **BenchmarkChart:** animate bar growth on first reveal (CSS-only, reduced-motion renders instantly), make the two highlighted tie rows unmistakable, and add a visually-hidden data table for screen readers.
- **Project cards:** bold the single strongest metric per bullet in amber (sparingly); make evidence strips wrap/truncate gracefully at 375px.
- Consistency sweep: hover/focus states, `not-found.tsx` parity with the design, selection color, scrollbar on light-scheme OSes.

## Phase 2 — Content depth (highest-impact phase)

- **Case-study pages** at `/projects/[id]` for the three featured projects (static via `generateStaticParams`), each structured as: problem → approach & architecture (simple inline SVG diagram in the evidence-file style) → key decisions and hard parts → evidence (tests, CI, benchmarks, numbers) → outcome & next steps. Cards link with "read the case file →". Draft all copy from `content.ts` bullets plus the linked repos' READMEs, and show me the drafts for approval before committing — every claim must be traceable.
  - Ask me first: multi-page (default) vs. expandable inline case studies if I'd rather stay single-page.
- **Achievements section** is thin (2 items). Ask me for more (hackathons, CTFs, certifications, rankings) instead of padding it. Also ask me for the missing Cyber Secure 360 `certificateUrl`.
- **Skills:** split the one-line "AI-Native Workflow" entry into proper chips (e.g. Claude Code · spec-first prompting · test generation · agent workflows) — ask me to confirm wording.
- **SEO/discoverability:** extend JSON-LD (`WebSite`, plus `SoftwareSourceCode` per featured project), add `llms.txt`, per-page metadata + OG images for case-study pages, and restyle the OG card to look like an evidence strip (name, role, one headline number, mono provenance line).

## Phase 3 — The site as its own evidence (engineering credibility)

- **CI quality gate** (new workflow alongside deploy): typecheck, lint, build, Playwright smoke tests against the export (page renders, command palette opens with ⌘K, section anchors navigate, résumé link resolves, case-study routes 200), an axe accessibility scan, and a link checker.
- **Self-referential provenance:** point the existing `github.ts` mechanism at this repo and append `site ci: passing · head <sha>` to the footer evidence strip — the portfolio carries its own verification.
- **Performance budget enforced in CI:** first-load JS ≤ ~110 kB, zero CLS, Lighthouse ≥ 95 in all four categories on mobile and desktop against `./out`. Fix regressions rather than lowering the bar.
- Update `CLAUDE.md` with the repo's conventions (concept, hard rules, commands) so future agent sessions stay on-brand.

## Phase 4 — Optional delights (propose first, build only what I approve)

- Light theme toggle — tokens are centralized in `globals.css`, but propose the light "evidence file" palette for approval first; the mood must survive.
- Command palette upgrades: fuzzy matching, copy-email and theme actions, recent items.
- A small terminal easter egg (e.g. `~` opens a mock shell: `whoami`, `ls projects`, `cat resume.txt`) — on-brand for a security engineer; keyboard-accessible and dismissable.
- Privacy-friendly analytics (GoatCounter or Plausible — static-export compatible, no cookies).
- Print stylesheet so Ctrl+P produces a clean one-page summary.

## Definition of done

- `npm run build` and `npm run lint` clean; zero type errors.
- Keyboard-only walkthrough of every page succeeds; axe reports no violations; reduced-motion honored everywhere.
- Lighthouse ≥ 95 across the board (mobile + desktop) on the static export.
- 375/768/1440 screenshots reviewed by me for each phase.
- Every visible claim traceable to `src/content.ts`, a linked repo, or my explicit input — nothing invented.
- Both deploy paths still work: Vercel and GitHub Pages sub-path (`NEXT_PUBLIC_BASE_PATH`).
- `README.md` design notes updated to match what actually shipped.

Start with Phase 0 and report your findings.
