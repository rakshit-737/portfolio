"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  CornerDownLeft,
  Search,
} from "lucide-react";
import {
  experience,
  navSections,
  terminalEntry,
} from "@/content";
import { withBase } from "@/lib/base";
import { jumpToSection } from "@/lib/jump";
import {
  fxSnapshot,
  isDeep,
  isOpenLight,
  isReducedByUser,
  setDeep,
  setOpenLight,
  setReducedEffects,
  subscribeFx,
} from "@/lib/fx";
import { playUi } from "@/lib/sound";
import { OPEN_TERMINAL_EVENT, isTerminalChord } from "@/lib/terminalKeys";

/** Nav (or anything else) can open the palette by dispatching this event. */
export const OPEN_PALETTE_EVENT = "evidence-index:open";

interface Command {
  id: string;
  group:
    | "instrument"
    | "sections";
  /** A secret: never listed, only matched when typed exactly. */
  secret?: string;
  label: string;
  hint?: string;
  /** Metadata read straight off `content.ts` — act number, stack — shown
   *  as `.label` chips beside the hint (CollectUI Phase 2, ref
   *  @ilyamiskov). Decoration: the container is aria-hidden, so the
   *  announced option stays the label and its hint. */
  chips?: string[];
  keywords?: string;
  /** The command has a sound of its own (the terminal taps wood on open),
   *  so the palette closes without its tap: one press, one sound. */
  silent?: boolean;
  run: () => void;
}

/**
 * Subsequence fuzzy match: every query character must appear in order.
 * Lower score = better (word-start and consecutive hits score tighter).
 */
function fuzzyScore(query: string, target: string): number | null {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let score = 0;
  let ti = 0;
  let lastHit = -1;
  for (const ch of q) {
    if (ch === " ") continue;
    const found = t.indexOf(ch, ti);
    if (found === -1) return null;
    // Gap penalty; word starts and runs are cheap.
    const atWordStart = found === 0 || t[found - 1] === " ";
    score += found - (lastHit + 1) + (atWordStart ? 0 : 1);
    lastHit = found;
    ti = found + 1;
  }
  return score;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // The list's one glide marker (CollectUI brief, item 6) — an extra
  // beat riding the selection state below; never selection logic of its
  // own.
  const markerRef = useRef<HTMLSpanElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  // Keyboard selection scrolls the listbox (the scrollIntoView effect
  // below), and that scroll replays a mouse event on whichever row
  // lands under a stationary cursor — which stole the selection
  // straight back. A row selects on mousemove only when the
  // coordinates here actually change: genuine pointer travel, never a
  // scroll-made replay.
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  // Whether the current mouse press began on the scrim itself — see the
  // overlay's onMouseDown/onClick pair below.
  const scrimPressRef = useRef(false);
  // The instrument layer's switches (src/lib/fx.ts) — a snapshot string so
  // the command labels follow the state they toggle.
  const fxState = useSyncExternalStore(subscribeFx, fxSnapshot, () => "off||");

  // `silent` is the palette's own data-voice: a command with a dedicated
  // sound (the soundscape action's brass click) closes without the wood
  // tap, so one press never plays two sounds.
  const close = useCallback((silent = false) => {
    setOpen(false);
    setQuery("");
    setSelected(0);
    restoreFocusRef.current?.focus();
    if (!silent)
      playUi("tap"); // the panel closing — wood, one of the four sanctioned sounds
  }, []);

  // Every way in (Ctrl+K, "/", the nav's open event) funnels through
  // here — one place for the focus bookkeeping and the one wood tap.
  const openNow = useCallback(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement;
    setOpen(true);
    playUi("tap");
  }, []);

  const commands = useMemo<Command[]>(() => {
    // Shared with the terminal's `goto` (src/lib/jump.ts) — which also says
    // why the case files, where the index's sections don't exist, navigate
    // the tab to the index anchor instead.
    const jump = (id: string) => () => jumpToSection(id);
    // Navigate the tab itself rather than opening a second one.
    const navigate = (url: string) => () => {
      window.location.href = url;
    };

    const sections = [
      { id: "top", label: "Hero / Top of page" },
      ...navSections.map((s) => ({ id: s.id, label: s.label })),
    ];

    const tier = fxState.split("|")[0];
    const instrument: Command[] = [
      ...(tier !== "off"
        ? [
            {
              id: "deep",
              group: "instrument" as const,
              label: isDeep() ? experience.palette.deepOff : experience.palette.deepOn,
              hint: "shift D",
              keywords: "immersive overlays telemetry grid depth",
              run: () => {
                setDeep(!isDeep());
                playUi("gear");
              },
            },
          ]
        : []),
      {
        id: "reduce",
        group: "instrument" as const,
        label: isReducedByUser() ? experience.palette.reduceOff : experience.palette.reduceOn,
        keywords: "effects motion webgl performance calm accessibility",
        run: () => {
          setReducedEffects(!isReducedByUser());
          playUi("click");
        },
      },
      {
        id: "light",
        group: "instrument" as const,
        label: isOpenLight() ? experience.palette.lampLight : experience.palette.openLight,
        keywords: "lighting lamp bright reading contrast",
        run: () => {
          setOpenLight(!isOpenLight());
          playUi("click");
        },
      },
      ...(tier !== "off"
        ? [
            {
              id: "relight",
              group: "instrument" as const,
              label: experience.palette.relight,
              keywords: "intro ignition replay loader",
              run: navigate(`${withBase("/")}?ignite`),
            },
          ]
        : []),
      ...(typeof document !== "undefined" &&
      document.documentElement.hasAttribute("data-archive-complete")
        ? [
            {
              id: "complete",
              group: "instrument" as const,
              label: experience.palette.complete,
              run: () => window.dispatchEvent(new Event("lamplight:explode")),
            },
          ]
        : []),
      {
        id: "terminal",
        group: "instrument" as const,
        label: terminalEntry.open,
        hint: terminalEntry.hint,
        keywords: "command line cli shell console prompt",
        silent: true,
        // Next tick: by then the palette has closed and given focus back,
        // so the terminal's own focus-restore target is whatever was
        // focused before either overlay.
        run: () =>
          window.setTimeout(
            () => window.dispatchEvent(new Event(OPEN_TERMINAL_EVENT)),
            0,
          ),
      },
    ];
    const secrets: Command[] = [
      {
        id: "secret-extinguish",
        group: "instrument" as const,
        label: experience.palette.snuffed,
        secret: "extinguish",
        run: () => window.dispatchEvent(new CustomEvent("lamplight:snuff", { detail: true })),
      },
      {
        id: "secret-relight",
        group: "instrument" as const,
        label: experience.palette.lampLight,
        secret: "relight",
        run: () => window.dispatchEvent(new CustomEvent("lamplight:snuff", { detail: false })),
      },
      {
        id: "secret-calibrate",
        group: "instrument" as const,
        label: experience.instrument.exploded,
        secret: "calibrate",
        run: () => window.dispatchEvent(new Event("lamplight:explode")),
      },
    ];

    return [
      ...instrument,
      ...secrets,
      ...sections.map((s) => ({
        id: `section-${s.id}`,
        group: "sections" as const,
        label: s.label,
        hint: `#${s.id}`,
        run: jump(s.id),
      })),
    ];
  }, [fxState]);

  const filtered = useMemo(() => {
    const q = query.trim();
    // Secrets are never listed; typed exactly, they are all that shows.
    const secret = commands.filter((c) => c.secret && c.secret === q.toLowerCase());
    if (secret.length) return secret;
    const commandsPublic = commands.filter((c) => !c.secret);
    if (!q) return commandsPublic;
    return commandsPublic
      .map((c) => ({
        c,
        score: fuzzyScore(q, `${c.label} ${c.group} ${c.keywords ?? ""}`),
      }))
      .filter((x): x is { c: Command; score: number } => x.score !== null)
      .sort((a, b) => a.score - b.score)
      .map((x) => x.c);
  }, [commands, query]);

  // Global shortcut: Ctrl/⌘+K toggles or '/' opens; external open event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK =
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey &&
        e.key.toLowerCase() === "k";

      const isSlash =
        e.key === "/" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !(
          document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement ||
          (document.activeElement instanceof HTMLElement &&
            document.activeElement.isContentEditable)
        );

      if (isCmdK) {
        e.preventDefault();
        if (open) {
          close();
        } else {
          openNow();
        }
      } else if (isSlash && !open) {
        e.preventDefault();
        openNow();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, openNow);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, openNow);
    };
  }, [open, close, openNow]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Lock body scroll while the overlay is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keyboard selection keeps the row in view — and the list's one
  // marker glides to meet it (CollectUI brief, item 6): the selected
  // row's centre is read once per selection change, never per frame,
  // and written as `--row-y`; the 200ms transform transition lives in
  // CSS (`.row-marker`, globals.css). The bg-signal selection swap
  // stays the accessible state — this is an extra beat, not a second
  // selection device.
  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>(
      '[aria-selected="true"]',
    );
    row?.scrollIntoView({ block: "nearest" });
    const marker = markerRef.current;
    if (!marker) return;
    if (!row) {
      marker.removeAttribute("data-on");
      return;
    }
    marker.style.setProperty(
      "--row-y",
      `${row.offsetTop + row.offsetHeight / 2}px`,
    );
    if (!marker.hasAttribute("data-on")) {
      // Land silently: flush the position while the transition-less rest
      // state still applies (same device as RowMarker.tsx).
      marker.getBoundingClientRect();
      marker.setAttribute("data-on", "");
    }
  }, [open, selected, filtered]);

  // The list's clipped edges fade (CollectUI Phase 2, ref @pacovitiello
  // — "fade effect on scroll overflow w/ CSS masking"). The mask is
  // driven by the real scroll position, never left on: a permanent fade
  // over a list that isn't clipped would be dimming text to decorate,
  // which this palette has no contrast headroom for. `data-clip` names
  // the edge that genuinely has more behind it; the gradient lives in
  // CSS (`#palette-list[data-clip]`, globals.css).
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const mark = () => {
      const top = list.scrollTop > 1;
      const bottom =
        list.scrollTop + list.clientHeight < list.scrollHeight - 1;
      const value = top && bottom ? "both" : top ? "top" : bottom ? "bottom" : null;
      if (value) list.setAttribute("data-clip", value);
      else list.removeAttribute("data-clip");
    };
    mark();
    list.addEventListener("scroll", mark, { passive: true });
    return () => list.removeEventListener("scroll", mark);
  }, [open, filtered]);

  if (!open) return null;

  const run = (c: Command) => {
    c.run();
    close(c.silent);
  };

  // Dialog-level keys: work wherever focus sits inside the dialog, and
  // Tab stays trapped on the input (the only tabbable element).
  const onDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      e.preventDefault();
      inputRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.max(0, Math.min(s + 1, filtered.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (isTerminalChord(e.nativeEvent)) {
      // Hand off to the terminal: close silently (the terminal taps on
      // open), open next tick so its focus-restore target is the element
      // focused before either overlay. Stopped here so the shell's own
      // window listener does not also toggle it.
      e.preventDefault();
      e.stopPropagation();
      close(true);
      window.setTimeout(
        () => window.dispatchEvent(new Event(OPEN_TERMINAL_EVENT)),
        0,
      );
    } else if (e.key === "Enter" && filtered[selected]) {
      e.preventDefault();
      run(filtered[selected]);
    }
  };

  // Group commands preserving order for role="group" list semantics.
  const groups: { name: Command["group"]; items: { c: Command; i: number }[] }[] =
    [];
  filtered.forEach((c, i) => {
    const last = groups[groups.length - 1];
    if (last && last.name === c.group) last.items.push({ c, i });
    else groups.push({ name: c.group, items: [{ c, i }] });
  });

  return (
    <div
      className="fixed inset-0 z-100 flex items-start justify-center bg-ground/85 p-4 pt-[12vh]"
      // Close only when the press itself began on the scrim: a click's
      // target is the nearest common ancestor of mousedown and mouseup,
      // so drag-selecting the query and releasing outside the dialog
      // used to land the click here and discard the query mid-selection.
      onMouseDown={(e) => {
        scrimPressRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (scrimPressRef.current && e.target === e.currentTarget) close();
        scrimPressRef.current = false;
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Field index"
        className="w-full max-w-xl border border-signal bg-ground"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onDialogKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-rule px-4">
          <Search size={14} aria-hidden="true" className="shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0); // reset selection as the list refilters
            }}
            placeholder="Query the field…"
            aria-label="Search the field"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={
              filtered[selected] ? `cmd-${filtered[selected].id}` : undefined
            }
            className="h-13 w-full bg-transparent font-mono text-sm placeholder:text-[0.6875rem] placeholder:tracking-[0.19em] placeholder:uppercase placeholder:opacity-100 focus:outline-none"
          />
          <kbd className="label shrink-0 border border-rule px-1.5 py-1">
            esc
          </kbd>
        </div>

        {filtered.length === 0 && (
          <p role="status" className="label px-4 py-6 normal-case">
            0 matches · the field is unchanged
          </p>
        )}

        <div
          id="palette-list"
          ref={listRef}
          role="listbox"
          aria-label="Commands"
          className="relative max-h-[52vh] overflow-y-auto py-1"
        >
          {/* The one marker, gliding with the selection (see the effect
              above). Inside the selected row's own bg-signal fill it
              takes that row's swapped ink — ground, never ember
              (`#palette-list > .row-marker`, globals.css). aria-hidden
              and not focusable, so axe's listbox-children walk skips it
              and aria-selected stays the announced state. */}
          <span ref={markerRef} aria-hidden="true" className="row-marker" />
          {/* Keyed by position: a ranked query can interleave groups
              (archive, sections, archive…), and a name-only key then
              collided and left stale rows in the list. */}
          {groups.map((g, gi) => (
            <div
              key={`${g.name}-${gi}`}
              role="group"
              aria-labelledby={`palette-group-${g.name}-${gi}`}
            >
              <p
                id={`palette-group-${g.name}-${gi}`}
                className="label border-b border-rule-soft px-4 pt-4 pb-2"
              >
                {g.name}
              </p>
              {g.items.map(({ c, i }) => (
                <div
                  key={c.id}
                  id={`cmd-${c.id}`}
                  role="option"
                  aria-selected={i === selected}
                  tabIndex={-1}
                  onMouseMove={(e) => {
                    const last = lastPointerRef.current;
                    lastPointerRef.current = { x: e.clientX, y: e.clientY };
                    if (last && (last.x !== e.clientX || last.y !== e.clientY))
                      setSelected(i);
                  }}
                  onClick={() => run(c)}
                  className={`flex min-h-11 items-center justify-between gap-4 px-4 py-3 font-mono text-sm ${
                    i === selected ? "bg-signal text-ground" : ""
                  }`}
                >
                  <span className="truncate">{c.label}</span>
                  <span className="label flex shrink-0 items-center gap-1.5 normal-case">
                    {/* Metadata chips (CollectUI Phase 2, ref @ilyamiskov):
                        hairline `.label` chips carrying data content.ts
                        already holds. aria-hidden — the announced option
                        stays the label and its hint — and held back below
                        `sm`, where the row needs its width for the label. */}
                    {c.chips?.length ? (
                      <span
                        aria-hidden="true"
                        className="hidden items-center gap-1.5 sm:flex"
                      >
                        {c.chips.map((chip) => (
                          <span
                            key={chip}
                            className="palette-chip"
                          >
                            {chip}
                          </span>
                        ))}
                      </span>
                    ) : null}
                    {c.hint}
                    {i === selected ? (
                      <CornerDownLeft size={11} aria-hidden="true" />
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="label flex items-center gap-4 border-t border-rule px-4 py-2.5">
          <span className="flex items-center gap-1.5">
            <ArrowUp size={11} aria-hidden="true" />
            <ArrowDown size={11} aria-hidden="true" />
            navigate
          </span>
          <span className="flex items-center gap-1.5">
            <CornerDownLeft size={11} aria-hidden="true" />
            run
          </span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
