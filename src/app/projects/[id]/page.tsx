import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import DiagramFlow from "@/components/DiagramFlow";
import EvidenceStrip from "@/components/EvidenceStrip";
import Metric from "@/components/Metric";
import { caseStudies, featuredProjects, site } from "@/content";
import { fetchRepoLive, liveSegments } from "@/lib/github";

export const dynamicParams = false;

export function generateStaticParams() {
  return featuredProjects
    .filter((p) => caseStudies[p.id])
    .map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = featuredProjects.find((p) => p.id === id);
  if (!project) return {};
  const title = `${project.name} — case file`;
  const url = `${site.url}/projects/${id}/`;
  const image = `${site.url}/projects/${id}/og.png`;
  return {
    title,
    description: project.oneLiner,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: project.oneLiner,
      url,
      type: "article",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: project.oneLiner,
      images: [image],
    },
  };
}

function CaseSection({
  index,
  eyebrow,
  title,
  children,
}: {
  index: number;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  const id = `case-${eyebrow.replace(/[^a-z]+/gi, "-").toLowerCase()}`;
  return (
    <section aria-labelledby={`${id}-title`} className="border-t border-hairline">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-14">
        <p className="font-mono text-xs lowercase tracking-widest text-muted">
          <span className="text-ink/70">{String(index).padStart(2, "0")}</span>
          {" / "}
          {eyebrow}
        </p>
        <h2
          id={`${id}-title`}
          className="mt-2 font-display text-xl font-bold tracking-tight text-ink sm:text-2xl"
        >
          {title}
        </h2>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = featuredProjects.find((p) => p.id === id);
  const study = caseStudies[id];
  if (!project || !study) notFound();

  const live = project.repoUrl ? await fetchRepoLive(project.repoUrl) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: project.name,
    description: project.oneLiner,
    url: `${site.url}/projects/${id}/`,
    ...(project.repoUrl ? { codeRepository: project.repoUrl } : {}),
    programmingLanguage: project.tech,
    author: { "@type": "Person", name: "Rakshit Rameshbabu", url: site.url },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="sticky top-0 z-50 border-b border-hairline bg-bg/90 backdrop-blur">
        <nav
          aria-label="Case file"
          className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6"
        >
          <Link
            href="/"
            className="flex items-center gap-2 font-mono text-xs text-muted transition-colors hover:text-steel"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            back to the index
          </Link>
          <span className="font-display text-sm font-bold tracking-tight text-ink">
            Rakshit Rameshbabu
          </span>
        </nav>
      </header>

      <main>
        <div className="mx-auto max-w-3xl px-6 pt-12 pb-4 sm:pt-16">
          <EvidenceStrip
            segments={[...project.evidence, ...liveSegments(live)]}
          />
          <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {project.name}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
            {project.oneLiner}
          </p>
          {project.repoUrl && (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 border border-steel/40 px-3.5 py-2 font-mono text-xs text-steel transition-colors hover:border-steel hover:bg-steel/10"
            >
              View repository
              <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          )}
          <div className="pb-8" />
        </div>

        <CaseSection index={1} eyebrow="problem" title="Problem">
          <div className="space-y-4 text-base leading-relaxed text-muted">
            {study.problem.map((p) => (
              <p key={p.slice(0, 32)}>
                <Metric text={p} />
              </p>
            ))}
          </div>
        </CaseSection>

        <CaseSection
          index={2}
          eyebrow="approach"
          title="Approach & architecture"
        >
          <div className="space-y-4 text-base leading-relaxed text-muted">
            {study.approach.map((p) => (
              <p key={p.slice(0, 32)}>
                <Metric text={p} />
              </p>
            ))}
          </div>
          <figure className="mt-8 border border-hairline bg-surface px-4 py-5 sm:px-5">
            <DiagramFlow steps={study.diagram} title={study.diagramTitle} />
            <figcaption className="mt-3 font-mono text-[11px] text-muted">
              {study.diagramTitle}
            </figcaption>
          </figure>
        </CaseSection>

        <CaseSection
          index={3}
          eyebrow="decisions"
          title="Key decisions & hard parts"
        >
          <dl className="space-y-6">
            {study.decisions.map((d) => (
              <div
                key={d.title}
                className="border-l-2 border-hairline pl-5 sm:pl-6"
              >
                <dt className="font-display text-base font-bold tracking-tight text-ink">
                  {d.title}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted">
                  <Metric text={d.body} />
                </dd>
              </div>
            ))}
          </dl>
        </CaseSection>

        <CaseSection index={4} eyebrow="evidence" title="Evidence">
          <table className="w-full border-collapse">
            <caption className="sr-only">
              Verifiable numbers for {project.name}
            </caption>
            <tbody>
              {study.evidence.map((row) => (
                <tr key={row.label} className="border-b border-hairline">
                  <th
                    scope="row"
                    className="py-2.5 pr-4 text-left font-mono text-xs font-normal text-muted"
                  >
                    {row.label}
                  </th>
                  <td className="py-2.5 text-right font-mono text-sm font-semibold text-amber">
                    {row.href ? (
                      <a
                        href={row.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-amber/40 underline-offset-4 hover:decoration-amber"
                      >
                        {row.value}
                      </a>
                    ) : (
                      row.value
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CaseSection>

        <CaseSection index={5} eyebrow="outcome" title="Outcome & next steps">
          <div className="space-y-4 text-base leading-relaxed text-muted">
            {study.outcome.map((p) => (
              <p key={p.slice(0, 32)}>
                <Metric text={p} />
              </p>
            ))}
          </div>
          <ul className="mt-6 space-y-2">
            {study.next.map((n) => (
              <li
                key={n}
                className="flex items-baseline gap-3 text-sm leading-relaxed text-muted"
              >
                <span aria-hidden="true" className="select-none font-mono">
                  —
                </span>
                {n}
              </li>
            ))}
          </ul>
        </CaseSection>
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <EvidenceStrip
              segments={[
                { label: `case file: ${id}` },
                { label: "part of the record" },
              ]}
            />
            <Link
              href="/"
              className="font-mono text-xs text-steel underline decoration-steel/40 underline-offset-4 transition-colors hover:decoration-steel"
            >
              back to the index
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
