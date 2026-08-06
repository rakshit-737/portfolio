import { ArrowUpRight, Award, Download, Mail } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/icons";
import BenchmarkChart from "@/components/BenchmarkChart";
import CommandPalette from "@/components/CommandPalette";
import CopyEmailButton from "@/components/CopyEmailButton";
import EvidenceStrip from "@/components/EvidenceStrip";
import GlowCard from "@/components/GlowCard";
import Hero from "@/components/Hero";
import Metric from "@/components/Metric";
import MockShell from "@/components/MockShell";
import Nav from "@/components/Nav";
import ProjectCard from "@/components/ProjectCard";
import Reveal from "@/components/Reveal";
import Section from "@/components/Section";
import {
  about,
  achievements,
  archive,
  education,
  featuredProjects,
  hero,
  links,
  moreProjects,
  researchSpotlight,
  site,
  skills,
} from "@/content";
import { withBase } from "@/lib/base";
import { fetchRepoLive, liveSegments } from "@/lib/github";

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
  // Baked in at build time — the static export is the "record".
  const generatedOn = new Date().toISOString().slice(0, 10);

  // Live provenance fetched at build time; null (offline, rate-limited)
  // simply renders the static strips unchanged. The portfolio repo itself
  // is fetched too — the record carries its own verification.
  const [featuredLive, moreLive, siteLive] = await Promise.all([
    Promise.all(
      featuredProjects.map((p) => (p.repoUrl ? fetchRepoLive(p.repoUrl) : null)),
    ),
    Promise.all(
      moreProjects.map((p) => (p.repoUrl ? fetchRepoLive(p.repoUrl) : null)),
    ),
    fetchRepoLive("https://github.com/rakshit-737/portfolio"),
  ]);

  return (
    <>
      <a
        href="#top"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-100 focus:bg-surface focus:px-3 focus:py-2 focus:font-mono focus:text-sm focus:text-ink"
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
      <MockShell />

      <main>
        <Hero />

        <Section id="about" index={1} eyebrow="about" title="About">
          <div className="grid gap-10 md:grid-cols-[2fr_1fr]">
            <div className="space-y-4 text-base leading-relaxed text-muted">
              {about.paragraphs.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </div>
            <div>
              <h3 className="font-mono text-xs lowercase tracking-widest text-muted">
                interests
              </h3>
              <ul className="mt-3 space-y-2">
                {about.interests.map((interest) => (
                  <li
                    key={interest}
                    className="flex items-baseline gap-3 text-sm text-ink"
                  >
                    <span
                      aria-hidden="true"
                      className="select-none font-mono text-muted"
                    >
                      —
                    </span>
                    {interest}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <Section
          id="projects"
          index={2}
          eyebrow="projects"
          title="Featured Projects"
          revealChildren={false}
        >
          <div className="space-y-8">
            {featuredProjects.map((project, i) => (
              <Reveal key={project.id} delayMs={i * 80}>
                <ProjectCard
                  project={project}
                  liveEvidence={liveSegments(featuredLive[i])}
                />
              </Reveal>
            ))}
          </div>
        </Section>

        <Section
          id="research"
          index={3}
          eyebrow={researchSpotlight.eyebrow}
          title="Research Spotlight"
        >
          <figure className="border-l-2 border-hairline pl-6 sm:pl-8">
            <blockquote className="max-w-3xl font-display text-xl font-medium leading-snug tracking-tight text-ink sm:text-2xl">
              &ldquo;{researchSpotlight.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-5 max-w-2xl text-sm leading-relaxed text-muted">
              {researchSpotlight.context}
            </figcaption>
          </figure>
          <BenchmarkChart />
          <a
            href={researchSpotlight.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-1.5 border border-steel/40 px-3.5 py-2 font-mono text-xs text-steel transition-colors hover:border-steel hover:bg-steel/10"
          >
            View the study
            <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </Section>

        <Section
          id="more-projects"
          index={4}
          eyebrow="archive"
          title="More Projects"
          revealChildren={false}
        >
          <div className="grid gap-6 md:grid-cols-2">
            {moreProjects.map((project, i) => (
              <Reveal key={project.name} delayMs={i * 80} className="flex">
              <GlowCard className="flex w-full flex-col border border-hairline bg-surface">
                <div className="border-b border-hairline px-5 py-2.5 sm:px-6">
                  <EvidenceStrip
                    segments={[
                      ...project.evidence,
                      ...liveSegments(moreLive[i]),
                    ]}
                  />
                </div>
                <div className="flex grow flex-col px-5 py-5 sm:px-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="font-display text-base font-bold tracking-tight text-ink">
                    {project.name}
                  </h3>
                  <p className="font-mono text-xs text-muted">
                    {project.timeframe}
                  </p>
                </div>
                <p className="mt-3 grow text-sm leading-relaxed text-muted">
                  <Metric text={project.description} />
                </p>
                <ul
                  className="mt-4 flex flex-wrap gap-2"
                  aria-label="Technologies"
                >
                  {project.tech.map((t) => (
                    <li
                      key={t}
                      className="border border-hairline px-2 py-0.5 font-mono text-xs text-muted"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
                </div>
              </GlowCard>
              </Reveal>
            ))}
            {/* Balance the 2×2 grid; points at the full GitHub archive. */}
            <Reveal delayMs={moreProjects.length * 80} className="flex">
              <GlowCard className="flex w-full flex-col border border-hairline bg-surface">
                <div className="border-b border-hairline px-5 py-2.5 sm:px-6">
                  <EvidenceStrip segments={[...archive.evidence]} />
                </div>
                <div className="flex grow flex-col px-5 py-5 sm:px-6">
                  <h3 className="font-display text-base font-bold tracking-tight text-ink">
                    {archive.title}
                  </h3>
                  <p className="mt-3 grow text-sm leading-relaxed text-muted">
                    {archive.description}
                  </p>
                  <a
                    href={archive.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex w-fit items-center gap-1.5 border border-steel/40 px-3.5 py-2 font-mono text-xs text-steel transition-colors hover:border-steel hover:bg-steel/10"
                  >
                    Browse all repositories
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </a>
                </div>
              </GlowCard>
            </Reveal>
          </div>
        </Section>

        <Section
          id="achievements"
          index={5}
          eyebrow="achievements"
          title="Achievements"
        >
          <ul className="space-y-4">
            {achievements.map((a) => (
              <li
                key={a.title}
                className="flex flex-col gap-2 border border-hairline bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="flex items-start gap-3">
                  <Award
                    size={18}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-amber"
                  />
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      {a.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-muted">{a.detail}</p>
                  </div>
                </div>
                <div className="pl-8 sm:pl-0">
                  <EvidenceStrip
                    segments={[
                      { label: a.date },
                      ...(a.certificateUrl
                        ? [{ label: "certificate", href: a.certificateUrl }]
                        : []),
                      ...(a.certificateUrl === null
                        ? [{ label: "certificate — coming soon", disabled: true }]
                        : []),
                    ]}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="skills" index={6} eyebrow="skills" title="Skills">
          <dl className="space-y-6">
            {skills.map(({ group, items }) => (
              <div
                key={group}
                className="grid gap-2 border-b border-hairline pb-6 last:border-b-0 last:pb-0 md:grid-cols-[220px_1fr] md:gap-6"
              >
                <dt className="font-mono text-xs lowercase tracking-widest text-muted">
                  {group}
                </dt>
                <dd>
                  <ul className="flex flex-wrap gap-2">
                    {items.map((item) => (
                      <li
                        key={item}
                        className="border border-hairline px-2.5 py-1 font-mono text-xs text-ink"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section
          id="education"
          index={7}
          eyebrow="education"
          title="Education"
        >
          <ul className="divide-y divide-hairline border-y border-hairline">
            {education.map((e) => (
              <li
                key={e.degree}
                className="grid gap-1 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-baseline sm:gap-6"
              >
                <div>
                  <h3 className="text-sm font-semibold text-ink">{e.degree}</h3>
                  <p className="mt-0.5 text-sm text-muted">{e.institution}</p>
                </div>
                <p className="font-mono text-xs text-muted">{e.period}</p>
                <p className="font-mono text-xs text-ink sm:text-right">
                  {e.score}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="contact" index={8} eyebrow="contact" title="Contact">
          <p className="max-w-2xl text-base leading-relaxed text-muted">
            Based in {hero.location}. The fastest way to reach me is email —
            copy it below, or find me on GitHub and LinkedIn.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 border border-hairline bg-surface px-3.5 py-2 font-mono text-sm text-ink">
              <Mail size={14} aria-hidden="true" className="text-muted" />
              {links.email}
            </span>
            <CopyEmailButton email={links.email} />
          </div>

          <div className="print-hidden mt-8 flex flex-wrap items-center gap-3">
            <a
              href={withBase(links.resume)}
              download
              className="inline-flex items-center gap-2 bg-steel px-4 py-2 font-mono text-sm font-medium text-bg transition-opacity hover:opacity-90"
            >
              <Download size={15} aria-hidden="true" />
              Download résumé
            </a>
            <a
              href={links.github.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-hairline px-4 py-2 font-mono text-sm text-ink transition-colors hover:border-steel/60 hover:text-steel"
            >
              <GithubIcon size={15} />
              GitHub
            </a>
            <a
              href={links.linkedin.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-hairline px-4 py-2 font-mono text-sm text-ink transition-colors hover:border-steel/60 hover:text-steel"
            >
              <LinkedinIcon size={15} />
              LinkedIn
            </a>
          </div>
        </Section>
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <EvidenceStrip
            segments={[
              { label: `© ${generatedOn.slice(0, 4)} rakshit rameshbabu` },
              { label: "chennai, india" },
              { label: "built with next.js · statically exported" },
              { label: `record generated: ${generatedOn}` },
              { label: "source", href: "https://github.com/rakshit-737/portfolio" },
              { label: "~ opens the shell" },
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
