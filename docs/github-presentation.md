# GitHub presentation — strings to paste

Everything GitHub shows about this repository and its owner that no commit
can set. Each block is the exact text to paste; nothing here should be
retyped from memory. Where a `gh` command can apply it, the command is
given too (it needs `gh auth login` as `rakshit-737`).

## Repository → About (the gear beside "About")

**Description** (≤ 350 characters; 215 here):

```
Rakshit Rameshbabu's portfolio — a scroll-driven, candlelit record built on public-domain paintings. Next.js 16 static export; every claim carries live GitHub provenance, CI-gated on axe, Lighthouse and a JS budget.
```

**Website:**

```
https://rakshit-737.vercel.app
```

**Topics** (20):

```
portfolio portfolio-website developer-portfolio personal-website nextjs react typescript tailwindcss static-site vercel github-pages playwright accessibility lighthouse web-audio-api creative-coding seo open-graph cybersecurity student-portfolio
```

Or all three at once:

```bash
gh repo edit rakshit-737/portfolio \
  --description "Rakshit Rameshbabu's portfolio — a scroll-driven, candlelit record built on public-domain paintings. Next.js 16 static export; every claim carries live GitHub provenance, CI-gated on axe, Lighthouse and a JS budget." \
  --homepage "https://rakshit-737.vercel.app" \
  --add-topic portfolio,portfolio-website,developer-portfolio,personal-website,nextjs,react,typescript,tailwindcss,static-site,vercel,github-pages,playwright,accessibility,lighthouse,web-audio-api,creative-coding,seo,open-graph,cybersecurity,student-portfolio
```

## Repository → Settings → General

- **Social preview:** upload `docs/readme/social-preview.jpg` (1280×640,
  under GitHub's 1 MB limit).
- **Features:** untick *Wikis* and *Projects* if they are unused, so the
  sidebar shows only what exists.

## Profile (github.com/settings/profile)

- **Bio**, matching the site's role line rather than reversing it:

  ```
  Software & Security Engineer — B.Tech Cyber Security @ VIT Chennai
  ```

- **Location:** Chennai
- **Website:** `https://rakshit-737.vercel.app`. Remove the second
  portfolio link, so the profile points at one site.

## Pinned repositories, in this order

1. `portfolio`
2. `warden-supply-chain-security`
3. `proactive-feasibility-scheduler`
4. `PlantPal-Plus`
5. `taintwall`
6. `DocForge`

## Profile README

For `rakshit-737/rakshit-737` (a separate repository whose README GitHub
shows on the profile). It replaces the current language-list paragraph.
Every number is taken from `src/content.ts` as of 2026-09-19. When the site
changes, change this too.

```markdown
**Software & Security Engineer — B.Tech (Cyber Security) @ VIT Chennai**

I build full-stack products and backend systems, taken end-to-end.

- **[Warden](https://github.com/rakshit-737/warden-supply-chain-security)** — a software supply-chain security platform that gives a Python package an allow, warn or block verdict without running its code. 14 analyzers; 2,908 backend tests pass in CI.
- **[Proactive Feasibility Scheduler](https://github.com/rakshit-737/proactive-feasibility-scheduler)** — an evaluation study of ML-based GPU-cluster job scheduling. Zero counterexamples in 45,432 dispatch instants (41,786 real, 3,646 synthetic).
- **[PlantPal+](https://github.com/rakshit-737/PlantPal-Plus)** — one app for plant care, fitness and nutrition, specified before it was built. 307 tests across four workspaces.

The research finding: a learned wait-time score cannot tell two queued jobs apart by anything except their requested size, so the honest baseline for an ML scheduler is the ML-free control its features imply, not FIFO.

[Portfolio](https://rakshit-737.vercel.app) · [Résumé](https://rakshit-737.vercel.app/rakshit-rameshbabu-resume.pdf)
```
