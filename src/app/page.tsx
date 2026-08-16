import { ArrowUpRight } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/icons";
import BarField from "@/components/BarField";
import BenchmarkChart from "@/components/BenchmarkChart";
import BitMatrix from "@/components/BitMatrix";
import { BracketLink } from "@/components/Bracket";
import CommandPalette from "@/components/CommandPalette";
import CopyEmailButton from "@/components/CopyEmailButton";
import Metric from "@/components/Metric";
import Nav from "@/components/Nav";
import Provenance from "@/components/Provenance";
import Rail, { type RailItem } from "@/components/Rail";
import SectionHead from "@/components/SectionHead";
import SineLattice from "@/components/SineLattice";
import {
  about,
  achievements,
  archive,
  contact,
  education,
  featuredProjects,
  hero,
  heroStats,
  links,
  moreProjects,
  researchSpotlight,
  site,
  skills,
} from "@/content";
import { withBase } from "@/lib/base";
import { fetchRepoLive, liveSegments } from "@/lib/github";

const SHELL = "mx-auto w-full max-w-[100rem] px-5 sm:px-8 lg:px-12";

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
        className="label sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-100 focus:bg-signal focus:px-3 focus:py-2 focus:text-field"
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
        {/* ── The field ─────────────────────────────────────────────── */}
        <section
          aria-label="Introduction"
          className="relative overflow-hidden border-b border-rule"
        >
          {/* Ground: dense bar field, resolving left to right once on load,
              masked so the display type never fights it for contrast. */}
          <div
            aria-hidden="true"
            className="print-drop pointer-events-none absolute inset-0"
          >
            <BarField
              seed="hero-field"
              density={1.35}
              height={100}
              animate
              className="field-mask absolute inset-y-0 right-0 h-full w-full opacity-55 sm:opacity-85"
            />
            {/* The curve runs at every width. On narrow screens it takes
                the band above the name rather than crossing it. */}
            <SineLattice
              width={1000}
              height={200}
              cycles={1.4}
              nodes={4}
              animate
              className="absolute top-[8%] right-0 hidden h-[42%] w-[72%] opacity-90 sm:block"
            />
          </div>

          <div
            className={`${SHELL} relative grid gap-x-10 gap-y-12 pt-16 pb-16 sm:pt-24 sm:pb-20 lg:grid-cols-[10.5rem_minmax(0,1fr)_12rem] lg:pt-28 lg:pb-20`}
          >
            <Rail
              items={heroStats}
              className="signal-in order-2 lg:order-1 lg:pt-2"
            />

            <div className="order-1 min-w-0 lg:order-2">
              <h1
                className="signal-in font-mono leading-[0.88] font-semibold tracking-[-0.03em]"
                style={{ fontSize: "clamp(2.6rem, 9.2vw, 6rem)" }}
              >
                Rakshit
                <br />
                Rameshbabu
              </h1>

              <p
                className="signal-in mt-7 max-w-xl font-mono text-sm leading-relaxed tracking-tight sm:text-base"
                style={{ "--d": "0.08s" } as React.CSSProperties}
              >
                {hero.role}
              </p>

              <p
                className="signal-in label mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 normal-case"
                style={{ "--d": "0.14s" } as React.CSSProperties}
              >
                <span className="bg-signal px-1.5 py-0.5 text-field">
                  {hero.provenance.prefix}
                </span>
                {hero.provenance.text}
              </p>

              <div
                className="signal-in print-hidden mt-10 flex flex-wrap items-center gap-3"
                style={{ "--d": "0.2s" } as React.CSSProperties}
              >
                <BracketLink
                  href={withBase(links.resume)}
                  weight="filled"
                  download
                >
                  Download résumé
                </BracketLink>
                <BracketLink href={`mailto:${links.email}`}>
                  Email me
                </BracketLink>
                <BracketLink href={links.github.url} external>
                  <GithubIcon size={13} />
                  GitHub
                </BracketLink>
              </div>
            </div>

            <Rail
              items={buildRail}
              align="right"
              className="signal-in order-3 hidden lg:block lg:pt-2"
            />
          </div>

          {/* Narrow screens get the curve as its own band at the foot of the
              hero. Overlaid, it either crosses the name or clips against the
              section edge; in flow it does neither. */}
          <div className={`${SHELL} print-drop relative pb-10 sm:hidden`}>
            <SineLattice
              width={1000}
              height={120}
              cycles={1.3}
              nodes={3}
              animate
              className="h-12 w-full"
            />
          </div>
        </section>

        {/* ── About ─────────────────────────────────────────────────── */}
        <section id="about" aria-labelledby="about-title" className="py-16 sm:py-24">
          <div className={SHELL}>
            <SectionHead id="about" title="About" />
            <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="prose-field">
                {about.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)}>{p}</p>
                ))}
              </div>
              <div>
                <h3 className="label border-b border-rule pb-2">
                  Interests
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {about.interests.map((interest, i) => (
                    <li
                      key={interest}
                      className="flex items-baseline gap-3 font-mono text-sm"
                    >
                      <span
                        aria-hidden="true"
                        className="label shrink-0"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {interest}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Featured work ─────────────────────────────────────────── */}
        <section
          id="projects"
          aria-labelledby="projects-title"
          className="py-16 sm:py-24"
        >
          <div className={SHELL}>
            <SectionHead
              id="projects"
              title="Featured work"
              meta={`${featuredProjects.length} records`}
            />

            <div>
              {featuredProjects.map((project, i) => {
                const live = featuredLive[i];
                return (
                  <article
                    key={project.id}
                    className="grid gap-x-12 gap-y-8 border-b border-rule py-12 lg:grid-cols-[13rem_minmax(0,1fr)] sm:py-16"
                  >
                    {/* Signature block: the repo's head commit as bits. */}
                    <div className="flex flex-row items-start gap-6 lg:flex-col lg:gap-7">
                      <BitMatrix
                        source={live?.sha || project.id}
                        cols={8}
                        rows={6}
                        cell={8}
                        className="print-drop shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="label">{project.timeframe}</p>
                        <ul className="mt-3 space-y-1 font-mono text-[0.6875rem] leading-relaxed">
                          {project.tech.map((t) => (
                            <li key={t}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-mono text-xl leading-tight font-semibold tracking-[-0.03em] sm:text-2xl">
                        {project.name}
                      </h3>
                      <p className="prose-field mt-4">{project.oneLiner}</p>

                      {project.headlineNumbers && (
                        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-5 border-y border-rule py-5">
                          {project.headlineNumbers.map((n) => (
                            <div key={n.label}>
                              <dd className="font-mono text-2xl leading-none font-semibold tracking-tight tabular-nums sm:text-3xl">
                                {n.value}
                              </dd>
                              <dt className="label mt-2">
                                {n.label}
                              </dt>
                            </div>
                          ))}
                        </dl>
                      )}

                      <ul className="mt-8 space-y-4">
                        {project.bullets.map((b) => (
                          <li
                            key={b.slice(0, 40)}
                            className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3"
                          >
                            <span
                              aria-hidden="true"
                              className="mt-2 block h-px w-3 bg-signal"
                            />
                            <p className="prose-field text-[0.9375rem]">
                              <Metric text={b} />
                            </p>
                          </li>
                        ))}
                      </ul>

                      <Provenance
                        className="mt-8"
                        segments={[...project.evidence, ...liveSegments(live)]}
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
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Research: the negative result, inverted out of the page ── */}
        <section
          id="research"
          aria-labelledby="research-title"
          className="negative py-16 sm:py-24"
        >
          <div className={SHELL}>
            <SectionHead id="research" title="Research" />

            <figure className="mt-12 grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <blockquote
                className="font-mono leading-[1.18] font-medium tracking-[-0.035em]"
                style={{ fontSize: "clamp(1.35rem, 3.1vw, 2.35rem)" }}
              >
                {researchSpotlight.quote}
              </blockquote>
              <figcaption className="prose-field text-sm lg:pt-2">
                {researchSpotlight.context}
              </figcaption>
            </figure>

            <BenchmarkChart />

            <div className="print-hidden mt-10">
              <BracketLink href={researchSpotlight.repoUrl} external>
                View the study
                <ArrowUpRight size={12} aria-hidden="true" />
              </BracketLink>
            </div>
          </div>
        </section>

        {/* ── Archive ───────────────────────────────────────────────── */}
        <section
          id="more-projects"
          aria-labelledby="more-projects-title"
          className="py-16 sm:py-24"
        >
          <div className={SHELL}>
            <SectionHead
              id="more-projects"
              title="Archive"
              meta={`${moreProjects.length} records`}
            />

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
          </div>
        </section>

        {/* ── Achievements ──────────────────────────────────────────── */}
        <section
          id="achievements"
          aria-labelledby="achievements-title"
          className="py-16 sm:py-24"
        >
          <div className={SHELL}>
            <SectionHead id="achievements" title="Achievements" />
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
                        ? [{ label: "certificate", href: a.certificateUrl }]
                        : []),
                      ...(a.certificateUrl === null
                        ? [{ label: "certificate pending", disabled: true }]
                        : []),
                    ]}
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Skills ────────────────────────────────────────────────── */}
        <section id="skills" aria-labelledby="skills-title" className="py-16 sm:py-24">
          <div className={SHELL}>
            <SectionHead id="skills" title="Skills" />
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
          </div>
        </section>

        {/* ── Education ─────────────────────────────────────────────── */}
        <section
          id="education"
          aria-labelledby="education-title"
          className="py-16 sm:py-24"
        >
          <div className={SHELL}>
            <SectionHead id="education" title="Education" />
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
          </div>
        </section>

        {/* ── Contact: the close ────────────────────────────────────── */}
        <section
          id="contact"
          aria-labelledby="contact-title"
          className="negative relative overflow-hidden py-16 sm:py-24"
        >
          <BarField
            seed="contact-field"
            density={0.8}
            height={60}
            className="print-drop pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full opacity-35"
          />
          <div className={`${SHELL} relative`}>
            <SectionHead id="contact" title="Contact" />
            <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div>
                <p
                  className="font-mono leading-[1.15] font-semibold tracking-[-0.04em]"
                  style={{ fontSize: "clamp(1.7rem, 4.6vw, 3.25rem)" }}
                >
                  {contact.headline}
                </p>
                <p className="prose-field mt-6 text-sm">
                  Based in {hero.location}. {contact.body}
                </p>
              </div>

              <div className="lg:pt-2">
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={`mailto:${links.email}`}
                    className="font-mono text-sm underline decoration-rule underline-offset-4 transition-colors hover:decoration-signal"
                  >
                    {links.email}
                  </a>
                  <CopyEmailButton email={links.email} />
                </div>

                <div className="print-hidden mt-7 flex flex-wrap gap-3">
                  <BracketLink
                    href={withBase(links.resume)}
                    weight="filled"
                    small
                    download
                  >
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
              </div>
            </div>
          </div>
        </section>
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
