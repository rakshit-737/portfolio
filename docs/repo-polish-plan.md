# Repo & record polish — Phase 0 plan

Written 2026-09-18 against `docs/repo-polish-prompt.md`. Read-only so far:
nothing in `src/`, `tests/`, `scripts/` or `.github/` has changed for this
brief. The cited repos were cloned `--depth 1` outside the repo, into the
session scratchpad.

## Phase 0 results

**Tree measured:** HEAD `66a64e1`, plus one uncommitted change from the
previous session: the cursor redraw (`Medieval Cursor Animation Design/cursors/*`,
`public/cursors/lamplight-cursor-art.js`, and the three cursor lines of
`src/app/globals.css`). It is CSS-only. It shrinks the cursor data URIs from
27.8 KB to 16.7 KB and ships no JS. See decision D1.

| Gate | Result |
| --- | --- |
| `check:art` | OK, 60 files verified |
| `typecheck`, `lint`, `build` | OK |
| `budget` | `/` 193.6 kB gz JS · each case file 189.4 kB (ceiling 214) · media 2 207 kB (3 500) · above-the-fold 149 kB (700) |
| `check:links` | 300 internal refs across 7 HTML files, 0 broken · 21/21 GitHub links reachable |
| `check:content` | OK (3 terms) |
| `npm test` | 229 passed, 0 failed (default workers, full suite, root shape) |

**Lighthouse** (`node scripts/check-lighthouse.mjs` against `serve out`, local Windows Chromium):

| Pass | Mobile perf runs | Mobile median | Desktop median | a11y / BP / SEO |
| --- | --- | --- | --- | --- |
| 1 | 68, 76, 74 | 74 (FAIL, min 75) | 99 | 100 / 100 / 100 |
| 2 | 79, 79, 79 | 79 | 98 | 100 / 100 / 100 |
| 3 | 79, 80, 82 | 80 | 98 | 100 / 100 / 100 |

On a quiet machine (passes 2 and 3) the six mobile runs give a median of
**79**. Pass 1 ran while a research agent was cloning and grepping four repos on the
same machine. Its lowest run lost on Speed Index (5.3 s against 1.1–3.3 s
elsewhere), not on LCP. LCP holds at about 4.75–4.88 s on every mobile run and TBT
sits between 135 and 382 ms. CLS is 0 throughout. The Chromium EPERM on
temp-profile cleanup is the known case the script already tolerates.

## Where the source disagrees with the brief

The source wins in every row. Each one changes a plan below.

| Brief says | Source says |
| --- | --- |
| Scheduler and PlantPal+ numbers "match the site" | The scheduler repo's own `reports/honest_claims.md` §C lists **"45,432 real dispatch instants"** under *Never say these*; the site says it four times. R² ≈ 0.84 / MAE ≈ 4.69 was corrected in v3.6 to R² 0.811 ± 0.021 / MAE 4.90 ± 0.45. PlantPal+'s stated gaps (quiet hours, purge sweep, custom-food delete) are now closed in code. See new items 1.6 and 1.7. |
| Warden analyzers: "13 by one reading, 14 by another" | **14.** `ALL_ANALYZERS` registers 14 instances, the directory holds 14 modules, the README's detection table has 14 rows. One README line (§ *What is implemented today*) still says 13. That is the repo's own inconsistency. |
| Warden test count from the README | README states none. `def test_` summed over `backend/tests/` gives **1,471** (205 `parametrize` decorators, so pytest collects more). The frontend has 263 `it(`/`test(` calls. The brief's `tests/` path does not exist; the suite lives in `backend/tests/`. |
| Add an assertion that warden's JSON-LD `codeRepository` equals `repoUrl` | Already exists for every case study (`tests/seo.spec.ts:197`). The rename is guarded as it stands. |
| 1.4: add the basePath canonical assertion to `seo.spec.ts` | `playwright.subpath.config.ts` runs `smoke.spec.ts` only, so a sub-path assertion in `seo.spec.ts` would never execute in the sub-path shape. It goes in `smoke.spec.ts`. |
| README fixes: "Deployed in Vercel", blank line before `## Local development`, `/resume.pdf` mentions | *Corrected 2026-09-18:* the first two did exist — they were in the owner's remote commit `62ca6f3`, which the local clone lacked when this plan was written. `/resume.pdf` appears only in `PRODUCT.md` (fixed in 1.1). |
| `docs/screens/` is 15 files; `.git` is 26 MB | 24 files, 17 MB; `.git` is 32 MB. |
| Fillwright: add by date, "the list is newest-first" | `moreProjects` is not strictly newest-first (SentinelCore, Aug 2025, sits above the Web App Security Suite, Dec 2025). Fillwright (created 2026-09-11) is newest of all, so it goes first either way. |
| Owner must set repo About, topics and the release by hand | `gh` is authenticated here as `rakshit-737`. `gh repo edit` and `gh release create` can do those, with your go-ahead (D6). Pins and the social preview image still need the web UI. |
| README design notes, to be moved verbatim | They say the cursor is "no ember — they are graphics". The key's gem is ember and always was. Moving that line verbatim would carry a false claim forward. |
| `PRODUCT.md` budget | Says ceiling 210 kB; `check-budget.mjs` enforces 214 kB. |

## Decisions I need from you

- **D1 — the cursor redraw.** It is uncommitted work from the previous session. I recommend committing it as its own `fix(cursor)` commit before Phase 1, so no Phase commit carries it by accident.
- **D2 — `REDACT_REGISTRATION` is `?`.** It only gates 5.3, so it blocks nothing now.
- **D3 — Warden's three headline numbers.** Proposed: `14` analyzers · `13 / 14` malicious detected (synthetic benchmark) · `1,471` backend test functions. Alternatives for the third: keep `0–100` (still emitted "for compatibility, derived"), or drop the test count because pytest would collect more than the grep finds.
- **D4 — scope 1.6 and 1.7 in.** They are not in the brief's item list, but they are squarely inside its goal ("make every fact on the site match the repository it cites today"). The scheduler items are claims its own repo forbids.
- **D5 — the README's Lighthouse line.** The local numbers swing with machine load. I recommend quoting the CI gate's medians from the latest green `main` run (read with `gh run view --log`), dated and linked to the run, rather than this laptop's.
- **D6 — `gh` for the outward-facing settings.** Yes: I apply About, website and topics with `gh repo edit` and create the v1.0.0 release when 2.5 lands, each after showing you the exact command. No: I write `docs/github-presentation.md` and you paste.
- **D7 — Warden's kicker.** The README title dropped "firewall" for "platform", but `pyproject.toml` still says "firewall". I recommend changing the act kicker to match the README.

## Phase 1 — the record tells the truth

**1.2 Rename (first, tiny).** Two hits, both in `src/content.ts` (`repoUrl` and the evidence `href`); no other tracked file carries the old slug. Proof: `check:links` reports the new URL reachable (the GitHub API resolves the old slug as a redirect, so the provenance fetch works either way). Risk: none.

**1.1 Warden.** Source: the README, `docs/BENCHMARK.md`, `docs/ARCHITECTURE.md` §6, `backend/benchmark/results/latest.json`, the registry, and the GitHub API (created 2026-07-04, v2.0.0 released 2026-09-17).
- `content.ts`: `heroStats[2]` → 14 analyzers, label re-worded around "security platform". `featuredProjects[0]`: name from the README title, oneLiner and all three bullets rewritten to the 14-analyzer, multi-dimension-risk design, `React 19` in tech, headline numbers per D3, evidence chip. `caseStudies.warden`: problem, approach, and a diagram with the README's correlation stage added, all rewritten. Decisions re-derived from ARCHITECTURE §6: the NumPy example goes, the "synthetic data" decision becomes "synthetic plus a small measured real set". The evidence table becomes the benchmark (detection 13/14, evasive 4/4, benign 1/8 warned and none blocked, plus sample rows including the one miss). Outcome, next (the README's four *Not implemented yet* bullets), and teaser follow. The "few hundred milliseconds" claim goes: nothing in the repo supports it. `exhibits.warden.rows` re-pointed at the new benchmark rows. `about.paragraphs[1]` updated. Each block gets a source comment, as the DocForge entry does.
- Elsewhere: `PRODUCT.md` *Evidence on Hand* and *Absences* (the certificate line is stale: `public/certificates/cyber-secure-360-2025.png` exists). `SBOM`, `SARIF` and `CycloneDX` go into `check-content-lint.mjs` with `homeActs: ["warden"]` if they reach the index. `docs/resume-diff.md` is built from `pdftotext`, which is installed; claims only, no contact header.
- Proof: build (a stale exhibit label fails it by design), `check:content`, the seo, smoke and mobile specs, and a read of `out/llms.txt` plus a look at `out/og.png`. Risk: a longer hero label or headline label at 390 px (`mobile.spec.ts`), and the index gaining insider terms.

**1.3 Fillwright.** The research agent's draft entry exists; I re-check every clause against the README before writing it. Source: README, `package.json`, GitHub API (created 2026-09-11, last push 2026-09-17, v0.5.0 released 2026-09-17, MIT). Chip: `**96 end-to-end tests in real Chrome**`, a README-stated measurement. It goes first in `moreProjects`. Proof: `check:content`, `ledger.spec.ts` and `mobile.spec.ts` at 390×844. Risk: a long description wrapping in the ledger row, so I trim to the README's own sentences if it does.

**1.6 Scheduler (new, per D4).** Source: the README, `reports/honest_claims.md`, `CHANGELOG.md`, `CITATION.cff`. Fix "45,432 real dispatch instants" in `bullets[1]`, `outcome[0]` and `researchSpotlight.context`, writing it the way §C asks: 41,786 real plus 3,646 synthetic. Fix R² and MAE in approach, diagram and evidence. Remove "modal" from the fourteen policies. Update "as of v3.4", which will need your call because the README says v3.6 and `CITATION.cff` says v3.7. Add the Holm caveats the README makes mandatory for the LANL 15.3% and +74% figures, and change `benchmarkChart.unit` to minutes. Also review the two §C wording risks: "collapses to a sort by requested job size" and the kicker "A proven no". Proof: `check:content`, whose TOST and SDSC terms stay home, plus the brand and lamplight specs, since the scheduler act's `.ignite` metrics change. Risk: the act statement "The answer is a proven negative result." stays, because the README keeps that framing.

**1.7 PlantPal+ (new, per D4).** `outcome[1]` and `next` drop the three gaps now closed in code, keeping the five the README still lists. The test count stays at 307: it is the README's figure, and the code count (395) is not stated anywhere. Proof: build and smoke. Risk: none.

**1.4 One canonical URL.** `site.url` fallback becomes `https://rakshit-737.vercel.app`. In `deploy-pages.yml`, both branches set `NEXT_PUBLIC_SITE_URL` to that value while still computing the base path. In `ci.yml`, the `subpath` job env changes to match. Also: the `seo.spec.ts` header comment, the README env table, `PRODUCT.md` *Operating Context*, and `package.json` `homepage` (landing with 2.3's metadata). A new `smoke.spec.ts` test asserts the canonical never contains the base path while the hero plate's `src` does. Proof: two local builds, root and `/portfolio`, each checked with `grep rel="canonical"` on `out/index.html` and the `<loc>` lines of `out/sitemap.xml`, plus the sub-path Playwright config. Consequence to accept: the mirror's favicon, OG image and icons will load from Vercel, because they are built from `site.url` (`layout.tsx` explains why relative icon hrefs cannot work under the metadata API). `brand.spec.ts` strips `site.url` before fetching, so it keeps passing.

**1.5 Refresh Vercel.** `refresh-vercel.yml`: `workflow_dispatch` plus the Monday cron, `permissions: {}`, one step that exits 0 with a `::notice::` when `VERCEL_DEPLOY_HOOK` is empty and otherwise POSTs with `curl -fsS`. Documented in the README. It cannot be exercised until you add the secret. Risk to gates: none.

## Phase 2 — the front door

**2.1 README.** ≤ 200 lines, in the brief's 13-section order. `DESIGN.md` is 1 195 lines; I diff the README's *Design notes* against it section by section, delete what it already holds, and move the remainder to `docs/design-notes.md`, correcting the cursor-ember line. The Lighthouse line follows D5. Proof: markdown link check by eye plus `check:links` (which does not crawl the README, so I verify relative links with a small grep). Risk: none to gates.

**2.2 LICENSE.** MIT, `Copyright (c) 2026 Rakshit Rameshbabu`. Carve-out paragraph in the README and a short comment at the top of `content.ts`. Proof: `gh repo view --json licenseInfo` after push. Risk: none.

**2.3 package.json.** Add `description`, `homepage`, `repository`, `author` and `license`, and bump `@types/node` to `^22`, then `npm install` and the full gate. Risk: newer Node types can surface typecheck errors, which I fix in code and never with `any`.

**2.4 Captures.** `scripts/capture-readme.mjs` serves `./out`, uses Playwright's Chromium with the pointer on the hero statement, waits for `data-seen`, then encodes through `sharp`. Outputs: `hero-1440.webp` ≤ 250 KB, `hero-390.webp` ≤ 120 KB and `social-preview.jpg` < 1 MB; the script fails if any cap is exceeded. No GIF unless a ≤ 3 MB loop holds. Risk: none; `docs/` is outside every budget.

**2.5 Release.** `docs/releases/v1.0.0.md` from `git log` with the brief's five dated milestones, checked against the commits. The tag and `gh release create` wait for Phases 1–3 to be merged and green, and for D6.

**2.6 GitHub presentation.** `docs/github-presentation.md` holds the strings verbatim from the brief, plus the profile README draft with one number per headline project taken from `content.ts` after Phase 1. Executed with `gh` only under D6.

## Phase 3 — hygiene and posture

**3.1 Cursor folder.** `git mv` to `docs/design/cursors/`, including its `.gitignore`. Three references need updating: the `eslint.config.mjs` comment, the `globals.css` comment, and the folder's `README.md`. `build.mjs` paths are relative (`../../src/app/globals.css`, `../../public/cursors/`) and gain a level (`../../../`); it is verified by running it and confirming the checksum of `globals.css` is unchanged. ESLint already lints that folder today and will keep doing so. Risk: `build.mjs` silently writing to a wrong path, hence the checksum check.

**3.2 Screens to WebP.** 24 PNGs through `sharp` at quality 80, with references updated in `DESIGN.md` (4 `.png` mentions to check, some of which may be art, not screens) and the `globals.css` comment. The collectUI brief has no literal `.png`, so I grep it for "PNG" before editing. Add `scripts/webp-screens.mjs` and delete the PNGs. `PURGE_SCREENS_HISTORY=no`, so history stays; I report what a fresh clone would weigh without them. Proof: `du -sh docs/screens` under 2 MB.

**3.3 Dependabot.** As specified. Proof: GitHub's config validator runs on push; nothing local. Risk: none.

**3.4 Headers.** The CSP string lives only in `scripts/csp.mjs`. `scripts/check-vercel-json.mjs` fails if `vercel.json` differs from it, and runs as part of `check:content` or as its own script in CI. One deviation from the brief, for your OK: the test injects the policy as a real **response header** through Playwright's `context.route`, not a `<meta>`. A header is what Vercel sends, and it also enforces `frame-ancestors`, which a meta policy ignores. That runs `smoke`, `lamplight` and `sound` under the policy as a separate Playwright project. Nothing in the runtime needs workers, blobs or `eval` (grepped `src/` and `public/cursors/`), so `worker-src 'none'` holds. Risk: `upgrade-insecure-requests` against `http://localhost` may upgrade same-origin subresource loads. If it does, the test strips that one directive for localhost and says so in a comment. The `layout.tsx` meta is skipped unless you ask.

**3.5 security.txt.** As specified, `Expires: 2027-09-18T00:00:00.000Z`. Three `seo.spec.ts` assertions cover the content type, `Contact` and `Canonical`, and a future `Expires`. Risk: `serve` must return `text/plain` for a file with no extension, which the test checks before anything relies on it.

**3.6 Dependency refresh.** `npm update` within ranges, then `npx playwright install chromium` and the full gate. The budget is reported before and after. Risk: a Next patch changing chunking, so the budget delta is reported per page.

## Phase 4 — measured first

Baseline: the six quiet mobile runs above (median 79, TBT 135–225 ms, LCP ≈ 4.75 s), plus one more pass run immediately before the first change, making nine. Pass 1 is excluded because it ran under load. LCP does not move across runs, so it is the image and the fonts, not script; TBT is where 4.2 and 4.3 can show.

**4.1 Chivo stops preloading.** `preload: false` on that one family. Caveat: on case files, `project.oneLiner` in `.prose-field` sits just under the provenance line, near the fold. Lighthouse only measures `/`, so I check case-file CLS by hand at 390×844 and 1440×900.

**4.2 Sound gate.** `src/lib/sound-gate.ts` re-exports the functions the five importers actually use (to enumerate before writing), backed by one memoised `import("./sound")` that starts on the first `pointerdown`/`keydown`. The `ui-sound` events must still fire only after a real play. Proof: the four sound specs unchanged, plus the gzipped JS delta on `/`.

**4.3 Palette as a chunk.** `OPEN_PALETTE_EVENT` moves to `src/lib/palette.ts`; `PaletteLoader.tsx` owns the ⌘K/Ctrl K listener and the open event and calls `next/dynamic` on first trigger. Both `page.tsx` files switch to the loader. Proof: smoke "⌘K palette opens and jumps", `hirepath.spec.ts`, and the a11y palette specs (Tab trap, axe with the palette open), which must stay green. Risk: the first open racing the chunk, so the loader queues the open until mount.

**4.4 Ratchet.** Only if the median is ≥ 82 across three consecutive passes, then `MIN.mobile.performance` → 80. Otherwise it stays at 75 and I say what was tried.

## Commit order

D1 (cursor), then 1.2, 1.1, 1.3, 1.6, 1.7, 1.4, 1.5. I stop for your review. Then Phase 2, then Phase 3, then Phase 4. Every commit runs the full gate in the brief. The Playwright suite runs with `--workers=2` locally, because the default worker count fails timing-sensitive specs on this machine. Every spec that fails in parallel is rerun serially before I report it.

## Phase 4 results (measured 2026-09-19)

Nine local mobile Lighthouse runs per state (`node scripts/check-lighthouse.mjs`,
three passes of three), on a quiet machine:

| State | Mobile runs | Median | TBT | LCP |
| --- | --- | --- | --- | --- |
| Baseline (after Phases 1–3) | 82 82 81 · 82 81 82 · 83 81 81 | 82 | 78–177 ms | 4.74 s |
| **4.1 Chivo not preloaded — kept** | 83 83 83 · 83 83 83 · 83 83 81 | 83 | 42–58 ms | 4.74 s |
| Ceiling: sound + palette chunks deleted outright (16 + 9 kB gz) | 83 83 83 | 83 | 31–39 ms | 4.67–4.74 s |
| Ceiling: every script deleted | 88 88 88 | 88 | 0 ms | 3.92 s |

- **4.1 kept:** TBT fell by about 80 ms, past the brief's −50 ms bar, and LCP held.
- **4.2 and 4.3 not implemented.** Deleting both chunks entirely, which is more than any lazy load can achieve, moves neither keep criterion: the median gain is 0 of the required 3, and TBT falls by about 18 ms against the required 50. By the brief's rule they would be reverted, so they were measured as a ceiling rather than built.
- **The LCP is the hero plate** (`blacksmith-narrow-960.avif`, fetchpriority high). What remains is the React and Next runtime's bytes competing with it in Lighthouse's simulation, not the site's own features.
- **4.4 not applied.** The ratchet's precondition, that 4.1 to 4.3 all hold, is not met, so `MIN.mobile.performance` stays 75. CI's recent medians (81 and 83) each came with a cold first run as low as 59, so an 80 floor would also sit close to that noise.
