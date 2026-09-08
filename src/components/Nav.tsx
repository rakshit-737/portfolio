"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Menu, Search, X } from "lucide-react";
import { acts, links, navSections, type ActId } from "@/content";
import { OPEN_PALETTE_EVENT } from "@/components/CommandPalette";
import LiveClock from "@/components/LiveClock";
import Mark from "@/components/Mark";
import Odometer from "@/components/Odometer";
import SoundToggle from "@/components/SoundToggle";
import { withBase } from "@/lib/base";
import { playUi } from "@/lib/sound";

// The eight acts, in their declared order — `acts` is a `Record<ActId,
// …>` object literal, so `Object.keys` walks it in that same insertion
// order (hero first, contact last), giving each act a stable 1..8 index
// with no second, literal ordering to drift from `content.ts`.
const ACT_IDS = Object.keys(acts) as ActId[];

/**
 * The field's top rail. The active section is marked by inversion — the
 * same device the rest of the surface uses — rather than by a colour or a
 * sliding underline, so nothing here needs measuring at runtime. That
 * stance survives the carried highlight below: the travel is a View
 * Transition, so the browser animates the group box between the old and
 * new link and this component still never reads a layout.
 */
export default function Nav() {
  const [active, setActive] = useState<string>("");
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // The scroll-spy's own mirror of `active` (the observer effect runs
  // once, so its closure would otherwise hold the initial ""), and
  // whether a view transition is still mid-flight — both read and
  // written only inside the observer callback below.
  const activeRef = useRef("");
  const inFlight = useRef(false);

  useEffect(() => {
    // "hero" is observed alongside the section ids so returning to the
    // top resets the spy: no nav link's id matches it, so every
    // `aria-current` clears and the act counter reads 01/08 again
    // instead of holding whatever section was left last. Same observer —
    // never a second one.
    const ids = ["hero", ...navSections.map((s) => s.id)];
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    // The travel's gates (CollectUI brief, item 3), created once and
    // read per event: the highlight only travels where the section
    // links exist (`min-[90rem]`, the rail's own breakpoint) and never
    // under reduced motion — startViewTransition is a WAAPI-like JS
    // path the CSS reduced-motion block cannot see, so the preference
    // is checked here before any snapshot is taken.
    const wide = window.matchMedia("(min-width: 90rem)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");

    const carry = (id: string) => {
      if (id === activeRef.current) return;
      activeRef.current = id;
      // Plain swap wherever the travel can't or shouldn't play: the
      // hero reset (no link carries the name, so there is nothing to
      // travel to), a transition already mid-flight (this fires from an
      // IntersectionObserver during scroll — one snapshot at a time,
      // never a thrash of them), reduced motion, a rail without links,
      // or a browser without the API — which keeps today's instant
      // swap, exactly as before.
      if (
        id === "hero" ||
        inFlight.current ||
        still.matches ||
        !wide.matches ||
        typeof document.startViewTransition !== "function"
      ) {
        setActive(id);
        return;
      }
      inFlight.current = true;
      const settle = () => {
        inFlight.current = false;
      };
      // flushSync so the DOM actually updates inside the callback —
      // the API snapshots before and after it runs. Focus is never
      // moved: a view transition animates pseudo-elements, not the
      // links, and `aria-current` (set in the same render) stays the
      // one source of truth for the state.
      document
        .startViewTransition(() => flushSync(() => setActive(id)))
        .finished.then(settle, settle);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            carry(entry.target.id);
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

  // `active` is "hero" or one of `navSections`' ids (all in `ACT_IDS`)
  // once the existing scroll-spy observer above has fired at least once,
  // or "" at rest before that — which is exactly the hero, act 01. No
  // second observer: this reads the same `active` state the section links
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
    <>
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
            {/* The seal plate (Mark.tsx, public/mark.png) and the link's
                two-part hover (globals.css, `.brand-plate` /
                `.brand-rule`): the bone frame around the plate fills on
                hover — the swap happens on a drawn element, since a
                photograph has no ground and mark of its own — and a 1px
                rule wipes in under the name. */}
            <span className="brand-plate shrink-0">
              <Mark size={22} />
            </span>
            <span className="brand-rule">Rakshit Rameshbabu</span>
          </a>
          {/* Current-act indicator — presentational only, driven by the
              scroll-spy state above (no second observer). Its accessible
              name comes from `aria-current` on the matching section link
              instead, so this stays aria-hidden rather than doubling that
              announcement. Shown at every width the rail can hold its
              ~53px (41px + gap), measured against the static build: at
              320px the sub-md rail overflows by 36px (fits from ~356px,
              so 24rem guards it), and from `md` the clock + soundscape +
              ctrl-K + Résumé cluster needs 818px of a 768px rail with it
              — only ~3px of slack without — so it sits out `md`–`lg` and
              returns at `lg`, where the wider rail holds everything
              (the brand.spec.ts width sweep gates the md–lg gap and
              the lg return; the 24rem leg is a static-build
              measurement, not test-gated). The
              reading renders through Odometer (CollectUI brief, item 4):
              when an act passes, only the changed digit turns over —
              the visibility bands above are untouched, and Odometer
              itself skips a hidden instance, so the md–lg gap never
              animates invisibly. */}
          <span
            aria-hidden="true"
            data-act-counter
            className="label hidden tabular-nums min-[24rem]:inline-block md:hidden lg:inline-block"
          >
            <Odometer
              text={`${String(actNumber).padStart(2, "0")}/${String(ACT_IDS.length).padStart(2, "0")}`}
            />
          </span>
          {/* Chennai time, live, from `md` up. Measured at 1600px: the rail
              needs 1110px without it and 1268px with it, so the section
              links (which alone overflowed a 1024px rail by 54px) now wait
              for `xl`; that leaves every width from 768px with room for
              this. Below `md` it lives in the menu instead. */}
          <LiveClock className="hidden md:inline-block" />
        </div>

        {/* `min-[90rem]` (1440px), raised from `xl`: at 1024px these seven
            links plus the two clusters beside them measured 1110px of a
            1024px rail — an overflow that predates the clock — the clock
            adds 158, and the soundscape toggle another 144. At 1280px the
            rail measured 1327px with all three, so the links now wait for
            1440, where everything fits with ~110px to spare (the
            brand.spec.ts width sweep gates this). */}
        <div className="hidden items-center gap-1 min-[90rem]:flex">
          {/* Only the active link carries `data-nav-active` — and with it
              `view-transition-name: nav-active` (globals.css) — so when
              the scroll-spy moves, the name moves between links and the
              browser carries the bg-signal block from the old box to the
              new. The mobile menu's links never take the attribute: the
              travel only ever starts at min-[90rem], and a duplicated
              name would skip the transition outright. */}
          {navSections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={jumpTo(s.id)}
              aria-current={active === s.id ? "location" : undefined}
              data-nav-active={active === s.id ? "" : undefined}
              className={`label px-2.5 py-1.5 transition-colors ${
                active === s.id
                  ? "bg-signal text-ground"
                  : "hover:bg-signal hover:text-ground active:bg-signal active:text-ground"
              }`}
            >
              {s.label}
            </a>
          ))}
        </div>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          {/* The soundscape's mute control (see SoundToggle.tsx) — same
              border treatment as the ctrl-K button beside it. */}
          <SoundToggle className="border border-rule px-2.5 py-2 hover:border-signal active:border-signal" />
          <button
            type="button"
            data-voice // the palette taps wood on open — no chime on top
            onClick={openPalette}
            aria-label="Search the field (Ctrl+K)"
            className="label flex items-center gap-2 border border-rule px-2.5 py-2 transition-colors hover:border-signal active:border-signal"
          >
            <Search size={12} aria-hidden="true" />
            <kbd className="font-mono text-[10px] tracking-normal">ctrl K</kbd>
          </button>
          <a
            href={withBase(links.resume)}
            download
            className="label border border-signal px-3 py-2 transition-colors hover:bg-signal hover:text-ground active:bg-signal active:text-ground"
          >
            Résumé
          </a>
        </div>

        {/* Shown until `min-[90rem]`, where the section links above take
              over — a `md:hidden` here once left every viewport between
              48rem and the links' breakpoint (a portrait tablet, a narrow
              laptop window) with no way to reach a section at all. Only
              the search icon drops at `md`, where the labelled ctrl-K
              button above takes over. */}
        <div className="flex items-center min-[90rem]:hidden">
          {/* 44px minimum tap target (WCAG 2.5.5) — the icon itself stays
              small (18px), so the extra hit area comes from `min-h-11
              min-w-11` centring, the same device `Bracket.tsx` and the
              certificate lightbox's close button already use, not from
              inflating the icon. */}
          <button
            type="button"
            data-voice // the palette taps wood on open — no chime on top
            onClick={openPalette}
            aria-label="Search the field"
            className="flex min-h-11 min-w-11 items-center justify-center md:hidden"
          >
            <Search size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            data-voice // taps wood itself — the global chime skips it
            ref={menuButtonRef}
            className="-mr-1.5 flex min-h-11 min-w-11 items-center justify-center"
            aria-expanded={open}
            aria-controls={open ? "mobile-menu" : undefined}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => {
              setOpen((v) => !v);
              playUi("tap"); // the panel — wood, on the explicit control only
            }}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <div
            id="mobile-menu"
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-rule bg-ground min-[90rem]:hidden"
          >
            <div className="mx-auto flex max-w-[110rem] flex-col px-5 py-3 sm:px-8">
              {/* The clock's home on a phone, where the rail beside the
                  name has no room for it; from `md` it sits on the rail. */}
              <LiveClock className="block border-b border-rule-soft px-2 py-4 md:hidden" />
              {/* The soundscape toggle's phone home, for the widths where
                  the rail cluster that carries it is hidden. */}
              <SoundToggle className="border-b border-rule-soft px-2 py-4 text-left md:hidden" />
              {/* Same local colour swap as the desktop section links —
                  hover and press alike, so a touch answers visually
                  before the chime, which is never the only confirmation. */}
              {navSections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  aria-current={active === s.id ? "location" : undefined}
                  className={`label border-b border-rule-soft px-2 py-4 transition-colors last:border-b-0 ${
                    active === s.id
                      ? "bg-signal text-ground"
                      : "hover:bg-signal hover:text-ground active:bg-signal active:text-ground"
                  }`}
                  onClick={(e) => {
                    jumpTo(s.id)(e);
                    setOpen(false);
                  }}
                >
                  {s.label}
                </a>
              ))}
              {/* The filled row keeps the filled Bracket's own hover
                  grammar: the fill drops inside a border-signal frame
                  (invisible at rest against the matching fill), on hover
                  and on press. */}
              <a
                href={withBase(links.resume)}
                download
                className="label mt-3 border border-signal bg-signal px-3 py-4 text-center text-ground transition-colors hover:bg-transparent hover:text-signal active:bg-transparent active:text-signal"
                onClick={() => setOpen(false)}
              >
                Download résumé
              </a>
            </div>
          </div>
        )}
      </nav>
      </header>

      {/* The act rail (CollectUI Phase 2, ref @lucashjin, @shariar_design,
          @kazdenc). Eight square hairline notches at the right edge, one
          per act, the current one filled. It reads the SAME scroll-spy
          state the rail above holds — `active`, from the one observer in
          this component — and adds no second observer and no
          scroll-driven animation. Fixed site chrome, like the header
          itself: the Not-Pinned Rule governs an act's own content column,
          not the chrome the page scrolls under (DESIGN.md says so
          explicitly now). It is a sibling of the header, not a second
          `nav` inside it. From `lg` up, where the section links are still
          in the menu and this is the only visible reading of position
          besides the counter. Each notch is a real 44px link — the square
          is drawn inside it — so the target-size audit and the keyboard
          path both hold; the act's name sits beside it, always in the
          accessibility tree, revealed on hover and focus. */}
      <nav
        aria-label="Acts"
        data-act-rail
        className="fixed top-1/2 right-1 z-40 hidden -translate-y-1/2 flex-col lg:flex"
      >
        {ACT_IDS.map((id) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={jumpTo(id)}
            aria-current={(active || "hero") === id ? "location" : undefined}
            className="act-notch"
          >
            <span className="act-notch-name label">{acts[id].label}</span>
          </a>
        ))}
      </nav>
    </>
  );
}
