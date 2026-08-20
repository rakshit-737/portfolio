import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { BracketLink } from "@/components/Bracket";
import DiagramFlow from "@/components/DiagramFlow";
import Metric from "@/components/Metric";
import Plate from "@/components/Plate";
import Provenance from "@/components/Provenance";
import Rail, { type RailItem } from "@/components/Rail";
import SineLattice from "@/components/SineLattice";
import { acts, caseStudies, featuredProjects, site } from "@/content";
import { withBase } from "@/lib/base";
import { withCredit } from "@/lib/credit";
import { fetchRepoLive, liveSegments } from "@/lib/github";

export const dynamicParams = false;

const SHELL = "mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12";
const GRID = "grid gap-x-12 gap-y-6 lg:grid-cols-[13rem_minmax(0,1fr)]";

// The three case-file routes, in the order `featuredProjects` already
// declares them (warden, scheduler, plantpal) — the same order
// `generateStaticParams` below walks. Prev/next and "the other case
// files" both cycle through this one list rather than a second, literal
// ordering that could drift from it.
const caseOrder = featuredProjects
  .filter((p) => caseStudies[p.id])
  .map((p) => p.id);

/** "Warden — Software Supply-Chain Firewall" → "Warden" — the same
 *  trim CommandPalette.tsx already applies to a project name for a
 *  compact link label. */
const shortName = (name: string) => name.split("—")[0].trim();

export function generateStaticParams() {
  return caseOrder.map((id) => ({ id }));
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

/** A case-file section: title held in the left rail, record on the right. */
function CaseSection({
  slug,
  title,
  children,
}: {
  slug: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={slug}
      aria-labelledby={`${slug}-title`}
      className="border-t border-rule py-12 sm:py-16"
    >
      <div className={`${SHELL} ${GRID}`}>
        <h2
          id={`${slug}-title`}
          className="font-mono text-lg leading-none font-semibold tracking-[-0.03em] lg:sticky lg:top-24 lg:self-start"
        >
          {title}
        </h2>
        <div className="min-w-0">{children}</div>
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

  // Prev/next cycles Warden ↔ Scheduler ↔ PlantPal; "the other case
  // files" links whichever two aren't this page.
  const orderIndex = caseOrder.indexOf(project.id);
  const prevProject = featuredProjects.find(
    (p) => p.id === caseOrder[(orderIndex - 1 + caseOrder.length) % caseOrder.length],
  )!;
  const nextProject = featuredProjects.find(
    (p) => p.id === caseOrder[(orderIndex + 1) % caseOrder.length],
  )!;
  const otherProjects = featuredProjects.filter(
    (p) => caseOrder.includes(p.id) && p.id !== project.id,
  );

  // "act 03" — the numeral half of `acts[id].label` ("act 03 — warden"),
  // never retyped.
  const actNumeral = acts[project.id].label.split(" — ")[0];

  const caseRail: RailItem[] = [
    { value: project.timeframe, label: "timeframe" },
    ...(live?.stars
      ? [
          {
            value: String(live.stars),
            label: "stars",
            href: `${live.repoUrl}/stargazers`,
          },
        ]
      : []),
    ...(live?.sha
      ? [
          {
            value: live.sha,
            label: "head",
            href: `${live.repoUrl}/commit/${live.sha}`,
          },
        ]
      : []),
    ...(live?.commitDate
      ? [{ value: live.commitDate, label: "last commit" }]
      : []),
    ...(live?.ci
      ? [{ value: live.ci, label: "ci", href: `${live.repoUrl}/actions` }]
      : []),
  ];

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

      <header
        data-chrome
        className="sticky top-0 z-50 border-b border-rule bg-ground"
      >
        <nav
          aria-label="Case file"
          className={`${SHELL} flex h-14 items-center justify-between gap-6`}
        >
          <a
            href={withBase("/")}
            className="label -mx-2 flex items-center gap-2 px-2 py-1 transition-colors hover:bg-signal hover:text-ground"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            back to the index
          </a>
          <span className="font-mono text-sm font-semibold tracking-tight">
            Rakshit Rameshbabu
          </span>
        </nav>
      </header>

      <main>
        <nav aria-label="Breadcrumb" className={`${SHELL} pt-5`}>
          <a
            href={withBase(`/#${project.id}`)}
            className="label -mx-2 inline-flex items-center gap-2 px-2 py-1 transition-colors hover:bg-signal hover:text-ground"
          >
            <ArrowLeft size={11} aria-hidden="true" />
            the record · {actNumeral}
          </a>
        </nav>

        <div className="relative isolate h-[60svh] overflow-hidden">
          {/* No scroll mechanics here — this banner has no `[data-act]`
              ancestor, so Lamp.tsx's rAF loop never finds it and nothing
              ever scrubs its `--p`/`--lamp-x`/`--lamp-y`. It still masks:
              `data-lamp="on"` is set globally (Lamp.tsx mounts in
              layout.tsx, on every page), so `.plate-lit`'s CSS mask
              activates here too, just with every custom property at its
              unset default — a static pool centred at 50%/50% with
              `--lamp-r`'s literal fallback (26vmax), the spec's own "lamp
              static and centred" (§5.2). */}
          <Plate id={acts[project.id].plate} priority />
          <div className={`${SHELL} scrim absolute inset-x-0 bottom-0 z-10 pb-12`}>
            <p className="label">{project.timeframe}</p>
            <h1 className="statement mt-4">{project.name}</h1>
          </div>
        </div>

        <section aria-label="Case file header">
          <div
            className={`${SHELL} relative grid gap-x-10 gap-y-10 pt-14 pb-14 sm:pt-20 sm:pb-16 lg:grid-cols-[minmax(0,1fr)_13rem]`}
          >
            <div className="min-w-0">
              <Provenance
                segments={withCredit(acts[project.id].plate, [
                  ...project.evidence,
                  ...liveSegments(live),
                ])}
              />
              <div className="mt-7 min-w-0">
                <p className="prose-field">{project.oneLiner}</p>
              </div>

              {project.headlineNumbers && (
                <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-5 border-y border-rule py-5">
                  {project.headlineNumbers.map((n) => (
                    <div key={n.label}>
                      <dd className="font-mono text-2xl leading-none font-semibold tracking-tight tabular-nums sm:text-3xl">
                        {n.value}
                      </dd>
                      <dt className="label mt-2">{n.label}</dt>
                    </div>
                  ))}
                </dl>
              )}

              {project.repoUrl && (
                <div className="print-hidden mt-9">
                  <BracketLink href={project.repoUrl} external>
                    View repository
                    <ArrowUpRight size={12} aria-hidden="true" />
                  </BracketLink>
                </div>
              )}
            </div>

            {/* The case file's own measurements, on the flank the index
                hero already uses. Every row is real or it is absent. */}
            <Rail items={caseRail} align="right" className="hidden lg:block" />
          </div>

          {/* The curve gets its own band at the foot of the header. Laid out
              in flow rather than absolutely, it can cross neither the copy
              nor the rail — the two collisions an overlay produced here. */}
          <div className={`${SHELL} print-drop relative pb-10`}>
            <SineLattice
              width={1000}
              height={120}
              cycles={1.2}
              nodes={3}
              animate
              className="h-12 w-full sm:h-16"
            />
          </div>
        </section>

        <CaseSection slug="problem" title="Problem">
          <div className="prose-field">
            {study.problem.map((p) => (
              <p key={p.slice(0, 32)}>
                <Metric text={p} />
              </p>
            ))}
          </div>
        </CaseSection>

        <CaseSection slug="approach" title="Approach">
          <div className="prose-field">
            {study.approach.map((p) => (
              <p key={p.slice(0, 32)}>
                <Metric text={p} />
              </p>
            ))}
          </div>
          <figure className="mt-10">
            <DiagramFlow steps={study.diagram} title={study.diagramTitle} />
            <figcaption className="label mt-4 normal-case">
              {study.diagramTitle}
            </figcaption>
          </figure>
        </CaseSection>

        <CaseSection slug="decisions" title="Decisions">
          <dl className="space-y-9">
            {study.decisions.map((d) => (
              <div key={d.title}>
                <dt className="font-mono text-base leading-snug font-semibold tracking-tight">
                  {d.title}
                </dt>
                <dd className="prose-field mt-3 text-[0.9375rem]">
                  <Metric text={d.body} />
                </dd>
              </div>
            ))}
          </dl>
        </CaseSection>

        {/* The numbers — the case file's spine. */}
        <CaseSection slug="evidence" title="Evidence">
          <table className="w-full border-collapse">
            <caption className="sr-only">
              Verifiable numbers for {project.name}
            </caption>
            <tbody>
              {study.evidence.map((row) => (
                <tr key={row.label} className="border-b border-rule">
                  <th
                    scope="row"
                    className="label py-4 pr-6 text-left font-normal normal-case"
                  >
                    {row.label}
                  </th>
                  <td className="py-4 text-right font-mono text-base font-semibold tracking-tight tabular-nums sm:text-lg">
                    {row.href ? (
                      <a
                        href={row.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-rule underline-offset-4 hover:decoration-signal"
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

        <CaseSection slug="outcome" title="Outcome">
          <div className="prose-field">
            {study.outcome.map((p) => (
              <p key={p.slice(0, 32)}>
                <Metric text={p} />
              </p>
            ))}
          </div>

          <h3 className="label mt-12 border-b border-rule pb-2">
            Next
          </h3>
          <ul className="mt-5 space-y-3">
            {study.next.map((n) => (
              <li
                key={n}
                className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3"
              >
                <span
                  aria-hidden="true"
                  className="mt-2.5 block h-px w-3 bg-signal"
                />
                <p className="prose-field text-[0.9375rem]">{n}</p>
              </li>
            ))}
          </ul>
        </CaseSection>

        <section
          aria-labelledby="other-case-files-title"
          className="border-t border-rule py-12 sm:py-16"
        >
          <div className={SHELL}>
            <h2
              id="other-case-files-title"
              className="label border-b border-rule pb-3"
            >
              Next: the other case files
            </h2>
            <ul className="mt-6">
              {otherProjects.map((p) => (
                <li
                  key={p.id}
                  className="border-b border-rule-soft py-6 last:border-b-0"
                >
                  <a
                    href={withBase(`/projects/${p.id}/`)}
                    className="font-mono text-lg leading-none font-semibold tracking-tight underline decoration-rule underline-offset-4 transition-colors hover:decoration-signal"
                  >
                    {shortName(p.name)}
                  </a>
                  <p className="prose-field mt-2 text-[0.9375rem]">
                    {p.oneLiner}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-rule">
        <nav aria-label="Case file navigation" className="border-b border-rule-soft">
          <div
            className={`${SHELL} flex items-center justify-between gap-4 py-6`}
          >
            <a
              href={withBase(`/projects/${prevProject.id}/`)}
              className="label -mx-2 flex items-center gap-2 px-2 py-1 transition-colors hover:bg-signal hover:text-ground"
            >
              <ArrowLeft size={12} aria-hidden="true" />
              <span className="sr-only">Previous case file: </span>
              {shortName(prevProject.name)}
            </a>
            <a
              href={withBase(`/projects/${nextProject.id}/`)}
              className="label -mx-2 flex items-center gap-2 px-2 py-1 text-right transition-colors hover:bg-signal hover:text-ground"
            >
              <span className="sr-only">Next case file: </span>
              {shortName(nextProject.name)}
              <ArrowRight size={12} aria-hidden="true" />
            </a>
          </div>
        </nav>
        <div
          className={`${SHELL} flex flex-wrap items-center justify-between gap-4 py-10`}
        >
          <Provenance
            segments={[{ label: `case file: ${id}` }, { label: "part of the record" }]}
          />
          <a
            href={withBase("/")}
            className="label underline decoration-rule underline-offset-4 transition-colors hover:decoration-signal"
          >
            back to the index
          </a>
        </div>
      </footer>
    </>
  );
}
