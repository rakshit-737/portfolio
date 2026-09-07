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
  ArrowUpRight,
  CornerDownLeft,
  Search,
} from "lucide-react";
import {
  caseSections,
  caseStudies,
  featuredProjects,
  links,
  moreProjects,
  navSections,
  soundscape,
} from "@/content";
import { withBase } from "@/lib/base";
import {
  getSoundStatus,
  isSoundEnabled,
  playUi,
  setSoundEnabled,
  subscribeSound,
} from "@/lib/sound";

/** Nav (or anything else) can open the palette by dispatching this event. */
export const OPEN_PALETTE_EVENT = "evidence-index:open";

const RECENTS_KEY = "evidence-index:recents";
const RECENTS_MAX = 4;

interface Command {
  id: string;
  group: "recent" | "sections" | "case-files" | "repositories" | "actions";
  label: string;
  hint?: string;
  keywords?: string;
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

type CopyOutcome = "idle" | "copied" | "failed";

/**
 * Success is only ever reported from the resolved path of a real
 * clipboard write — the rule CopyEmailButton.tsx already holds. An
 * absent clipboard (insecure context) or a refused write reports
 * failure instead, so a "Copied" line can never outrun the clipboard.
 */
function copyText(text: string, onOk: () => void, onFail: () => void) {
  if (!navigator.clipboard) {
    onFail();
    return;
  }
  navigator.clipboard.writeText(text).then(onOk, onFail);
}

function readRecents(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function pushRecent(id: string) {
  try {
    const next = [id, ...readRecents().filter((r) => r !== id)].slice(
      0,
      RECENTS_MAX,
    );
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable — recents simply don't persist.
  }
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  // A copy command's outcome, narrated in place of its own row (run()
  // deliberately keeps the palette open for these): "copied" is set
  // only from the resolved path of a real clipboard write (copyText
  // above), and "failed" makes the row show the value itself — never a
  // success the clipboard didn't confirm.
  const [emailCopy, setEmailCopy] = useState<CopyOutcome>("idle");
  const [urlCopy, setUrlCopy] = useState<CopyOutcome>("idle");
  // The section link resolved at copy time — shown on the row when the
  // clipboard couldn't take it.
  const [sectionUrl, setSectionUrl] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
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
  // The soundscape action's label names the transition ("turn off"), so
  // the commands memo below must recompute when the engine's status
  // changes — this subscription is that dependency.
  const soundStatus = useSyncExternalStore(
    subscribeSound,
    getSoundStatus,
    () => "off" as const,
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelected(0);
    setEmailCopy("idle");
    setUrlCopy("idle");
    restoreFocusRef.current?.focus();
    playUi("tap"); // the panel closing — wood, one of the four sanctioned sounds
  }, []);

  // Every way in (Ctrl+K, "/", the nav's open event) funnels through
  // here — one place for the focus bookkeeping and the one wood tap.
  const openNow = useCallback(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement;
    setRecents(readRecents());
    setOpen(true);
    playUi("tap");
  }, []);

  const commands = useMemo<Command[]>(() => {
    const jump = (id: string) => () => {
      const el = document.getElementById(id);
      // The palette mounts on the case files too, where the index's act
      // sections don't exist in this document — navigate the tab to the
      // index anchor instead, the same device the case-file section
      // commands below already use. Never replaceState onto a hash with
      // nothing behind it.
      if (!el) {
        window.location.href = withBase(`/#${id}`);
        return;
      }
      el.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
      history.replaceState(null, "", `#${id}`);
    };
    const external = (url: string) => () => {
      window.open(url, "_blank", "noopener,noreferrer");
    };
    // A case-file section is a different route, not an in-page anchor —
    // navigate the tab itself rather than opening a second one.
    const navigate = (url: string) => () => {
      window.location.href = url;
    };

    const repos = [
      ...featuredProjects
        .filter((p) => p.repoUrl)
        .map((p) => ({ name: p.name.split("—")[0].trim(), url: p.repoUrl! })),
      ...moreProjects
        .filter((p) => p.repoUrl)
        .map((p) => ({ name: p.name.split("—")[0].trim(), url: p.repoUrl! })),
    ];

    const sections = [
      { id: "top", label: "Hero / Top of page" },
      ...navSections.map((s) => ({ id: s.id, label: s.label })),
    ];

    const caseFileSections = featuredProjects
      .filter((p) => caseStudies[p.id])
      .flatMap((p) => {
        const name = p.name.split("—")[0].trim();
        return caseSections.map((sec) => ({
          id: `case-${p.id}-${sec.slug}`,
          group: "case-files" as const,
          label: `${name} — ${sec.title}`,
          hint: `#${sec.slug}`,
          keywords: `case file study ${p.id} ${sec.title}`,
          run: navigate(withBase(`/projects/${p.id}/#${sec.slug}`)),
        }));
      });

    return [
      ...sections.map((s) => ({
        id: `section-${s.id}`,
        group: "sections" as const,
        label: s.label,
        hint: `#${s.id}`,
        run: jump(s.id),
      })),
      ...caseFileSections,
      ...repos.map((r) => ({
        id: `repo-${r.name}`,
        group: "repositories" as const,
        label: r.name,
        hint: "open repo",
        keywords: "github source code",
        run: external(r.url),
      })),
      {
        id: "copy-email",
        group: "actions" as const,
        label: `Copy email — ${links.email}`,
        keywords: "contact mail",
        run: () => {
          copyText(
            links.email,
            () => {
              playUi("seal"); // the copy landing — wax, on success only
              setEmailCopy("copied");
            },
            () => setEmailCopy("failed"),
          );
        },
      },
      {
        id: "copy-url",
        group: "actions" as const,
        label: "Copy link to current section",
        keywords: "share url link location",
        run: () => {
          // Resolved at copy time: location.hash only records the last
          // explicit jump — free scrolling never touches it. The band
          // is Nav.tsx's scroll-spy geometry (rootMargin -30%/-60%:
          // the strip from 30% to 40% of the viewport), so the copied
          // link and the rail's active section agree. The deepest act
          // whose top has reached the band's lower edge wins — for the
          // contiguous acts that is the one spanning the band, and it
          // still resolves at the footer, where the last act's bottom
          // has left the band upward. A page with none of the observed
          // sections (a case file) copies its plain pathname link, no
          // hash — location.href could still carry a stale arrival
          // anchor the reader has long since scrolled away from.
          const bandBottom = window.innerHeight * 0.4;
          let current: string | null = null;
          for (const id of ["hero", ...navSections.map((s) => s.id)]) {
            const el = document.getElementById(id);
            if (el && el.getBoundingClientRect().top <= bandBottom)
              current = id;
          }
          const url = current
            ? `${location.origin}${location.pathname}#${current}`
            : `${location.origin}${location.pathname}`;
          setSectionUrl(url);
          copyText(
            url,
            () => setUrlCopy("copied"),
            () => setUrlCopy("failed"),
          );
        },
      },
      {
        id: "resume",
        group: "actions" as const,
        label: "Download résumé",
        keywords: "cv pdf resume",
        run: external(withBase(links.resume)),
      },
      {
        id: "github",
        group: "actions" as const,
        label: "Open GitHub profile",
        run: external(links.github.url),
      },
      {
        id: "linkedin",
        group: "actions" as const,
        label: "Open LinkedIn",
        run: external(links.linkedin.url),
      },
      // The night archive's switch, reachable from the keyboard surface
      // too. Hidden entirely when the sound layer is absent (no
      // AudioContext) — same rule as SoundToggle.
      ...(soundStatus !== "unavailable"
        ? [
            {
              id: "soundscape",
              group: "actions" as const,
              label: `${soundscape.label}: ${soundscape.paletteVerb} ${
                isSoundEnabled() ? soundscape.off : soundscape.on
              }`,
              keywords: "sound audio mute ambient quiet hearth music",
              run: () => {
                setSoundEnabled(!isSoundEnabled());
                playUi("click");
              },
            },
          ]
        : []),
    ];
  }, [soundStatus]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) {
      // Empty query: recent commands first (as their own group), then all.
      const byId = new Map(commands.map((c) => [c.id, c]));
      const recentCmds = recents
        .map((id) => byId.get(id))
        .filter((c): c is Command => c !== undefined)
        .map((c) => ({ ...c, group: "recent" as const, id: `recent-${c.id}` }));
      return [...recentCmds, ...commands];
    }
    return commands
      .map((c) => ({
        c,
        score: fuzzyScore(q, `${c.label} ${c.group} ${c.keywords ?? ""}`),
      }))
      .filter((x): x is { c: Command; score: number } => x.score !== null)
      .sort((a, b) => a.score - b.score)
      .map((x) => x.c);
  }, [commands, query, recents]);

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
  }, [selected, filtered]);

  if (!open) return null;

  const run = (c: Command) => {
    pushRecent(c.id.replace(/^recent-/, ""));
    c.run();
    if (!c.id.endsWith("copy-email") && !c.id.endsWith("copy-url")) close();
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
    } else if (e.key === "Enter" && filtered[selected]) {
      e.preventDefault();
      run(filtered[selected]);
    }
  };

  // A copy row narrates its own outcome in place — and on failure
  // shows the value itself (the address, the resolved link), so the
  // reader still leaves with what the clipboard refused to take.
  const optionText = (c: Command) => {
    if (c.id.endsWith("copy-email")) {
      if (emailCopy === "copied") return "Copied email to clipboard";
      if (emailCopy === "failed")
        return `Clipboard unavailable — ${links.email}`;
    }
    if (c.id.endsWith("copy-url")) {
      if (urlCopy === "copied") return "Copied section link to clipboard";
      if (urlCopy === "failed") return sectionUrl;
    }
    return c.label;
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
      onClick={close}
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
          {groups.map((g) => (
            <div
              key={g.name}
              role="group"
              aria-labelledby={`palette-group-${g.name}`}
            >
              <p
                id={`palette-group-${g.name}`}
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
                  <span className="truncate">{optionText(c)}</span>
                  <span className="label flex shrink-0 items-center gap-1.5 normal-case">
                    {c.hint}
                    {c.group === "repositories" ? (
                      <ArrowUpRight size={11} aria-hidden="true" />
                    ) : i === selected ? (
                      <CornerDownLeft size={11} aria-hidden="true" />
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Announce a copy's outcome — success or the fallback value —
            to screen readers. */}
        <span aria-live="polite" className="sr-only">
          {emailCopy === "copied"
            ? `Email address ${links.email} copied to clipboard`
            : emailCopy === "failed"
            ? `Clipboard unavailable — email address is ${links.email}`
            : urlCopy === "copied"
            ? "Link to current section copied to clipboard"
            : urlCopy === "failed"
            ? `Clipboard unavailable — the section link is ${sectionUrl}`
            : ""}
        </span>

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
