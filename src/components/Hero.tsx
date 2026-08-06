import { ArrowDown, Download } from "lucide-react";
import { hero, heroStats, links } from "@/content";
import { withBase } from "@/lib/base";
import { GithubIcon, LinkedinIcon } from "./icons";
import TypedLine from "./TypedLine";

export default function Hero() {
  return (
    <section id="top" aria-label="Introduction" className="ruled-paper">
      <div className="mx-auto flex max-w-5xl flex-col justify-center px-6 pt-20 pb-16 sm:pt-32 sm:pb-24">
        <p
          className="reveal font-mono text-xs tracking-widest text-muted"
          style={{ "--reveal-delay": "0.05s" } as React.CSSProperties}
        >
          {hero.location}
        </p>

        <h1
          className="reveal mt-4 font-display text-5xl font-extrabold tracking-tight text-ink sm:text-7xl"
          style={{ "--reveal-delay": "0.15s" } as React.CSSProperties}
        >
          {hero.name}
        </h1>

        <p
          className="reveal mt-4 max-w-2xl text-lg text-muted"
          style={{ "--reveal-delay": "0.3s" } as React.CSSProperties}
        >
          {hero.role}
        </p>

        <div
          className="reveal mt-6"
          style={{ "--reveal-delay": "0.45s" } as React.CSSProperties}
        >
          <TypedLine
            prefix={hero.provenance.prefix}
            text={hero.provenance.text}
          />
        </div>

        <div
          className="reveal mt-10 flex flex-wrap items-center gap-3"
          style={{ "--reveal-delay": "0.6s" } as React.CSSProperties}
        >
          <a
            href="#projects"
            className="flex items-center gap-2 bg-steel px-4 py-2 font-mono text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            View projects
            <ArrowDown size={15} aria-hidden="true" />
          </a>
          <a
            href={withBase(links.resume)}
            download
            className="flex items-center gap-2 border border-steel/40 px-4 py-2 font-mono text-sm text-steel transition-colors hover:border-steel hover:bg-steel/10"
          >
            <Download size={15} aria-hidden="true" />
            Résumé
          </a>
          <a
            href={links.github.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 border border-hairline px-4 py-2 font-mono text-sm text-ink transition-colors hover:border-steel/60 hover:text-steel"
          >
            <GithubIcon size={15} />
            GitHub
          </a>
          <a
            href={links.linkedin.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 border border-hairline px-4 py-2 font-mono text-sm text-ink transition-colors hover:border-steel/60 hover:text-steel"
          >
            <LinkedinIcon size={15} />
            LinkedIn
          </a>
        </div>

        {/* Proof above the fold: real numbers sourced from content.ts. */}
        <dl
          className="reveal mt-12 flex flex-wrap gap-x-10 gap-y-4 border-t border-hairline pt-6"
          style={{ "--reveal-delay": "0.75s" } as React.CSSProperties}
        >
          {heroStats.map((s) => (
            // flex-col-reverse keeps the value visually above its label
            // while the DOM stays valid (dt before dd).
            <div key={s.label} className="flex flex-col-reverse">
              <dt className="mt-1 font-mono text-xs text-muted">{s.label}</dt>
              <dd className="font-mono text-xl font-semibold text-amber">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
