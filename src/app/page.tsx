import { ArrowUpRight, Award, Download, Mail } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/icons";
import CopyEmailButton from "@/components/CopyEmailButton";
import EvidenceStrip from "@/components/EvidenceStrip";
import Hero from "@/components/Hero";
import Nav from "@/components/Nav";
import ProjectCard from "@/components/ProjectCard";
import Section from "@/components/Section";
import {
  about,
  achievements,
  education,
  featuredProjects,
  hero,
  links,
  moreProjects,
  researchSpotlight,
  skills,
} from "@/content";
import { withBase } from "@/lib/base";

export default function Home() {
  return (
    <>
      <a
        href="#top"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-100 focus:bg-surface focus:px-3 focus:py-2 focus:font-mono focus:text-sm focus:text-ink"
      >
        Skip to content
      </a>
      <Nav />

      <main>
        <Hero />

        <Section id="about" eyebrow="about" title="About">
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

        <Section id="projects" eyebrow="projects" title="Featured Projects">
          <div className="space-y-8">
            {featuredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </Section>

        <Section id="research" eyebrow="research" title="Research Spotlight">
          <figure className="border-l-2 border-hairline pl-6 sm:pl-8">
            <blockquote className="max-w-3xl font-display text-xl font-medium leading-snug tracking-tight text-ink sm:text-2xl">
              &ldquo;{researchSpotlight.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-5 max-w-2xl text-sm leading-relaxed text-muted">
              {researchSpotlight.context}
            </figcaption>
          </figure>
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

        <Section id="more-projects" eyebrow="archive" title="More Projects">
          <div className="grid gap-6 md:grid-cols-2">
            {moreProjects.map((project) => (
              <article
                key={project.name}
                className="flex flex-col border border-hairline bg-surface"
              >
                <div className="border-b border-hairline px-5 py-2.5 sm:px-6">
                  <EvidenceStrip segments={project.evidence} />
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
                  {project.description}
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
              </article>
            ))}
          </div>
        </Section>

        <Section id="achievements" eyebrow="achievements" title="Achievements">
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
                <div className="flex items-center gap-4 pl-8 sm:pl-0">
                  <span className="font-mono text-xs text-muted">{a.date}</span>
                  {a.certificateUrl && (
                    <a
                      href={a.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-steel underline decoration-steel/40 underline-offset-4 hover:decoration-steel"
                    >
                      Certificate
                    </a>
                  )}
                  {a.certificateUrl === null && (
                    <span
                      title="Certificate link coming soon"
                      className="cursor-not-allowed font-mono text-xs italic text-muted"
                    >
                      certificate — coming soon
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="skills" eyebrow="skills" title="Skills">
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

        <Section id="education" eyebrow="education" title="Education">
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

        <Section id="contact" eyebrow="contact" title="Contact">
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

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={withBase("/resume.pdf")}
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
              { label: "© 2026 rakshit rameshbabu" },
              { label: "chennai, india" },
              { label: "built with next.js · statically exported" },
              { label: "source", href: links.github.url },
            ]}
          />
        </div>
      </footer>
    </>
  );
}
