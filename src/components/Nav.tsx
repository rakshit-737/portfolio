"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { acts, links, navSections, type ActId } from "@/content";
import { OPEN_PALETTE_EVENT } from "@/components/CommandPalette";
import LiveClock from "@/components/LiveClock";
import Mark from "@/components/Mark";
import { withBase } from "@/lib/base";

// The eight acts, in their declared order — `acts` is a `Record<ActId,
// …>` object literal, so `Object.keys` walks it in that same insertion
// order (hero first, contact last), giving each act a stable 1..8 index
// with no second, literal ordering to drift from `content.ts`.
const ACT_IDS = Object.keys(acts) as ActId[];

/**
 * The field's top rail. The active section is marked by inversion — the
 * same device the rest of the surface uses — rather than by a colour or a
 * sliding underline, so nothing here needs measuring at runtime.
 */
export default function Nav() {
  const [active, setActive] = useState<string>("");
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const ids = navSections.map((s) => s.id);
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
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

  // `active` is one of `navSections`' ids (a subset of `ACT_IDS`) once the
  // existing scroll-spy observer above has fired at least once, or "" at
  // rest before that — which is exactly the hero, act 01. No second
  // observer: this reads the same `active` state the section links
  // already use for `aria-current`.
  const actNumber = ACT_IDS.indexOf((active || "hero") as ActId) + 1;

  const openPalette = () => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));

  // scroll-behavior: smooth was dropped from <html> so it can't fight the
  // lamp's own scroll mapping — restored per-call here instead.
  const jumpTo = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <header
      ref={headerRef}
      data-chrome
      className="sticky top-0 z-50 border-b border-rule bg-ground"
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-[110rem] items-center justify-between gap-6 px-5 sm:px-8"
      >
        <div className="flex shrink-0 items-center gap-3">
          <a
            href="#top"
            className="group flex items-center gap-3 font-mono text-sm font-semibold tracking-tight"
          >
            {/* The seal monogram (src/lib/mark.ts). Hover inverts the mark
                alone — the control swapping its own ground and mark, the
                site's one hover device — while the name stays as it is. */}
            <Mark
              size={22}
              className="shrink-0 bg-ground text-signal transition-colors group-hover:bg-signal group-hover:text-ground"
            />
            Rakshit Rameshbabu
          </a>
          {/* Current-act indicator — presentational only, driven by the
              scroll-spy state above (no second observer). Its accessible
              name comes from `aria-current` on the matching section link
              instead, so this stays aria-hidden rather than doubling that
              announcement. */}
          <span
            aria-hidden="true"
            className="label hidden tabular-nums lg:inline-block"
          >
            {String(actNumber).padStart(2, "0")}/{String(ACT_IDS.length).padStart(2, "0")}
          </span>
          {/* Chennai time, live, from `md` up. Measured at 1600px: the rail
              needs 1110px without it and 1268px with it, so the section
              links (which alone overflowed a 1024px rail by 54px) now wait
              for `xl`; that leaves every width from 768px with room for
              this. Below `md` it lives in the menu instead. */}
          <LiveClock className="hidden md:inline-block" />
        </div>

        {/* `xl`, not `lg`: at 1024px these seven links plus the two
            clusters beside them measured 1110px of a 1024px rail — an
            overflow that predates the clock — and the clock adds 158.
            From 1280px everything fits with the clock in place. */}
        <div className="hidden items-center gap-1 xl:flex">
          {navSections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={jumpTo(s.id)}
              aria-current={active === s.id ? "location" : undefined}
              className={`label px-2.5 py-1.5 transition-colors ${
                active === s.id
                  ? "bg-signal text-ground"
                  : "hover:bg-signal hover:text-ground"
              }`}
            >
              {s.label}
            </a>
          ))}
        </div>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <button
            type="button"
            onClick={openPalette}
            aria-label="Search the field (Ctrl+K)"
            className="label flex items-center gap-2 border border-rule px-2.5 py-2 transition-colors hover:border-signal"
          >
            <Search size={12} aria-hidden="true" />
            <kbd className="font-mono text-[10px] tracking-normal">ctrl K</kbd>
          </button>
          <a
            href={withBase(links.resume)}
            download
            className="label border border-signal px-3 py-2 transition-colors hover:bg-signal hover:text-ground"
          >
            Résumé
          </a>
        </div>

        {/* Shown until `xl`, where the section links above take over — a
              `md:hidden` here once left every viewport between 48rem and the
              links' breakpoint (a portrait tablet, a narrow laptop window)
              with no way to reach a section at all. Only the search icon
              drops at `md`, where the labelled ctrl-K button above takes
              over. */}
        <div className="flex items-center xl:hidden">
          {/* 44px minimum tap target (WCAG 2.5.5) — the icon itself stays
              small (18px), so the extra hit area comes from `min-h-11
              min-w-11` centring, the same device `Bracket.tsx` and the
              certificate lightbox's close button already use, not from
              inflating the icon. */}
          <button
            type="button"
            onClick={openPalette}
            aria-label="Search the field"
            className="flex min-h-11 min-w-11 items-center justify-center md:hidden"
          >
            <Search size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            ref={menuButtonRef}
            className="-mr-1.5 flex min-h-11 min-w-11 items-center justify-center"
            aria-expanded={open}
            aria-controls={open ? "mobile-menu" : undefined}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <div
            id="mobile-menu"
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-rule bg-ground xl:hidden"
          >
            <div className="mx-auto flex max-w-[110rem] flex-col px-5 py-3 sm:px-8">
              {/* The clock's home on a phone, where the rail beside the
                  name has no room for it; from `md` it sits on the rail. */}
              <LiveClock className="block border-b border-rule-soft px-2 py-4 md:hidden" />
              {navSections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  aria-current={active === s.id ? "location" : undefined}
                  className={`label border-b border-rule-soft px-2 py-4 last:border-b-0 ${
                    active === s.id ? "bg-signal text-ground" : ""
                  }`}
                  onClick={(e) => {
                    jumpTo(s.id)(e);
                    setOpen(false);
                  }}
                >
                  {s.label}
                </a>
              ))}
              <a
                href={withBase(links.resume)}
                download
                className="label mt-3 bg-signal px-3 py-4 text-center text-ground"
                onClick={() => setOpen(false)}
              >
                Download résumé
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
