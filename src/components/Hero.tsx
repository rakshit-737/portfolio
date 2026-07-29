import { ArrowDown } from "lucide-react";
import { hero, links } from "@/content";
import { GithubIcon, LinkedinIcon } from "./icons";
import TypedLine from "./TypedLine";

export default function Hero() {
  return (
    <section id="top" aria-label="Introduction">
      <div className="mx-auto flex max-w-5xl flex-col justify-center px-6 pt-24 pb-20 sm:pt-32 sm:pb-28">
        <p
          className="reveal font-mono text-xs tracking-widest text-muted"
          style={{ "--reveal-delay": "0.05s" } as React.CSSProperties}
        >
          {hero.location}
        </p>

        <h1
          className="reveal mt-4 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-6xl"
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
            prefix="verified:"
            text="builds end-to-end · tested in CI · reproducible"
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
      </div>
    </section>
  );
}
