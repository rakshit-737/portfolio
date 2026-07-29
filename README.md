# Rakshit Rameshbabu — Portfolio

Personal portfolio for **Rakshit Rameshbabu — Software & Security Engineer**.
Single-page site built with Next.js (App Router) + TypeScript + Tailwind CSS,
fully statically exported — no server runtime.

## Local development

```bash
npm install
npm run dev        # http://localhost:3000
```

## Build (static export)

```bash
npm run build      # outputs the static site to ./out
```

The build must complete with zero type errors. Preview the export with any
static file server, e.g. `npx serve out`.

## Editing content

All copy lives in [`src/content.ts`](src/content.ts) — bio, projects,
achievements, skills, education, links. Components only render what that file
exports, so text edits never touch markup.

## Deployment

### Vercel (primary)

Zero-config: import the repo in Vercel. The static export is detected
automatically. Optionally set `NEXT_PUBLIC_SITE_URL` to the production URL so
Open Graph tags, `sitemap.xml`, and `robots.txt` emit absolute URLs for the
right domain.

### GitHub Pages (fallback)

[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)
builds the export and deploys it with the official Pages actions on every push
to `main`. Enable it once in the repo settings: **Settings → Pages → Source →
GitHub Actions**. The workflow computes `NEXT_PUBLIC_BASE_PATH` and
`NEXT_PUBLIC_SITE_URL` from the repo name, so project pages
(`user.github.io/repo`) work without edits.

## Environment variables (build-time, all optional)

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Absolute origin used in OG tags, sitemap, robots | `https://rakshit-737.github.io` |
| `NEXT_PUBLIC_BASE_PATH` | Sub-path prefix when not served from the domain root | empty |

## Design notes

Concept: **“the evidence file”** — the site reads like a precise researcher’s
record. Tokens (defined in `src/app/globals.css`):

- Palette: graphite `#101418` background, surface `#171C22`, text `#E8EAED`,
  muted `#98A2AD`, **verdict amber** `#E0A83C` (signature element and key
  numbers only), **steel** `#7FB4D9` (links/interactive), pass/fail
  `#4CAF7D`/`#D26B6B` inside metadata chips only.
- Type: Archivo (display), Public Sans (body), IBM Plex Mono (all metadata,
  numbers, labels), loaded with `next/font`.
- Signature element: the **evidence strip** — a mono provenance line
  (date · status · stack · repo · tests/CI) heading every project card, echoed
  by the typed `verified:` line under the hero name (typed once on load;
  `prefers-reduced-motion` renders it instantly).
- Motion: one orchestrated page-load reveal in the hero, subtle hover states,
  nothing else.

### Deviations from the brief

- The 🥇 in the achievements copy is rendered as an amber award icon
  (lucide) instead of the emoji, to respect the "no emoji noise" design ban
  while keeping the "First Prize" content intact.
- The scheduler study stays in **Featured Projects** (it is Featured 2, with
  its headline-numbers strip on the card); the separate **Research Spotlight**
  section carries the constructive-takeaway pull quote, so the two sections
  don't duplicate each other.

## Still to fill in

- `WARDEN_REPO_URL` — set `repoUrl` on the Warden entry in
  [`src/content.ts`](src/content.ts) (currently a disabled "coming soon"
  button).
- `CERTIFICATE_URL` — set `certificateUrl` on the Cyber Secure 360 achievement
  in [`src/content.ts`](src/content.ts).
- `public/resume.pdf` — drop the résumé file in; the download buttons already
  point at it.
- Optional headshot — not currently used by the design; if wanted, add to
  `public/` and extend the About section.
