import { ArrowUpRight } from "lucide-react";
import type { FeaturedProject } from "@/content";
import EvidenceStrip from "./EvidenceStrip";

export default function ProjectCard({ project }: { project: FeaturedProject }) {
  return (
    <article className="border border-hairline bg-surface">
      {/* Signature: provenance-style evidence strip as the card header */}
      <div className="border-b border-hairline px-5 py-3 sm:px-6">
        <EvidenceStrip segments={project.evidence} />
      </div>

      <div className="px-5 py-6 sm:px-6 sm:py-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="font-display text-xl font-bold tracking-tight text-ink">
            {project.name}
          </h3>
          <p className="font-mono text-xs text-muted">{project.timeframe}</p>
        </div>

        <p className="mt-3 max-w-3xl text-base text-ink">{project.oneLiner}</p>

        <ul className="mt-5 space-y-3">
          {project.bullets.map((bullet) => (
            <li
              key={bullet.slice(0, 40)}
              className="flex gap-3 text-sm leading-relaxed text-muted"
            >
              <span aria-hidden="true" className="select-none font-mono">
                —
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>

        {project.headlineNumbers && (
          <dl className="mt-6 grid grid-cols-1 divide-y divide-hairline border border-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {project.headlineNumbers.map((n) => (
              <div key={n.label} className="px-4 py-3">
                <dd className="font-mono text-lg font-semibold text-amber">
                  {n.value}
                </dd>
                <dt className="mt-0.5 font-mono text-xs text-muted">
                  {n.label}
                </dt>
              </div>
            ))}
          </dl>
        )}

        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Technologies">
          {project.tech.map((t) => (
            <li
              key={t}
              className="border border-hairline px-2 py-0.5 font-mono text-xs text-muted"
            >
              {t}
            </li>
          ))}
        </ul>

        <div className="mt-6">
          {project.repoUrl ? (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 border border-steel/40 px-3.5 py-2 font-mono text-xs text-steel transition-colors hover:border-steel hover:bg-steel/10"
            >
              View repository
              <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          ) : (
            <span
              aria-disabled="true"
              title="Repository link coming soon"
              className="inline-flex cursor-not-allowed items-center gap-1.5 border border-hairline px-3.5 py-2 font-mono text-xs text-muted opacity-70"
            >
              Repository — coming soon
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
