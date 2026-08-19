# Exhibit captures

This folder holds raster assets for the landing page's "exhibit" plates
(`src/components/Exhibit.tsx`) — real product evidence framed like a
museum plate on top of an act's painting. Two of the three exhibits need
no image here at all: Warden's is a typed terminal capture built from real
evidence-table values, and the scheduler's is the existing `BenchmarkChart`
reframed in the same grammar. This folder exists for the third exhibit:
PlantPal+.

## What to capture

2–3 phone-frame screenshots of PlantPal+'s daily dashboard and streaks
screen — the actual running app, not a mockup or a recreation. Suggested
shots:

1. **Dashboard** — the daily dashboard: today's plant-care, workout, and
   nutrition tasks in one view.
2. **Streaks** — the streaks screen: consecutive-day counts across plant
   care, workouts, and meals.
3. *(optional, third slot)* a watering or workout detail screen, if it
   reads well at thumbnail size — add a matching entry to
   `exhibits.plantpal.shots` in `src/content.ts` if you use it.

## Format

- Ship **both** AVIF and WebP for each shot — the same convention
  `scripts/fetch-art.mjs` and `scripts/gen-certificate-thumb.mjs` already
  use. `src/app/page.tsx` renders a `<picture>` offering both; a browser
  fetches exactly one, never both.
- Target width ≈640px (roughly 2x a phone-frame thumbnail's on-page
  width). No need to ship the phone's full native resolution.
- Target **≤200KB per file**. This is a plate, not a full-resolution
  scan — the media budget gate (`npm run budget`,
  `scripts/check-budget.mjs`) will fail the build if a shot pushes the
  landing page's media weight over its ceiling. If a shot doesn't fit
  under budget, the fix is dropping that act's motion clip before
  shrinking or dropping the exhibit — see the Museum-Plate Rule in
  `DESIGN.md`.

## Filenames

Name each pair after its `stem` in `exhibits.plantpal.shots`
(`src/content.ts`):

- `plantpal-dashboard.avif` / `plantpal-dashboard.webp`
- `plantpal-streaks.avif` / `plantpal-streaks.webp`

Drop both files for a shot into this folder and it appears on the site
automatically — `src/app/page.tsx` checks for the pair at build time
(`exhibitShotAssets()`, using `existsSync`), exactly the way
`certificateThumb()` already does for certificate scans. A shot with no
capture yet renders nothing rather than a broken image or a placeholder,
and the whole PlantPal+ exhibit stays absent from the page until at least
one shot's pair exists.

## Wiring captions

Each shot's caption/alt text lives in `exhibits.plantpal.shots`, and the
exhibit's own caption line lives in `exhibits.plantpal.caption` — both in
`src/content.ts`. Edit copy there, never in a component.

The `alt` text currently drafted for each shot is a placeholder, condensed
from `featuredProjects[2].oneLiner` and `caseStudies.plantpal.approach` —
it describes what the app does in general, not what a specific screenshot
shows, because no screenshot exists yet to describe. Once the real
captures land, rewrite each shot's `alt` to describe that exact image.
