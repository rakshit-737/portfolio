"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Menu, X } from "lucide-react";
import { navSections } from "@/content";
import { withBase } from "@/lib/base";

export default function Nav() {
  const [active, setActive] = useState<string>("");
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Sections observed but not listed in the nav highlight a parent entry.
    const spyAlias: Record<string, string> = { "more-projects": "projects" };
    const ids = [...navSections.map((s) => s.id), ...Object.keys(spyAlias)];
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(spyAlias[entry.target.id] ?? entry.target.id);
          }
        }
      },
      // A narrow horizontal band ~1/3 down the viewport decides the
      // "current" section for the scroll-spy.
      { rootMargin: "-30% 0px -60% 0px" },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const linkClass = (id: string) =>
    `font-mono text-xs transition-colors hover:text-ink ${
      active === id ? "text-steel" : "text-muted"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-bg/90 backdrop-blur">
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6"
      >
        <a
          href="#top"
          className="font-display text-sm font-bold tracking-tight text-ink"
        >
          Rakshit Rameshbabu
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-5 md:flex">
          {navSections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={active === s.id ? "true" : undefined}
              className={linkClass(s.id)}
            >
              {s.label}
            </a>
          ))}
          <a
            href={withBase("/resume.pdf")}
            download
            className="flex items-center gap-1.5 border border-steel/40 px-3 py-1.5 font-mono text-xs text-steel transition-colors hover:border-steel hover:bg-steel/10"
          >
            <Download size={13} aria-hidden="true" />
            Résumé
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          ref={menuButtonRef}
          className="-m-2 p-2 text-ink md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile panel */}
      {open && (
        <div
          id="mobile-menu"
          // Overlay (not in flow) so opening the menu never shifts the page;
          // capped height keeps every item reachable on short viewports.
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-y border-hairline bg-bg md:hidden"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-1 px-6 py-4">
            {navSections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`py-2 ${linkClass(s.id)}`}
                onClick={() => setOpen(false)}
              >
                {s.label}
              </a>
            ))}
            <a
              href={withBase("/resume.pdf")}
              download
              className="mt-2 flex w-fit items-center gap-1.5 border border-steel/40 px-3 py-1.5 font-mono text-xs text-steel"
              onClick={() => setOpen(false)}
            >
              <Download size={13} aria-hidden="true" />
              Download résumé
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
