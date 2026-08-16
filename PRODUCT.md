# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Four confirmed audiences, all arriving to evaluate one person:

- **Recruiters / HR screeners** — semi-technical, short scan, checking eligibility,
  CGPA, stack keywords, resume availability.
- **Engineering hiring managers** — technical, will open a case study and a repo,
  and will judge whether the claims survive contact with the code.
- **Campus placement panels** — VIT Chennai placement drives and company panels
  evaluating this candidate alongside many others on a fixed rubric.
- **Research / academic contacts** — professors, labs, and conference contacts
  evaluating the Proactive Feasibility Scheduler study and its in-progress
  LaTeX manuscript.

The situation is always the same: someone is deciding whether this candidate is
worth their time, usually with other candidates open in adjacent tabs.

## Product Purpose

Personal portfolio for **Rakshit Rameshbabu — Software & Security Engineer**,
B.Tech CSE (Cyber Security) at VIT Chennai.

**Success is the visual impression.** The owner's stated success criterion is
that a visitor is amazed by how the site looks — the site must be visually
outstanding first, and only then read as credible. The owner has explicitly
judged the current UI as not good enough and wants it to be mindblowing.
Contact, resume download, and repo clicks are outcomes, not the success metric.

## Positioning

Everything on the site is verifiable, and the site proves it in-page rather than
asserting it. Live GitHub data (stars, head SHA, CI conclusion) is fetched at
build time and rendered into the provenance line on every project card
(`src/lib/github.ts`), and the footer verifies this repo itself. The portfolio
carries its own evidence.

The work itself is the second differentiator: security engineering (a PyPI
supply-chain firewall, an AI-agent tool-boundary firewall, an OS-level malware
framework) alongside a research result that most portfolios would hide — a
**proven negative result**, published as a finding rather than buried.

## Operating Context

- Read in a hiring or evaluation session, often mobile, often skimmed in under a
  minute before any deep read happens.
- Sits next to a PDF résumé (`/resume.pdf`) and a GitHub profile; the site must
  work when the visitor jumps between all three.
- Deployed two ways at once: Vercel at the domain root and GitHub Pages at a
  repo sub-path. Both must keep working.
- Machine readers matter: `llms.txt`, JSON-LD (`Person`, `WebSite`,
  `SoftwareSourceCode`), sitemap, and OG cards are part of the surface.

## Capabilities and Constraints

- Next.js App Router + TypeScript + Tailwind, **fully static export** to `./out`,
  no server runtime. One index page plus three case studies at `/projects/[id]`
  (`warden`, `scheduler`, `plantpal`).
- `src/content.ts` is the single source of truth for every word on the site.
  Components render only what it exports.
- Static export must work on both deploys. Internal assets go through `withBase`
  / `NEXT_PUBLIC_BASE_PATH`.
- **Known constraint:** Next 16 static export breaks `next/link` prefetch on this
  export shape (RSC payload paths 404), so internal page links are plain anchors
  through `withBase`. A smoke test guards it.
- No heavy dependencies — no UI kits, no animation frameworks. New dependencies
  need a stated justification.
- CI is a hard gate and must stay green: `typecheck`, `lint`, `build`, a gzipped
  JS budget (`scripts/check-budget.mjs`, ceiling 210 kB, baseline ≈ 192 kB),
  Playwright smoke tests, an axe scan at **zero violations**, and Lighthouse
  category minimums that ratchet up and are never lowered to pass.
- Existing behaviors that are product, not decoration: ⌘K command palette,
  scroll-spy nav, print stylesheet, and a `~` read-only "evidence shell"
  (`help`, `whoami`, `ls projects`, `cat resume.txt`, `open <section>`) whose
  output all comes from `content.ts`.

## Brand Commitments

- Name and role line: "Rakshit Rameshbabu — Software & Security Engineer —
  B.Tech (Cyber Security) @ VIT Chennai", Chennai, India.
- Voice: precise, measured, evidence-first. States gaps plainly instead of
  hiding them (the case studies name their own honest limitations).
- **No emoji.** The one emoji in source copy (🥇) is deliberately rendered as an
  icon instead.
- Owner works AI-native and says so on the site; that is a claim, not a secret.

## Evidence on Hand

Real, verified, and already written into `src/content.ts`:

- **Warden** — 6 analyzers, 0–100 risk verdict, 40 tests in CI. Public repo.
- **Proactive Feasibility Scheduler** — 45,432 dispatch instants, zero
  counterexamples, paired TOST p = 2.6×10⁻¹⁶, real LANL CM-5 / SDSC SP2 trace
  replay, 14-policy benchmark with real per-policy numbers. Public repo.
  Manuscript in progress.
- **PlantPal+** — 228 functional requirements, 36 spec documents, 307 tests,
  web app live on GitHub Pages. Public repo.
- **Taintwall** — 43% → 0% exfiltration. Public repo.
- Education: CGPA 9.07/10 (VIT Chennai), 93.6% Class XII, 96.2% Class X.
- Achievements: First Prize — Cyber Secure 360 Expo 2025 (SCOPE, VIT Chennai);
  Top 100 teams — FarAway Zuup Hackathon (~11,000 participants).
- Links: GitHub `rakshit-737`, LinkedIn `rakshit-rameshbabu`,
  `rakshitoffl@gmail.com`, `/resume.pdf`.

**Absences future work must not fill by invention:**

- Cyber Secure 360 `certificateUrl` is still `null` — no certificate link exists.
- Only two achievements exist. More may come from the owner only.
- SentinelCore and the Web Application Security Suite have **no public repos** —
  their cards carry no repo segment by design.
- No headshot is in use. No testimonials, no employer references, no metrics
  beyond those above.

## Product Principles

1. **Never invent a fact.** Every visible claim traces to `src/content.ts`, a
   linked repo, or the owner's explicit input. When something is missing, ask.
2. **The evidence is the product.** Claims are shown with their provenance —
   commit, CI status, test count, repo link — not asserted.
3. **Impress on sight, then hold up under scrutiny.** The visitor's first
   reaction is visual; the second is verification. Both must land.
4. **State the gaps.** Negative results and known limitations stay visible.
   Credibility comes from what the site admits, not only from what it claims.
5. **Nothing ships that breaks the gate.** Zero axe violations, both deploy
   targets working, and the JS budget respected are preconditions, not goals.

## Accessibility & Inclusion

Non-negotiable and CI-enforced: full keyboard path, visible focus, correct
landmarks and heading order, WCAG AA contrast, `prefers-reduced-motion`
fallbacks on every animation, and an axe scan that must report zero violations.
