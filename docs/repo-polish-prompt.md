# Repo & record polish prompt — Lamplight portfolio

**What this is.** A copy-pasteable brief for a coding agent (Claude Code / opencode, run from the repo root) that brings the *record* back in line with the repos it cites, gives the GitHub repo a front door worth clicking, and closes the security-posture and performance gaps found in the 2026-09-18 audit — without touching the visual system the site already has. Nothing here adds a feature to the page. It fixes facts, presentation, hygiene, headers and load.

**How to use it.** Save this file in the repo (it lands at `docs/repo-polish-prompt.md`), fill in the **Decisions** block, open the agent in the repo root, and say `read @docs/repo-polish-prompt.md and do Phase 0`. Run it phase by phase; review between phases; don't let it do everything in one go. Phase 5 and the **Owner checklist** are things only you can do — the agent prepares them, you finish them.

---

<!-- PROMPT START -->

## Decisions (fill these in before running — the agent stops on any blank)

| Key | Value | Notes |
| --- | --- | --- |
| `PRIMARY_URL` | `https://rakshit-737.vercel.app` | The one URL every canonical, og:url, sitemap, robots, JSON-LD, README, profile and résumé link will use. If I buy a custom domain, put it here instead (no trailing slash) and see Owner checklist → Domain. |
| `LICENSE` | `MIT` | Code licence. Content (copy, résumé, certificates, name, seal mark) is carved out — see 2.2. |
| `PURGE_SCREENS_HISTORY` | `no` | `yes` rewrites git history to drop the 17 MB of PNGs in `docs/screens/` (force-push; I re-clone afterwards). `no` only stops adding more. |
| `REDACT_REGISTRATION` | `?` | `yes` removes my VIT registration number from `content.ts` and masks it on the certificate scan + thumbs. `no` leaves it. |
| `LAZY_LOAD_OK` | `yes` | Phase 4 may split the sound engine and the command palette out of the initial bundle, kept only if the measurement improves. |

## Role and ground rules

You are working inside my portfolio repo (Next.js 16 App Router, React 19, TypeScript, Tailwind 4, static export to `./out`, deployed on Vercel at the root and mirrored on GitHub Pages under `/portfolio`). Before touching anything, read `AGENTS.md`, `PRODUCT.md`, `README.md`, `src/content.ts`, `src/app/layout.tsx`, `src/lib/github.ts`, `.github/workflows/ci.yml`, `.github/workflows/deploy-pages.yml`, `scripts/check-lighthouse.mjs`, `scripts/check-content-lint.mjs`, `tests/seo.spec.ts` and `tests/helpers.ts`. `AGENTS.md` and `DESIGN.md` are the authority; where this brief and they disagree, they win and you tell me.

The job is in four parts, in this order: **(1)** make every fact on the site match the repository it cites today; **(2)** make the GitHub repo present itself — README, licence, metadata, release; **(3)** clean the tree and add the security posture a security engineer's site should have; **(4)** measure and, only if it measurably helps, lighten the mobile load. The site's look, motion, sound, cursor and copy voice are **not** in scope — you are not redesigning anything.

Non-negotiables (most are already CI gates or named rules — re-read them before each task):

1. **Never invent a fact.** Every number, name, date and claim you write traces to a linked repo's README as it exists *today*, to a GitHub page you actually read, to a file in this repo, or to my explicit input. When a source is missing or ambiguous, stop and ask. Never round, estimate, or carry an old number forward because it "was probably still right".
2. **`src/content.ts` is the single source of words.** No copy in components, no copy in tests, no second copy in `PRODUCT.md` that says something different from `content.ts` (where `PRODUCT.md` restates evidence, it restates `content.ts` exactly).
3. **Both deploys keep working.** Every internal asset and page link goes through `withBase()`. The GitHub Pages sub-path build (`NEXT_PUBLIC_BASE_PATH=/portfolio`) and the root build must both pass `npm run check:links` and the smoke suite — CI runs both shapes.
4. **The palette, the paintings, the lamp, the night archive, the cursor: untouched.** No colour, motion, sound, plate, or component-visual change of any kind. If a task seems to need one, it doesn't — ask.
5. **Zero new runtime dependencies.** A dev-only dependency needs a one-line justification in the commit body. `sharp` (already a devDependency) is what you use for any image work.
6. **Accessibility gate stays at zero axe violations**, heading walk unchanged, skip link unchanged. Nothing in this brief touches markup on the page except the CSP `<meta>` in 3.4 (optional) and the exhibit `<picture>` that already exists for PlantPal+.
7. **Budgets and thresholds are a ratchet.** `npm run budget` ceilings and `scripts/check-lighthouse.mjs` minimums are never lowered. Phase 4 may *raise* a minimum once a change holds.
8. **Secrets never land in the repo.** The Vercel deploy hook URL, any token, any credential: repository secrets only. If a step needs one, name the secret and stop until I've added it.
9. **History is only rewritten in 3.2 and only if `PURGE_SCREENS_HISTORY=yes`.** No other task uses `--force`, `filter-repo`, `rebase -i` or amends a pushed commit.
10. **Commits are one task each**, with a subject that says in plain words what changed (the house voice — the clause after the em dash — is welcome after that, never instead of it): `content(warden): match the case file to the repo's README — the record catches up`, `docs(readme): a front door — screenshot, live link, badges, licence`, `chore(security): response headers and security.txt`.

After every commit: `npm run check:art && npm run typecheck && npm run lint && npm run build && npm run budget && npm run check:links && npm run check:content && npm test`. All green, or you report the conflict — never weaken a threshold, never skip a test.

## Working method

- **Phase 0 — read, measure, plan.** Read the files above. Run the full gate once on a clean checkout and paste the results (gzipped JS per page from `npm run budget`; the Lighthouse medians from `node scripts/check-lighthouse.mjs` against a served `./out`). Clone the three cited repos read-only *outside* this repo (`/tmp/warden`, `/tmp/scheduler`, `/tmp/plantpal`, `git clone --depth 1`) so you can read their READMEs as they stand today. Then write, for every numbered item in Phases 1–4, a 3–5 line plan: files, approach, the test or check that proves it, the risk to an existing gate. Show me the plan and stop.
- **Phase 1** first — nothing in Phases 2–4 is worth doing on top of stale facts. **Phase 2** after I've reviewed Phase 1. **Phases 3 and 4** after that. Phase 4 is measure-first: a change that doesn't move the number is reverted, not kept.
- Each commit also: (a) extends the nearest Playwright spec or `scripts/check-*.mjs` when there is behaviour to guard; (b) adds a one-line invariant to `AGENTS.md` only if a future agent needs it (canonical-URL rule, headers location, screens format); (c) records anything you dropped or couldn't verify in the closing note.
- When a fact in this brief (the **Appendix** records what I observed on 2026-09-18) disagrees with what the source says today, **the source wins** — and you say so.

## Phase 1 — the record tells the truth

### 1.1 Warden: the case file catches up with the repo

**Why.** The site says six analyzers, 40 tests, PyPI only. The repo (`github.com/rakshit-737/warden-supply-chain-security`) now describes itself as a supply-chain *security platform* — more analyzers, PyPI packages plus project manifests and container images, SBOM/SARIF output, a synthetic benchmark with a stated detection rate, an MIT licence. A hiring manager clicking through from the case file finds numbers that don't match. This site's thesis is that every claim carries its proof; this is the one place it currently doesn't.

**Source.** The README (and `RESULTS`/`docs` if the README points at them) in `/tmp/warden`. Transcribe; don't paraphrase numbers. For the test count use the figure the README states; if it states none, count in the clone (`grep -rEc "^\s*(async )?def test_" tests/`, summed) and record the method in a `content.ts` comment the way the file already annotates its sources. Dates for the `evidence` strip come from the GitHub repo page (created / last push), the way the DocForge entry's comment already documents.

**Update, in `src/content.ts`** (every site named here is one you must re-read against the README, not skip):

- `heroStats[2]` — the value (`"6"`) and its label. Keep the label true and plain-English, one line.
- `featuredProjects[0]` — `name` (follow the README's own title; keep "firewall" in the name only if the README still uses that word), `oneLiner`, all three `bullets` (`llms.txt` renders these — they must be true even though the index no longer shows them), `tech` (versions as the README states them), `repoUrl`, `headlineNumbers` (all three), `evidence` (the `repo` href and the `… tests · CI` chip).
- `caseStudies.warden` — `problem`, `approach` (the analyzer list and count are spelled out in prose here), `diagram` (the `six analyzers` node and its `sub`), `diagramTitle`, all four `decisions` (re-verify each is still how the README describes the design; drop or rewrite any that isn't), `evidence` rows (the sample verdicts — use the README's current benchmark table; if it no longer publishes per-package scores, replace the rows with what it does publish, e.g. detection rate over the synthetic set), `outcome` (both paragraphs — the test count, the "synthetic data" honesty clause, the deployment posture), `next` (re-derive from the README's roadmap; anything shipped since leaves this list), `teaser`.
- `exhibits.warden.rows` — labels resolved against the evidence table at render time; a label that no longer exists fails the build on purpose. Re-point them.
- `acts.warden` — `kicker` and `statement` stay unless the README contradicts them.
- `about.paragraphs[1]` — "a supply-chain firewall for PyPI packages" must describe what the repo is now.

**Elsewhere.** `PRODUCT.md` → *Evidence on Hand* (the Warden line) and *Absences* (the Cyber Secure 360 certificate line is stale — the scan exists now). `scripts/check-content-lint.mjs` — if you introduce an insider term that only the Warden act explains (`SBOM`, `SARIF`, `CycloneDX`, …), add it to the term list with `homeActs: ["warden"]` so a stranger never meets it unexplained on the index. `og.png` and `llms.txt` derive from `content.ts` — confirm both changed by inspecting `out/og.png` and `out/llms.txt` after the build.

**Résumé.** `public/rakshit-rameshbabu-resume.pdf` carries the same 6 / 40 figures. You cannot regenerate it; instead run `pdftotext public/rakshit-rameshbabu-resume.pdf -`, diff every claim against the updated `content.ts`, and write `docs/resume-diff.md`: a table of *line as printed → line as it should read → source in content.ts*. Claims only — never copy the contact header (phone, email) into that file. I regenerate the PDF from that (Owner checklist).

**Tests.** `tests/seo.spec.ts` and `tests/smoke.spec.ts` read the repo URL from `content.ts` — confirm they pass with the new URL. Add one assertion to `tests/seo.spec.ts`: the `SoftwareSourceCode` JSON-LD on `/projects/warden/` carries `codeRepository` equal to `featuredProjects[0].repoUrl` (guards the rename).

### 1.2 The repo URL rename, everywhere

`warden-supply-chain-firewall` → `warden-supply-chain-security` at `src/content.ts` lines ~280 and ~292 (grep the whole tree, `out/` excluded, to be sure — `PRODUCT.md`, `docs/`, `README.md`). GitHub redirects the old name today, and stops the moment anyone creates a repo with that name; `src/lib/github.ts` follows the redirect, but the provenance strip should link the real name. Confirm `npm run check:links` reports the link reachable.

### 1.3 Fillwright joins the archive

`github.com/rakshit-737/fillwright` is public and pinned on my profile but absent from the site. Add a `moreProjects` entry (position: by date, the list is newest-first) transcribed from that repo's README and repo page exactly the way the DocForge entry's comment documents its sources: name, timeframe (created month), one description with at most one `**metric**` chip and only if the README states a measured number, `tech`, `repoUrl`, and an `evidence` strip (`YYYY-MM`, status as the README states it, stack, `repo`). No headline numbers, no case file. Check `npm run check:content` and the ledger row layout at 390×844 (`tests/mobile.spec.ts`, `tests/ledger.spec.ts`).

### 1.4 One canonical URL for one site

**Why.** `NEXT_PUBLIC_SITE_URL` is unset on Vercel, so the Vercel deploy's `<link rel=canonical>`, `og:url`, `og:image`, `sitemap.xml`, `robots.txt` and both JSON-LD blocks all point at `https://rakshit-737.github.io/portfolio` — the mirror. Search engines are being told the primary is a copy.

**Rule to implement:** *the canonical is `PRIMARY_URL` on every deploy; `basePath` only ever changes where files are served from, never what the site says its address is.*

- `src/content.ts` → `site.url` fallback becomes `PRIMARY_URL` (keep the `NEXT_PUBLIC_SITE_URL` override for previews). Update the comment.
- `.github/workflows/deploy-pages.yml` → the *Compute Pages URLs* step keeps computing `NEXT_PUBLIC_BASE_PATH` from the repo name but sets `NEXT_PUBLIC_SITE_URL` to `PRIMARY_URL` for both branches of the `if`. Comment why.
- `.github/workflows/ci.yml` → the `subpath` job's `NEXT_PUBLIC_SITE_URL` env matches (`PRIMARY_URL`), `NEXT_PUBLIC_BASE_PATH` stays `/portfolio`.
- `tests/seo.spec.ts` → its header comment describes the GitHub Pages fallback; rewrite it for the new rule. The assertions already read `site.url`, so the sub-path run now expects `PRIMARY_URL` canonicals with `/portfolio/` asset paths — add one explicit assertion that, under a non-empty basePath, the canonical does **not** contain the basePath and the hero plate's `src` does.
- `README.md` env table → the default for `NEXT_PUBLIC_SITE_URL` is `PRIMARY_URL` (today the table says `https://rakshit-737.github.io`, the code says `…/portfolio` — both wrong after this).
- `package.json` `homepage`, `PRODUCT.md` *Operating Context*, the profile-README draft (2.6): `PRIMARY_URL`.
- Do **not** add `noindex` to the mirror; canonical is the whole mechanism.

Verify on the built output of both shapes: `grep -o 'rel="canonical" href="[^"]*"' out/index.html` and the `<loc>` lines of `out/sitemap.xml`.

### 1.5 The Vercel record stops going stale

**Why.** The weekly `schedule:` in `deploy-pages.yml` only rebuilds the Pages mirror. Vercel builds on push, so its footer ("record generated: 2026-09-10") and every card's live head/CI chip freeze between pushes.

Add `.github/workflows/refresh-vercel.yml`: same cron (`0 3 * * 1`) plus `workflow_dispatch`; one job, one step, `curl -fsS -X POST "$VERCEL_DEPLOY_HOOK"` with the URL from `secrets.VERCEL_DEPLOY_HOOK`; skip cleanly (exit 0 with a notice) when the secret is empty, since `secrets` can't be read in a job-level `if`. Document the secret in `README.md` → Deployment → Vercel and in the Owner checklist. `permissions: {}`.

## Phase 2 — the front door

### 2.1 README

Rewrite `README.md` so a visitor who never scrolls past the first screen still learns what this is, sees it, and can open it. Keep every command, convention and gate that's there today; move the long *Design notes* section into `docs/design-notes.md` (first check whether `DESIGN.md` already says the same thing — if it does, delete rather than duplicate; if it doesn't, move and link). Target ≤ 200 lines. Structure, in order:

1. `# Rakshit Rameshbabu — Portfolio` and one sentence: what it is, in the site's own words (`site.description` is the source).
2. **Hero image** — `docs/readme/hero-1440.webp` (see 2.4), linked to `PRIMARY_URL`. Under it, one line: `Live: PRIMARY_URL · mirror: https://rakshit-737.github.io/portfolio/`.
3. **Badges**, one row: CI (`https://github.com/rakshit-737/portfolio/actions/workflows/ci.yml/badge.svg` linked to the workflow), Pages deploy (`deploy-pages.yml/badge.svg`), licence (static shields, `MIT`), Node (`≥ 22.18`, from `engines`). Lighthouse: one *dated* static line under the badges — "Lighthouse (mobile / desktop, `scripts/check-lighthouse.mjs`, measured YYYY-MM-DD): performance NN / NN · accessibility 100 / 100 · best-practices 100 / 100 · SEO 100 / 100" — with the numbers from your own Phase 0 run. A badge that claims a number nobody measured is exactly the kind of assertion this site refuses.
4. **What you're looking at** — the concept in five lines: eight acts, eight public-domain paintings, one lamp, the night archive, the key-and-lock cursor, ⌘K. Pull phrasing from the existing README's *Design notes* and `AGENTS.md`; don't write new claims.
5. **Inside** — a short list, each item naming the file it lives in: `Lamp.tsx`, `sound.ts`, the cursor (`globals.css` + `public/cursors/`), `CommandPalette.tsx`, `github.ts` (build-time provenance), `llms.txt` route, JSON-LD, OG routes, print stylesheet.
6. **Proof** — the *Quality gates* section as it exists, tightened. This is the most persuasive section in the file for an engineer; keep it complete.
7. **Run it** — the existing Commands table, unchanged.
8. **Editing content** — as is.
9. **Deployment** — Vercel primary (+ the deploy-hook secret from 1.5), GitHub Pages mirror, the env-var table with the corrected default (1.4).
10. **Repo map** — one line each for `src/`, `public/`, `scripts/`, `tests/`, `docs/` (and inside it `design/`, `screens/`, `superpowers/`, `readme/`), and the root design docs (`AGENTS.md`, `DESIGN.md`, `PRODUCT.md`, `.impeccable/design.json`) with a sentence saying what they are for, so a stranger reads them as the working method rather than clutter.
11. **Credits** — paintings (link to the table in `DESIGN.md` / `src/lib/art.ts`, "public domain, Wikimedia Commons"), fonts (Newsreader, Manrope, Chivo, Chivo Mono via `next/font`, SIL OFL), the CollectUI references (`docs/collectui-improvisation-prompt.md`).
12. **Licence** — see 2.2.
13. **Known open items** — keep the Alchemist-plate note; refresh *Still to fill in* (the certificate scan exists now; the PlantPal+ exhibit captures are still pending; more achievements are mine to supply).

Fix while there: "Deployed in Vercel" → "on Vercel"; a blank line before `## Local development`; every mention of `/resume.pdf` becomes `/rakshit-rameshbabu-resume.pdf` (the old path stays served — `tests/seo.spec.ts` already asserts the two files are byte-identical, so leave both files exactly as they are).

### 2.2 LICENSE

Add `LICENSE` (MIT, `Copyright (c) 2026 Rakshit Rameshbabu`) so GitHub detects and displays it. Add a **Licence** section to the README that says, in plain words: the code is MIT; the written content (`src/content.ts`), the résumé, the certificate scans, my name and the seal mark (`src/lib/mark.ts`, `public/mark.png`, the icons) are © Rakshit Rameshbabu, all rights reserved and not licensed for reuse; the eight paintings are public domain and credited per plate; the fonts are under the SIL Open Font License. Add the same carve-out as a short comment at the top of `src/content.ts`. `package.json` gets `"license": "MIT"` (2.3).

### 2.3 package.json metadata

Add `description` (same sentence as the README's first line), `homepage` (`PRIMARY_URL`), `repository` (`{ "type": "git", "url": "git+https://github.com/rakshit-737/portfolio.git" }`), `author` (`Rakshit Rameshbabu <rakshitoffl@gmail.com> (PRIMARY_URL)`), `license`. Bump `@types/node` to `^22` — `engines` requires Node ≥ 22.18 and the types disagree; then `npm install`, then the full gate.

### 2.4 The README's images and the social preview

Add `scripts/capture-readme.mjs` (Playwright, already a devDependency; launches Chromium against a served `./out`, moves the pointer onto the hero statement so the lamp is lit, waits for the reveal beat, screenshots). Outputs, all committed:

- `docs/readme/hero-1440.webp` — 1440×900, WebP quality 80, ≤ 250 KB (encode through `sharp`).
- `docs/readme/hero-390.webp` — 390×844 phone capture, same settings, ≤ 120 KB; place it beside the desktop one in the README (an HTML `<p align="center">` with both `<img>`s is fine on GitHub).
- `docs/readme/social-preview.jpg` — a 1280×640 viewport capture, JPEG quality 85, **under 1 MB** (GitHub's limit). Not referenced by the README; I upload it in the repo settings (Owner checklist).

Every capture: `reducedMotion: 'no-preference'`, `deviceScaleFactor: 1`, `prefers-color-scheme` irrelevant (the site has one theme). No GIF unless you can hold a ≤ 3 MB loop of the lamp crossing the hero; if you can't, don't.

### 2.5 Release v1.0.0

Write `docs/releases/v1.0.0.md` from `git log` — the lamplight redesign (2026-08-16), the zoom removal (2026-08-20), the night archive (2026-09-05), the CollectUI waves (2026-09-07/08), the Phase 1–3 work of this brief — in the README's voice, short, dated, no invented milestones. When Phases 1–3 are merged and green: `git tag -a v1.0.0 -m "Lamplight — first release"` and push the tag; then `gh release create v1.0.0 -F docs/releases/v1.0.0.md --title "v1.0.0 — Lamplight"` if `gh` is authenticated, otherwise tell me to create the release from the file (Owner checklist).

### 2.6 What only the GitHub settings can hold — drafted for me

Write `docs/github-presentation.md` with the exact strings I paste, so nothing is retyped from memory:

- **About → Description** (≤ 350 chars, from `site.description` and the README's first line): *"Rakshit Rameshbabu's portfolio — a scroll-driven, candlelit record built on public-domain paintings. Next.js 16 static export; every claim carries live GitHub provenance, CI-gated on axe, Lighthouse and a JS budget."*
- **About → Website:** `PRIMARY_URL`.
- **Topics (20):** `portfolio` `portfolio-website` `developer-portfolio` `personal-website` `nextjs` `react` `typescript` `tailwindcss` `static-site` `vercel` `github-pages` `playwright` `accessibility` `lighthouse` `web-audio-api` `creative-coding` `seo` `open-graph` `cybersecurity` `student-portfolio`.
- **Social preview:** `docs/readme/social-preview.jpg`.
- **Profile bio** (so it matches the site's role line, not the reverse of it): *"Software & Security Engineer — B.Tech Cyber Security @ VIT Chennai"*, location Chennai, one website (`PRIMARY_URL`) — remove the second portfolio link.
- **Pinned repos, in order:** `portfolio`, `warden-supply-chain-security`, `proactive-feasibility-scheduler`, `PlantPal-Plus`, `taintwall`, `DocForge`.
- **Profile README draft** (`rakshit-737/rakshit-737`, a separate repo — write the markdown, I paste it): lead with the role line, the three headline projects with one measured number each *taken from `content.ts`*, the research finding in one sentence, then the portfolio link and the résumé link. Replace the current language-list paragraph. No emoji, no badges wall, no GitHub-stats widgets.

## Phase 3 — hygiene and posture

### 3.1 The cursor design folder

`git mv "Medieval Cursor Animation Design/cursors" docs/design/cursors` and remove the now-empty root folder. Its own `README.md` describes copying files into `public/cursors/` and `src/components/Cursor.tsx` — those already happened; add one line at its top saying so and that `public/cursors/` is the shipped copy, `docs/design/cursors/` the source and build (`build.mjs`, `preview.mjs`). Grep `DESIGN.md`, `AGENTS.md`, `docs/` for the old folder name and fix references. The `.gitignore` inside it moves with it.

### 3.2 `docs/screens/` stops being 17 MB

Convert every `docs/screens/*.png` to WebP (quality 80, `sharp`) with the same stem; update every reference (`docs/superpowers/**`, `DESIGN.md`, the CollectUI brief's *Definition of done*, which asks for PNG captures — change the convention to WebP there and in `tests/helpers.ts` if a capture helper writes PNGs). Delete the PNGs. Add a `scripts/webp-screens.mjs` one-liner so future captures land as WebP. Expected: ~17 MB → under 2 MB on disk.

If `PURGE_SCREENS_HISTORY=yes` **and only then**: after the conversion commit is pushed and green, run `git filter-repo --path-glob 'docs/screens/*.png' --invert-paths` on a fresh clone, force-push `main`, and tell me to re-clone (all local clones are invalid afterwards; the tag in 2.5 must be created *after* this, not before). If `no`, skip and say what the clone size would have been.

### 3.3 Dependabot

Add `.github/dependabot.yml`: `npm` at `/`, `monthly`, one group `minor-and-patch` (`update-types: [minor, patch]`), majors ignored (they're by hand — `next`, `eslint`, `typescript` majors need a human), commit prefix `chore(deps)`; and `github-actions` at `/`, `monthly`. CI already runs on `pull_request`, so every Dependabot PR gets the full gate.

### 3.4 Response headers — the security engineer's own site sends them

**Why.** Vercel sends HSTS and nothing else. No CSP, no `X-Content-Type-Options`, no `Referrer-Policy`, no `Permissions-Policy`, no `frame-ancestors`. Anyone who runs securityheaders.com on a "Software & Security Engineer" portfolio sees that first.

Add `vercel.json` with a `headers` block for `/(.*)`:

- `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()`
- `X-Frame-Options: DENY` (redundant with `frame-ancestors`; kept for older scanners)

Why each allowance exists — put this in a comment block in `README.md` → *Deployment*, since `vercel.json` can't carry comments: Next's static export emits inline hydration scripts and there is no server to mint nonces, hence `script-src 'unsafe-inline'` (mitigated by `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`); the LQIP background in `Plate.tsx` and React's SSR `style=""` attributes need `style-src 'unsafe-inline'` and `img-src data:`; fonts are self-hosted by `next/font`; nothing fetches at runtime (`github.ts` runs at build), so `connect-src 'self'`; every sound is synthesized, so `media-src 'none'`. Do not add HSTS — Vercel already sends it.

Then **prove it doesn't break the page**: `next dev` doesn't apply `vercel.json`, so add a Playwright project or a helper in `tests/helpers.ts` that injects the same CSP string as a `<meta http-equiv>` for one run of `smoke.spec.ts`, `lamplight.spec.ts` and `sound.spec.ts` (Chromium enforces a meta CSP; a blocked inline script would kill hydration and the lamp test would fail — that's the signal). Keep the CSP string in exactly one place (`scripts/csp.mjs` exporting it) and have both `vercel.json` generation — or a check script that diffs the committed `vercel.json` against it — and the test read it.

Add `scripts/check-headers.mjs <url>` (`npm run check:headers`): a HEAD request asserting all five headers, run by hand after a deploy; not in CI (CI has no deploy URL). Optionally (ask first) add the CSP as a `<meta http-equiv="Content-Security-Policy">` in `src/app/layout.tsx` so the GitHub Pages mirror gets it too — noting in the comment that `frame-ancestors` and `report-uri` are ignored in a meta policy, and that the meta then applies to Vercel as well.

### 3.5 `/.well-known/security.txt`

Add `public/.well-known/security.txt` (the static export copies dot-directories — verified): `Contact: mailto:rakshitoffl@gmail.com`, `Expires:` one year from the commit date in RFC 3339 (`2027-09-18T00:00:00.000Z` style), `Preferred-Languages: en`, `Canonical: PRIMARY_URL/.well-known/security.txt`. No `Encryption:` line (no published key). Extend `tests/seo.spec.ts`: the file resolves with `text/plain`, contains `Contact:` and `Canonical: ${site.url}/.well-known/security.txt`, and its `Expires:` is in the future — so the next push after it lapses fails, honestly, instead of serving an expired policy. Add a `npm run check:links`-adjacent note in the README that it's renewed yearly.

### 3.6 Dependency refresh

`npm update` within existing semver ranges (the audit showed patch/minor updates available for `next`, `eslint-config-next`, `@playwright/test`, `@axe-core/playwright`, `lighthouse`, `lucide-react`, `@types/react*`), plus `@types/node@^22` from 2.3. No majors. Full gate; Playwright's browser version may change — `npx playwright install --with-deps chromium` locally as CI does. Report the before/after of `npm run budget`.

## Phase 4 — mobile performance, measured first

Baseline (my run, 2026-09-18, local Chromium): mobile performance median **77** of [73, 77, 77] against the 75 gate — LCP ≈ 4.6 s, TBT ≈ 300–400 ms, CLS 0; desktop 99. 193 kB of gzipped JS on `/`. Four font families preload against the hero plate. Every step here: run `node scripts/check-lighthouse.mjs` three times (nine mobile runs total) before and after; keep the change only if the mobile median improves by ≥ 3 points or TBT drops by ≥ 50 ms with no LCP regression. Otherwise revert and say so.

### 4.1 `Chivo` (sans) stops preloading

It carries `.prose-field` reading passages only — below the fold on every route. `next/font`'s `preload: false` on that one family removes one critical-path request without removing the font. Newsreader (the H1), Manrope (the eyebrow) and Chivo Mono (the positioning line) stay preloaded — they're all above the fold.

### 4.2 The sound engine loads on the first interaction, not at load (`LAZY_LOAD_OK=yes`)

`src/lib/sound.ts` (786 lines) is imported statically by `Soundscape.tsx`, `SoundToggle.tsx`, `CopyEmailButton.tsx`, `CommandPalette.tsx` and `Nav.tsx`. Keep the engine's public surface as is and put a thin `src/lib/sound-gate.ts` in front of it: `playUi()` and `initSoundscape()` exported with the same signatures, backed by a single memoized `import("./sound")` that starts on the first real interaction — which is exactly when `AGENTS.md` already says the AudioContext may first exist. Every import site switches to the gate. The first UI sound after the very first click may lag by the chunk fetch; a sound is never the only confirmation, so that's within the rules — but `tests/sound.spec.ts`, `sound-blocked.spec.ts`, `sound-unit.spec.ts` and `idle-stop.spec.ts` must pass unchanged, and `ui-sound` events must still mean a sound really played.

### 4.3 The command palette is a chunk, not a passenger (`LAZY_LOAD_OK=yes`)

`CommandPalette.tsx` (703 lines) is mounted on every route. Move `OPEN_PALETTE_EVENT` into `src/lib/palette.ts` (so `Nav.tsx` stops importing the whole component for one constant), and mount the palette through a small client `PaletteLoader.tsx` that owns the `⌘K`/`Ctrl K` keydown and the open-event listener, `next/dynamic`-imports `CommandPalette` on the first trigger, and opens it once loaded. `tests/smoke.spec.ts` ("⌘K palette opens and jumps") and `tests/hirepath.spec.ts` (interaction count, not timing) must pass unchanged. The wood tap still plays on open.

### 4.4 Ratchet

If 4.1–4.3 hold and the mobile median sits ≥ 82 across three consecutive runs, raise `MIN.mobile.performance` in `scripts/check-lighthouse.mjs` to 80 and record the new baseline in `scripts/check-budget.mjs`'s comment and the README's *Proof* line (with the date). If they don't hold, the gate stays at 75 and the closing note says what was tried.

## Phase 5 — owner-assisted (the agent prepares, I finish)

### 5.1 PlantPal+ exhibit

The only act without an exhibit. `public/exhibits/README.md` already specifies the captures. I will drop two phone screenshots of the *running* app — dashboard and streaks — into `docs/incoming/` (PNG, any size). You: convert each to `public/exhibits/plantpal-dashboard.{avif,webp}` and `plantpal-streaks.{avif,webp}` at ~640 px wide, ≤ 200 KB each; rewrite both `alt` strings in `exhibits.plantpal.shots` to describe *what each image actually shows*; confirm the exhibit renders (the build detects the pair), `npm run budget` stays under the media ceiling, and axe stays at zero. Until the files exist, do nothing here — the exhibit is designed to stay absent rather than show a placeholder.

### 5.2 Résumé

From `docs/resume-diff.md` (1.1) I regenerate the PDF. When the new `public/rakshit-rameshbabu-resume.pdf` lands, copy it byte-for-byte to `public/resume.pdf` (the test enforces equality) and re-run the gate.

### 5.3 Registration number (`REDACT_REGISTRATION=yes` only)

Remove `certifications[0].registration` from `content.ts` with a comment that the omission is deliberate (the file's own header says fields are omitted rather than guessed — this one is omitted rather than published). Mask the number on `public/certificates/cyber-secure-360-2025.png` with a solid `#08070A` rectangle composited by `sharp` (find the coordinates by viewing the image; leave everything else untouched), regenerate the `-thumb.avif/.webp` with `npm run cert-thumb`, and confirm the lightbox still opens. The phone number in the résumé is mine to decide when I regenerate it (5.2) — not yours to edit.

## Owner checklist (nothing here can be done from a commit)

- **Vercel → Project → Settings → Environment Variables:** `NEXT_PUBLIC_SITE_URL = PRIMARY_URL` (Production). Optional once 1.4 lands, since the code's fallback becomes `PRIMARY_URL`, but it makes the intent explicit.
- **Vercel → Settings → Git → Deploy Hooks:** create one for `main`; copy the URL into **GitHub → repo → Settings → Secrets and variables → Actions → New repository secret** `VERCEL_DEPLOY_HOOK`. Then run *Refresh Vercel record* once from the Actions tab to prove it.
- **Domain (only if `PRIMARY_URL` is a custom domain):** add it under Vercel → Domains, set the DNS records Vercel prints, wait for the certificate, and only then merge 1.4.
- **GitHub → repo → About (gear):** description, website, topics — paste from `docs/github-presentation.md`.
- **GitHub → repo → Settings → General → Social preview:** upload `docs/readme/social-preview.jpg`. In the same page, untick *Wikis* and *Projects* if unused, so the sidebar shows only what exists.
- **GitHub → Releases:** if the agent couldn't use `gh`, create `v1.0.0` from `docs/releases/v1.0.0.md`.
- **Profile:** bio, website, pins, and the profile README — from `docs/github-presentation.md`.
- **Résumé:** regenerate from `docs/resume-diff.md`; decide on the phone number; drop the PDF in for 5.2.
- **PlantPal+ captures:** two screenshots into `docs/incoming/` for 5.1.
- **After each production deploy:** `npm run check:headers PRIMARY_URL` once, and a look at securityheaders.com.
- **Yearly:** bump `Expires:` in `public/.well-known/security.txt` (the test will remind you).

## Definition of done

- Every number on `/`, the three case files, `og.png` and `llms.txt` matches the cited repo's README on the day of the commit, and `docs/resume-diff.md` lists what the PDF must change to match.
- One canonical URL on both deploys, verified in `out/` for both build shapes; `refresh-vercel.yml` exists and is documented.
- README opens with a screenshot, a live link and dated, measured badges; `LICENSE` present and detected by GitHub; `package.json` metadata complete; `docs/github-presentation.md` and the profile README draft written; `v1.0.0` tagged with notes.
- No folder with spaces at the root; `docs/screens/` under 2 MB; Dependabot configured; `vercel.json` headers present and proven against the smoke, lamplight and sound suites; `security.txt` served and tested.
- Phase 4 changes kept only with the measurement that justifies them; the Lighthouse floor never lowered, raised if earned.
- All gates green after every commit: `check:art`, `typecheck`, `lint`, `build`, `budget` (report the gzipped delta per page for Phase 4), `check:links`, `check:content`, `npm test` (axe zero on `/` and the three case files), the Lighthouse script.
- A closing note: what changed per phase, what you couldn't verify and left alone, what you dropped and why, and the two or three things you'd do next.

<!-- PROMPT END -->

---

## Appendix — what the 2026-09-18 audit observed (the agent re-verifies every line against the source)

**Live site.** `https://rakshit-737.vercel.app/` and `https://rakshit-737.github.io/portfolio/` both 200. Vercel's `<link rel=canonical>`, `og:url`, `og:image`, sitemap `<loc>`s, `robots.txt` `Sitemap:` and both JSON-LD `url`s all read `https://rakshit-737.github.io/portfolio/…`. Vercel response headers: `strict-transport-security` only (plus cache-control). All routes (`/projects/{warden,scheduler,plantpal}/`, both résumé paths, `/og.png`, `/sitemap.xml`, `/robots.txt`, `/llms.txt`) 200; `/nonexistent-page/` 404 with the custom page. Hero footer reads `record generated: 2026-09-10 · this site, head: 62ca6f3 · ci: passing`. Warden case file provenance reads `head e0b6053 · 2026-07-04`.

**Warden repo, as read on its GitHub page** (`rakshit-737/warden-supply-chain-security`, the old `…-firewall` URL redirects): About — "software supply-chain security platform. Analyses PyPI packages, project manifests and container images without running them: behaviour, provenance, vulnerabilities, SBOMs, release drift, SARIF, CI gate and security console." README title "Warden, A Software Supply-Chain Security Platform"; the flowchart shows the analyzers running in parallel (13 by one reading, 14 by another — **count them in the clone**); a synthetic benchmark of 22 packages (14 malicious, 4 evasive; 8 benign look-alikes) with "13 / 14 malicious detected"; five RBAC roles; MIT; 2 stars; 20 topics. **Site says:** 6 analyzers, 40 tests in CI, PyPI only, sample verdicts requests 25 / flask 31 / numpy 40 / three synthetic samples 100.

**Scheduler repo** (`proactive-feasibility-scheduler`): v3.4; the three headline numbers (0 counterexamples in 45,432 instants; 0.0 % of instants where seven features vary; paired TOST p = 2.6×10⁻¹⁶) match the site; manuscript at `phases_22_30/phase_28_manuscript/manuscript.tex`; MIT. **PlantPal-Plus:** "307 tests across all four workspaces", web on GitHub Pages, API via `render.yaml`, mobile via EAS — matches the site; MIT; homepage `https://rakshit-737.github.io/PlantPal-Plus/`. **Fillwright:** public, 1 star, "Privacy-first resume autofill for job applications" — not on the site.

**GitHub repo page.** About: no description; website `rakshit-737.github.io/portfolio/`; no topics; no licence; 0 stars; 77 commits; Actions all green (CI quality gate and Deploy to GitHub Pages). **Profile:** bio "Security & Software Engineer", Chennai, three links (both portfolio URLs plus a CyLab profile), 22 followers, 17 public repos, generic profile README.

**Local gate on a clean clone** (Node 22.22, npm ci, `GITHUB_TOKEN` unset so the provenance fetch degraded to `null` as designed): lint, typecheck, build, budget (193.6 kB gz JS on `/`, 189.4 kB per case file, ceiling 214 kB; 2 207 kB media, ceiling 3 500 kB), `check:links` (300 internal refs, 0 broken; 10/10 GitHub links reachable), `check:content`, all OK; `npm audit` 0 vulnerabilities; `npm outdated` shows patch/minor updates only within ranges plus `@types/node` at `^20` against `engines >= 22.18`. Playwright ran green in CI (#54); locally it needs the browser build the pinned Playwright expects. Lighthouse: mobile [73, 77, 77] (gate 75), LCP ≈ 4.6 s, TBT 292–416 ms, CLS 0; desktop 99, a11y/best-practices/SEO 100/100/100 on both.

**Tree.** `.git` 26 MB, of which `docs/screens/` PNGs ≈ 17 MB (15 files at 0.9–1.1 MB); `Medieval Cursor Animation Design/cursors/` at the root; `public/resume.pdf` and `public/rakshit-rameshbabu-resume.pdf` byte-identical (192 KB each, guarded by `tests/seo.spec.ts`); `public/exhibits/` holds only its README; no `LICENSE`, no `vercel.json`, no `.well-known/`, no `dependabot.yml`; `.github/` has the two workflows only. Skip link present (`page.tsx`, `projects/[id]/page.tsx`); heading walk h1 → h2 per act → h3/h4; 23 images, all with `alt`; 9 inline scripts (Next hydration); LQIP is an inline `style` background data URI (`Plate.tsx`). `sound.ts` and `CommandPalette.tsx` are statically imported on every route; no `next/dynamic` anywhere; `next/font` declares four families, all preloaded. The static export copies `public/.well-known/` into `out/` (tested).
