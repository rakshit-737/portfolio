"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Menu, Search, X } from "lucide-react";
import { links, navSections } from "@/content";
import { OPEN_PALETTE_EVENT } from "@/components/CommandPalette";
import { withBase } from "@/lib/base";

export default function Nav() {
  const [active, setActive] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [bar, setBar] = useState({ left: 0, width: 0 });
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

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

  // Sliding active indicator: track the active link's box. Re-measure
  // after webfonts swap in — glyph widths change under display:swap.
  useEffect(() => {
    const update = () => {
      const el = active ? linkRefs.current[active] : null;
      if (!el) {
        setBar((b) => ({ ...b, width: 0 }));
        return;
      }
      setBar({ left: el.offsetLeft, width: el.offsetWidth });
    };
    update();
    document.fonts?.ready.then(update);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [active]);

  // Open menu: Escape closes (focus returns to the button); a tap or
  // focus landing outside the header also closes it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const closeIfOutside = (target: EventTarget | null) => {
      if (
        target instanceof Node &&
        headerRef.current &&
        !headerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onPointerDown = (e: PointerEvent) => closeIfOutside(e.target);
    const onFocusIn = (e: FocusEvent) => closeIfOutside(e.target);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("focusin", onFocusIn);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("focusin", onFocusIn);
    };
  }, [open]);

  const linkClass = (id: string) =>
    `font-mono text-xs transition-colors hover:text-ink ${
      active === id ? "text-steel" : "text-muted"
    }`;

  const openPalette = () => {
    window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b border-hairline bg-bg/90 backdrop-blur"
    >
      <nav
        aria-label="Main"
        className="relative mx-auto flex h-14 max-w-5xl items-center justify-between px-6"
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
              ref={(el) => {
                linkRefs.current[s.id] = el;
              }}
              href={`#${s.id}`}
              aria-current={active === s.id ? "location" : undefined}
              className={linkClass(s.id)}
            >
              {s.label}
            </a>
          ))}
          {/* Sliding indicator: sits on the header's bottom border, glides
              to the scroll-spy's active link. Positioned against the nav. */}
          <span
            aria-hidden="true"
            className="absolute bottom-0 hidden h-px bg-steel transition-all duration-300 md:block"
            style={{
              left: bar.left,
              width: bar.width,
              opacity: bar.width ? 1 : 0,
            }}
          />
          <button
            type="button"
            onClick={openPalette}
            aria-label="Open evidence index (Ctrl+K)"
            className="flex items-center gap-1.5 border border-hairline px-2.5 py-1.5 font-mono text-xs text-muted transition-colors hover:border-steel/60 hover:text-steel"
          >
            <Search size={12} aria-hidden="true" />
            <kbd className="text-[10px]">ctrl K</kbd>
          </button>
          <a
            href={withBase(links.resume)}
            download
            className="flex items-center gap-1.5 border border-steel/40 px-3 py-1.5 font-mono text-xs text-steel transition-colors hover:border-steel hover:bg-steel/10"
          >
            <Download size={13} aria-hidden="true" />
            Résumé
          </a>
        </div>

        {/* Mobile: evidence index + menu buttons */}
        <div className="flex items-center gap-1 md:hidden">
          <button
            type="button"
            onClick={openPalette}
            aria-label="Open evidence index"
            className="p-2 text-muted transition-colors hover:text-steel"
          >
            <Search size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            ref={menuButtonRef}
            className="-mr-2 p-2 text-ink"
            aria-expanded={open}
            aria-controls={open ? "mobile-menu" : undefined}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile panel — inside the nav landmark. */}
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
                  aria-current={active === s.id ? "location" : undefined}
                  className={`border-l-2 py-2 pl-3 ${
                    active === s.id ? "border-steel" : "border-transparent"
                  } ${linkClass(s.id)}`}
                  onClick={() => setOpen(false)}
                >
                  {s.label}
                </a>
              ))}
              <a
                href={withBase(links.resume)}
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
      </nav>
    </header>
  );
}
