import { existsSync } from "node:fs";
import { join } from "node:path";
import { ArrowUpRight } from "lucide-react";
import { preload } from "react-dom";
import { GithubIcon, LinkedinIcon } from "@/components/icons";
import Act from "@/components/Act";
import BenchmarkChart from "@/components/BenchmarkChart";
import { BracketLink } from "@/components/Bracket";
import CommandPalette from "@/components/CommandPalette";
import CopyEmailButton from "@/components/CopyEmailButton";
import Exhibit from "@/components/Exhibit";
import Metric from "@/components/Metric";
import Nav from "@/components/Nav";
import Plate, { narrowSrcset, narrowTiers, srcset } from "@/components/Plate";
import Provenance from "@/components/Provenance";
import Rail, { type RailItem } from "@/components/Rail";
import SineLattice from "@/components/SineLattice";
import Statement from "@/components/Statement";
import {
  about,
  achievements,
  acts,
  archive,
  benchmarkChart,
  caseStudies,
  certifications,
  contact,
  education,
  exhibits,
  featuredProjects,
  hero,
  heroStats,
  links,
  moreProjects,
  researchSpotlight,
  site,
  skills,
} from "@/content";
import { plates } from "@/lib/art";
import { withBase } from "@/lib/base";
import { withCredit } from "@/lib/credit";
import { fetchRepoLive, liveSegments } from "@/lib/github";

const SHELL = "mx-auto w-full max-w-[100rem] px-5 sm:px-8 lg:px-12";

// The mobile-collapsed "verified record ↗" link reuses the same receipt
// as the full strip's "tested in CI" token, rather than a second literal
// URL that could drift from it.
const foundCiToken = hero.provenance.tokens.find(
  (t) => t.label === "tested in CI",
);
if (!foundCiToken) {
  throw new Error('hero.provenance.tokens is missing its "tested in CI" entry');
}
const ciToken: (typeof hero.provenance.tokens)[number] = foundCiToken;

// The warden exhibit's terminal lines are resolved against the real
// evidence table here, not hand-copied, so they can never drift from it —
// a label in `exhibits.warden.rows` that stops matching a row fails the
// build loudly instead of silently dropping a line.
const wardenExhibitRows = exhibits.warden.rows.map((label) => {
  const row = caseStudies.warden.evidence.find((e) => e.label === label);
  if (!row) {
    throw new Error(
      `exhibits.warden.rows references a label not in caseStudies.warden.evidence: "${label}"`,
    );
  }
  return row;
});

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: hero.name,
  jobTitle: "Software & Security Engineer",
  url: site.url,
  image: `${site.url}/og.png`,
  email: `mailto:${links.email}`,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Chennai",
    addressCountry: "IN",
  },
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: "VIT Chennai",
  },
  knowsAbout: skills.flatMap((s) => s.items),
  sameAs: [links.github.url, links.linkedin.url],
};

const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.title,
  url: `${site.url}/`,
  author: { "@type": "Person", name: hero.name },
};

/** A `Certification.image` names a path under `public/`, but the file is
 *  owner-supplied and may not exist yet — checked at build time so a
 *  missing scan renders the entry text-only instead of a broken image or
 *  a failed build. Never a placeholder image. */
function certificateImage(image: string | undefined): string | null {
  if (!image) return null;
  return existsSync(join(process.cwd(), "public", image)) ? image : null;
}

/** A small AVIF/WebP pair for the thumbnail slot, named by convention from
 *  the full-resolution scan (`gen-certificate-thumb.mjs`, run manually and
 *  committed like the rest of the site's generated art). The full file
 *  stays the link target — this only ever replaces the *thumbnail*, never
 *  the scan a click opens. Falls back to the full PNG in the (currently
 *  hypothetical) case a thumbnail hasn't been generated for a given scan
 *  yet, so a missing thumbnail degrades to the old, oversized-but-correct
 *  rendering rather than a broken build or a placeholder image. */
function certificateThumb(image: string): { avif: string; webp: string } | null {
  const stem = image.replace(/\.[^./]+$/, "");
  const avif = `${stem}-thumb.avif`;
  const webp = `${stem}-thumb.webp`;
  const has = (p: string) => existsSync(join(process.cwd(), "public", p));
  return has(avif) && has(webp) ? { avif, webp } : null;
}

/** A plantpal exhibit shot's AVIF/WebP pair under `public/exhibits/`,
 *  named by its `stem` (`exhibits.plantpal.shots`, src/content.ts). The
 *  owner-supplied capture may not exist yet — checked at build time,
 *  exactly like `certificateThumb()` above, so a shot with no capture
 *  renders nothing rather than a broken image or a placeholder. See
 *  public/exhibits/README.md. */
function exhibitShotAssets(stem: string): { avif: string; webp: string } | null {
  const avif = `${stem}.avif`;
  const webp = `${stem}.webp`;
  const has = (p: string) => existsSync(join(process.cwd(), "public", p));
  return has(avif) && has(webp) ? { avif, webp } : null;
}

export default async function Home() {
  // Baked in at build time — the static export is the record.
  const generatedOn = new Date().toISOString().slice(0, 10);

  // Live provenance fetched at build time; null (offline, rate-limited)
  // simply renders the static segments unchanged. The portfolio repo
  // itself is fetched too — the record carries its own verification.
  const [featuredLive, moreLive, siteLive] = await Promise.all([
    Promise.all(
      featuredProjects.map((p) => (p.repoUrl ? fetchRepoLive(p.repoUrl) : null)),
    ),
    Promise.all(
      moreProjects.map((p) => (p.repoUrl ? fetchRepoLive(p.repoUrl) : null)),
    ),
    fetchRepoLive("https://github.com/rakshit-737/portfolio"),
  ]);

  // The hero plate's LCP candidate (`#hero .plate-dark img`) otherwise isn't
  // discovered until the browser parses well into the document — it's
  // inside a `<picture>` several hundred lines down. `react-dom`'s
  // `preload()` emits a real `<link rel="preload">` into `<head>` during
  // the server render, so the fetch starts with the HTML rather than after
  // layout. Plain JSX `<link>` elements do NOT auto-hoist into `<head>` in
  // this Next.js version — only `<title>`/`<meta>`/`<link rel="stylesheet">`
  // do, per the resource-preloading docs — so this imperative call is the
  // only path in. Two candidates, gated by the same `(max-width: 48rem)`
  // breakpoint `Plate.tsx` uses for its narrow `<source>`, so a phone never
  // fetches the wide crop and vice versa. AVIF only — matches the format
  // `Plate.tsx` lists first, which every Lighthouse-class Chrome decodes.
  if (narrowTiers(acts.hero.plate, "avif").length > 0) {
    preload(withBase(`/art/${acts.hero.plate}-narrow-960.avif`), {
      as: "image",
      imageSrcSet: narrowSrcset(acts.hero.plate, "avif"),
      imageSizes: "100vw",
      media: "(max-width: 48rem)",
      type: "image/avif",
      // Matches the `<img>` itself, which already carries
      // fetchpriority="high" — Lighthouse's LCP-discovery check flags a
      // preload hint that doesn't also opt into high priority, since a
      // default-priority preload can still queue behind other requests.
      fetchPriority: "high",
    });
  }
  preload(withBase(`/art/${acts.hero.plate}-1920.avif`), {
    as: "image",
    imageSrcSet: srcset(acts.hero.plate, "avif"),
    imageSizes: "100vw",
    media: "(min-width: 48.0625rem)",
    type: "image/avif",
    fetchPriority: "high",
  });

  const buildRail: RailItem[] = [
    { value: generatedOn, label: "record generated" },
    ...(siteLive?.sha
      ? [
          {
            value: siteLive.sha,
            label: "this site, head",
            href: `${siteLive.repoUrl}/commit/${siteLive.sha}`,
          },
        ]
      : []),
    ...(siteLive?.ci
      ? [
          {
            value: siteLive.ci,
            label: "this site, ci",
            href: `${siteLive.repoUrl}/actions`,
          },
        ]
      : []),
    { value: hero.location, label: "based in" },
  ];

  return (
    <>
      <a
        href="#top"
        className="label sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-100 focus:bg-signal focus:px-3 focus:py-2 focus:text-ground"
      >
        Skip to content
      </a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
      />
      <Nav />
      <CommandPalette />

      <main id="top">
        <Act
          id="hero"
          label={acts.hero.label}
          lamp={plates[acts.hero.plate].lamp}
          className="flex items-end"
        >
          <Plate id={acts.hero.plate} priority />

          <div className={`${SHELL} scrim relative z-10 pb-20 sm:pb-24`}>
            <p className="label">{hero.role}</p>

            <h1 id="hero-title" className="statement mt-6">
              {acts.hero.statement}
            </h1>

            {/* Positioning line — a plain-English sentence a stranger can
                parse before reaching a single number. Not `.prose-field`:
                the hero stays in the site's mono default voice (the
                Monospace Default Rule, DESIGN.md) — the reading-passage
                face is reserved for the acts that actually carry body
                copy, an invariant `tests/lamplight.spec.ts` locks down
                per act. */}
            <p className="mt-4 max-w-[34ch] text-base leading-relaxed sm:text-lg">
              {hero.positioning}
            </p>

            {/* Mobile: the strip collapses to one link at the Actions
                receipt, so the 390px hero still fits without a second
                markup branch for the tokens themselves. */}
            <a
              href={ciToken.href}
              target="_blank"
              rel="noopener noreferrer"
              className="label mt-6 inline-flex items-center gap-1.5 underline decoration-rule underline-offset-4 transition-colors hover:text-ember hover:decoration-ember focus-visible:text-ember sm:hidden"
            >
              verified record
              <ArrowUpRight size={11} aria-hidden="true" />
            </a>

            {/* sm and up: every token of "verified" links to its own
                receipt — a proof strip, not a self-claim. */}
            <p className="label mt-6 hidden flex-wrap items-center gap-x-2 gap-y-1 normal-case sm:flex">
              <span className="bg-signal px-1.5 py-0.5 text-ground">
                {hero.provenance.prefix}
              </span>
              {hero.provenance.tokens.map((t, i) => (
                <span key={t.label} className="inline-flex items-center gap-2">
                  {i > 0 && (
                    <span aria-hidden="true" className="opacity-60">
                      ·
                    </span>
                  )}
                  <a
                    href={t.href.startsWith("/") ? withBase(t.href) : t.href}
                    {...(t.href.startsWith("/")
                      ? {}
                      : { target: "_blank", rel: "noopener noreferrer" })}
                    aria-describedby={`hero-proof-${i}`}
                    className="underline decoration-rule underline-offset-4 transition-colors hover:text-ember hover:decoration-ember focus-visible:text-ember"
                  >
                    {t.label}
                  </a>
                  <span id={`hero-proof-${i}`} className="sr-only">
                    {t.proof}
                  </span>
                </span>
              ))}
            </p>

            {/* Mobile keeps exactly one stat above the fold (9.07, the
                middle item) — presentation only, all three still render in
                the DOM and light up together once the lamp reaches them. */}
            <Rail
              items={heroStats}
              className="mt-10 [&>div]:hidden [&>div:nth-child(2)]:block sm:[&>div]:block"
              ignite
            />

            <div className="print-hidden mt-10 flex flex-wrap items-center gap-3">
              <BracketLink href={withBase("/projects/warden/")} weight="filled">
                Read the Warden case file
              </BracketLink>
              <BracketLink href={withBase(links.resume)} download>
                Résumé
              </BracketLink>
            </div>

            <Provenance
              className="mt-8"
              segments={withCredit(acts.hero.plate, buildRail.map((r) => ({
                label: `${r.label}: ${r.value}`,
                href: r.href,
              })))}
            />
          </div>
        </Act>

        <Act
          id="about"
          label={acts.about.label}
          lamp={plates[acts.about.plate].lamp}
          className="flex items-center"
        >
          <Plate id={acts.about.plate} />

          <div className={`${SHELL} scrim relative z-10 py-24`}>
            <Statement id="about-title">{acts.about.statement}</Statement>

            <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="prose-field">
                {about.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)}>{p}</p>
                ))}
              </div>
              <div>
                <h3 className="label border-b border-rule pb-2">Interests</h3>
                <ul className="mt-4 space-y-2.5">
                  {about.interests.map((interest, i) => (
                    <li
                      key={interest}
                      className="flex items-baseline gap-3 font-mono text-sm"
                    >
                      <span aria-hidden="true" className="label shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {interest}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Provenance
              className="mt-10"
              segments={withCredit(acts.about.plate, [])}
            />
          </div>
        </Act>

        {featuredProjects.map((project, i) => {
          const act = acts[project.id];
          const live = featuredLive[i];
          return (
            <Act
              key={project.id}
              id={project.id}
              label={act.label}
              lamp={plates[act.plate].lamp}
              className="flex items-center"
            >
              <Plate id={act.plate} />

              {/* `.scrim-wide` on `scheduler` only, not the standard
                  `.scrim`: `headlineNumbers` renders as an unconstrained
                  `flex flex-wrap` row (no max-width), so its rightmost
                  value's x-position is content-driven. Measured directly:
                  scheduler's third value ("p = 2.6×10⁻¹⁶", the widest label
                  of any featured project) centres at ~43% of a 1280px
                  viewport and extends to ~53% — inside the standard
                  scrim's fading band (30%–62%), not its protected one. Lit,
                  it measured L=0.086, below AA against the ember contrast
                  gate's minimum — that gate now checks the real WCAG ratio
                  directly (`EMBER_AA_MIN`, tests/lamplight.spec.ts) rather
                  than the fixed background-luminance ceiling this comment
                  originally cited, but the underlying measurement and the
                  reason `.scrim-wide` is scoped here are unchanged.
                  Scoped to `scheduler` specifically, not applied to warden
                  and plantpal too: `.scrim-wide` widens the *whole* scrim
                  box's protected band, which also covers part of where
                  each act's own lamp rests (warden's sits at x≈52%, which
                  the wide band's fade only clears by 85% — tried widening
                  all three first, and it measurably dimmed warden's own
                  reveal pool, `L 0.089 → 0.015`, enough to fail "the
                  lamp's reveal pool is measurably brighter than the
                  frame's far edge"). Widening only the one act whose
                  copy actually needs it avoids trading a real fix for a
                  new regression in a plate this doesn't concern. */}
              <div
                className={`${SHELL} scrim ${project.id === "scheduler" ? "scrim-wide" : ""} relative z-10 py-24`}
              >
                <p className="label">{project.timeframe}</p>
                <Statement id={`${project.id}-title`}>{act.statement}</Statement>

                <p className="prose-field mt-8">{project.oneLiner}</p>

                {project.headlineNumbers && (
                  <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6 border-y border-rule py-6">
                    {project.headlineNumbers.map((n) => (
                      <div key={n.label}>
                        <dd
                          className="ignite font-mono text-3xl leading-none font-semibold tracking-tight tabular-nums sm:text-4xl"
                          data-value={n.value}
                        >
                          {n.value}
                        </dd>
                        <dt className="label mt-2">{n.label}</dt>
                      </div>
                    ))}
                  </dl>
                )}

                {project.id === "warden" && (
                  <Exhibit caption={exhibits.warden.caption}>
                    <pre className="font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap tabular-nums sm:text-sm">
                      {wardenExhibitRows.map((row) => {
                        // Every evidence value is "risk <n> — <verdict>"
                        // verbatim (src/content.ts) — parsed, never
                        // retyped, so the terminal can't drift from it.
                        const match = row.value.match(/^risk (\d+) — (.+)$/);
                        return (
                          <span key={row.label} className="mb-4 block last:mb-0">
                            <span className="block">
                              $ warden scan {row.label}
                            </span>
                            <span className="block pl-4">
                              {match ? (
                                <>
                                  {"→ risk "}
                                  {match[2] === "block" ? (
                                    <span className="ignite" data-value={match[1]}>
                                      {match[1]}
                                    </span>
                                  ) : (
                                    match[1]
                                  )}
                                  {` — ${match[2]}`}
                                </>
                              ) : (
                                `→ ${row.value}`
                              )}
                            </span>
                          </span>
                        );
                      })}
                    </pre>
                  </Exhibit>
                )}

                {project.id === "plantpal" &&
                  (() => {
                    // Dormant until the owner drops real captures
                    // (public/exhibits/README.md) — an absent AVIF/WebP
                    // pair renders nothing, the same convention a pending
                    // certificate scan already uses, so the build always
                    // succeeds whether or not any shot exists yet.
                    const shots = exhibits.plantpal.shots.flatMap((s) => {
                      const assets = exhibitShotAssets(s.stem);
                      return assets ? [{ ...s, assets }] : [];
                    });
                    if (shots.length === 0) return null;
                    return (
                      <Exhibit caption={exhibits.plantpal.caption}>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          {shots.map((s) => (
                            <picture key={s.stem}>
                              <source
                                srcSet={withBase(s.assets.avif)}
                                type="image/avif"
                              />
                              <source
                                srcSet={withBase(s.assets.webp)}
                                type="image/webp"
                              />
                              <img
                                src={withBase(s.assets.webp)}
                                alt={s.alt}
                                className="block w-full border border-rule-soft"
                                loading="lazy"
                                decoding="async"
                              />
                            </picture>
                          ))}
                        </div>
                      </Exhibit>
                    );
                  })()}

                <Provenance
                  className="mt-8"
                  segments={withCredit(act.plate, [
                    ...project.evidence,
                    ...liveSegments(live),
                  ])}
                />

                <div className="print-hidden mt-8 flex flex-wrap gap-3">
                  <BracketLink
                    href={withBase(`/projects/${project.id}/`)}
                    weight="filled"
                    small
                  >
                    Read the case file
                  </BracketLink>
                  {project.repoUrl && (
                    <BracketLink href={project.repoUrl} small external>
                      Repository
                      <ArrowUpRight size={12} aria-hidden="true" />
                    </BracketLink>
                  )}
                </div>
              </div>
            </Act>
          );
        })}

        <Act
          id="research"
          label={acts.research.label}
          lamp={plates[acts.research.plate].lamp}
          className="flex items-center"
        >
          <Plate id={acts.research.plate} />

          <div className={`${SHELL} scrim relative z-10 py-24`}>
            <Statement id="research-title">{acts.research.statement}</Statement>

            <figure className="mt-10 grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <blockquote className="prose-field text-lg">
                {researchSpotlight.quote}
              </blockquote>
              <figcaption className="prose-field text-sm lg:pt-2">
                {researchSpotlight.context}
              </figcaption>
            </figure>

            <BenchmarkChart />

            <Provenance
              className="mt-8"
              segments={withCredit(acts.research.plate, [
                { label: benchmarkChart.source },
              ])}
            />

            <div className="print-hidden mt-8">
              <BracketLink href={researchSpotlight.repoUrl} external>
                View the study
                <ArrowUpRight size={12} aria-hidden="true" />
              </BracketLink>
            </div>
          </div>
        </Act>

        <Act
          id="ledger"
          label={acts.ledger.label}
          lamp={plates[acts.ledger.plate].lamp}
          className="!min-h-0"
          overflow="visible"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="sticky top-0 h-[100svh]">
              <Plate id={acts.ledger.plate} />
            </div>
          </div>

          <div className={`${SHELL} scrim scrim-wide relative z-10 py-24`}>
            <Statement id="ledger-title">{acts.ledger.statement}</Statement>

            <h3 className="label mt-16 border-b border-rule pb-2">Archive</h3>
            <ul>
              {moreProjects.map((project, i) => (
                <li
                  key={project.name}
                  className="grid gap-x-12 gap-y-4 border-b border-rule py-9 lg:grid-cols-[22rem_minmax(0,1fr)]"
                >
                  <div>
                    <h3 className="font-mono text-base leading-snug font-semibold tracking-tight">
                      {project.name}
                    </h3>
                    <Provenance
                      className="mt-3"
                      segments={[
                        ...project.evidence,
                        ...liveSegments(moreLive[i]),
                      ]}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="prose-field text-[0.9375rem]">
                      <Metric text={project.description} />
                    </p>
                    <ul
                      aria-label="Technologies"
                      className="mt-4 flex flex-wrap gap-2"
                    >
                      {project.tech.map((t) => (
                        <li
                          key={t}
                          className="label border border-rule px-2 py-1 normal-case"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}

              <li className="grid gap-x-12 gap-y-4 border-b border-rule py-9 lg:grid-cols-[22rem_minmax(0,1fr)]">
                <div>
                  <h3 className="font-mono text-base leading-snug font-semibold tracking-tight">
                    {archive.title}
                  </h3>
                  <Provenance className="mt-3" segments={[...archive.evidence]} />
                </div>
                <div>
                  <p className="prose-field text-[0.9375rem]">
                    {archive.description}
                  </p>
                  <div className="print-hidden mt-5">
                    <BracketLink href={archive.url} small external>
                      Browse all repositories
                      <ArrowUpRight size={12} aria-hidden="true" />
                    </BracketLink>
                  </div>
                </div>
              </li>
            </ul>

            <h3 className="label mt-16 border-b border-rule pb-2">Achievements</h3>
            <ul>
              {achievements.map((a) => (
                <li
                  key={a.title}
                  className="flex flex-col gap-3 border-b border-rule py-7 sm:flex-row sm:items-baseline sm:justify-between sm:gap-10"
                >
                  <div className="min-w-0">
                    <h3 className="font-mono text-base leading-snug font-semibold tracking-tight">
                      {a.title}
                    </h3>
                    <p className="prose-field mt-2 text-sm">{a.detail}</p>
                  </div>
                  <Provenance
                    className="shrink-0 sm:justify-end"
                    segments={[
                      { label: a.date },
                      ...(a.certificateUrl
                        ? [{ label: "certificate", href: withBase(a.certificateUrl) }]
                        : []),
                    ]}
                  />
                </li>
              ))}
            </ul>

            <h3 className="label mt-16 border-b border-rule pb-2">
              Certifications
            </h3>
            <ul>
              {certifications.map((c) => {
                const image = certificateImage(c.image);
                const thumb = image ? certificateThumb(image) : null;
                const scanAlt = c.event
                  ? `Scan of the "${c.title}" certificate, awarded to ${c.awardedTo} for ${c.reason} at ${c.event}`
                  : `Scan of the "${c.title}" certificate, awarded to ${c.awardedTo} for completing "${c.reason}", issued by ${c.organiser}`;
                return (
                  <li
                    key={`${c.title}-${c.reason}-${c.awardedTo}`}
                    className="grid gap-x-12 gap-y-4 border-b border-rule py-9 lg:grid-cols-[22rem_minmax(0,1fr)]"
                  >
                    <div>
                      <h3 className="font-mono text-base leading-snug font-semibold tracking-tight">
                        {c.title}
                      </h3>
                      <p className="prose-field mt-2 text-sm">
                        {c.awardedTo}
                        {c.registration ? ` — reg. ${c.registration}` : ""}
                      </p>
                      {image && (
                        <a
                          href={withBase(image)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-block border border-rule p-1"
                        >
                          {thumb ? (
                            <picture>
                              <source
                                srcSet={withBase(thumb.avif)}
                                type="image/avif"
                              />
                              <source
                                srcSet={withBase(thumb.webp)}
                                type="image/webp"
                              />
                              <img
                                src={withBase(thumb.webp)}
                                alt={scanAlt}
                                className="block h-28 w-auto"
                                loading="lazy"
                                decoding="async"
                              />
                            </picture>
                          ) : (
                            <img
                              src={withBase(image)}
                              alt={scanAlt}
                              className="block h-28 w-auto"
                              loading="lazy"
                              decoding="async"
                            />
                          )}
                        </a>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="prose-field text-[0.9375rem]">
                        {c.event ? (
                          <>
                            Awarded for securing {c.reason} at {c.event},
                            organized by {c.organiser}.
                          </>
                        ) : (
                          <>
                            Completed &ldquo;{c.reason}&rdquo;, issued by{" "}
                            {c.organiser}.
                          </>
                        )}
                        {c.partners && c.partners.length > 0 && (
                          <> Delivered in partnership with {c.partners.join(", ")}.</>
                        )}
                      </p>
                      <Provenance
                        className="mt-4"
                        segments={[
                          ...(c.date ? [{ label: c.date }] : []),
                          ...(c.verificationUrl
                            ? [{ label: "verify", href: c.verificationUrl }]
                            : []),
                          ...(c.signatories ?? []).map((s) => ({
                            label: `${s.name} — ${s.role}`,
                          })),
                        ]}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            <h3 className="label mt-16 border-b border-rule pb-2">Skills</h3>
            <dl className="mt-4">
              {skills.map(({ group, items }) => (
                <div
                  key={group}
                  className="grid gap-x-12 gap-y-3 border-b border-rule py-6 lg:grid-cols-[14rem_minmax(0,1fr)]"
                >
                  <dt className="label">{group}</dt>
                  <dd>
                    <ul className="flex flex-wrap gap-2">
                      {items.map((item) => (
                        <li
                          key={item}
                          className="label border border-rule px-2.5 py-1.5 normal-case"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>

            <h3 className="label mt-16 border-b border-rule pb-2">Education</h3>
            <ul>
              {education.map((e) => (
                <li
                  key={e.degree}
                  className="grid gap-x-10 gap-y-2 border-b border-rule py-7 sm:grid-cols-[minmax(0,1fr)_10rem_9rem] sm:items-baseline"
                >
                  <div>
                    <h3 className="font-mono text-base leading-snug font-semibold tracking-tight">
                      {e.degree}
                    </h3>
                    <p className="prose-field mt-1.5 text-sm">{e.institution}</p>
                  </div>
                  <p className="label">{e.period}</p>
                  <p className="font-mono text-lg leading-none tracking-tight tabular-nums sm:text-right">
                    {e.score}
                  </p>
                </li>
              ))}
            </ul>

            <Provenance
              className="mt-12"
              segments={withCredit(acts.ledger.plate, [...archive.evidence])}
            />
          </div>
        </Act>

        <Act
          id="contact"
          label={acts.contact.label}
          lamp={plates[acts.contact.plate].lamp}
          className="flex items-center"
        >
          <Plate id={acts.contact.plate} />
          <SineLattice
            width={1000}
            height={300}
            cycles={1.4}
            nodes={6}
            mode="constellation"
            className="pointer-events-none absolute inset-x-0 top-[14%] z-0 h-[40%] w-full opacity-70 print-drop"
          />

          <div className={`${SHELL} scrim relative z-10 py-24`}>
            <Statement id="contact-title">{acts.contact.statement}</Statement>

            <p className="prose-field mt-8 text-sm">
              Based in {hero.location}. {contact.body}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={`mailto:${links.email}`}
                className="font-mono text-sm underline decoration-rule underline-offset-4 transition-colors hover:decoration-signal"
              >
                {links.email}
              </a>
              <CopyEmailButton email={links.email} />
            </div>

            <div className="print-hidden mt-8 flex flex-wrap gap-3">
              <BracketLink href={withBase(links.resume)} weight="filled" small download>
                Download résumé
              </BracketLink>
              <BracketLink href={links.github.url} small external>
                <GithubIcon size={13} />
                GitHub
              </BracketLink>
              <BracketLink href={links.linkedin.url} small external>
                <LinkedinIcon size={13} />
                LinkedIn
              </BracketLink>
            </div>

            <Provenance
              className="mt-10"
              segments={withCredit(acts.contact.plate, [])}
            />

            <p className="mt-10 text-sm">{contact.closing}</p>
          </div>
        </Act>
      </main>

      <footer className="border-t border-rule">
        <div className={`${SHELL} py-10`}>
          <Provenance
            segments={[
              { label: `© ${generatedOn.slice(0, 4)} rakshit rameshbabu` },
              { label: "chennai, india" },
              { label: "next.js · static export" },
              { label: `record generated ${generatedOn}` },
              {
                label: "source",
                href: "https://github.com/rakshit-737/portfolio",
              },
              ...(siteLive
                ? liveSegments(siteLive).map((s) =>
                    s.label.startsWith("ci:")
                      ? { ...s, label: `site ${s.label}` }
                      : s,
                  )
                : []),
            ]}
          />
        </div>
      </footer>
    </>
  );
}
