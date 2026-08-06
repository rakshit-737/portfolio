"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CornerDownLeft, Search } from "lucide-react";
import { featuredProjects, links, moreProjects, navSections } from "@/content";
import { withBase } from "@/lib/base";

/** Nav (or anything else) can open the palette by dispatching this event. */
export const OPEN_PALETTE_EVENT = "evidence-index:open";

const RECENTS_KEY = "evidence-index:recents";
const RECENTS_MAX = 4;

interface Command {
  id: string;
  group: "recent" | "sections" | "repositories" | "actions";
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
  const [copied, setCopied] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelected(0);
    setCopied(false);
    restoreFocusRef.current?.focus();
  }, []);

  const commands = useMemo<Command[]>(() => {
    const jump = (id: string) => () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      document.getElementById(id)?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
      history.replaceState(null, "", `#${id}`);
    };
    const external = (url: string) => () => {
      window.open(url, "_blank", "noopener,noreferrer");
    };

    const repos = [
      ...featuredProjects
        .filter((p) => p.repoUrl)
        .map((p) => ({ name: p.name.split("—")[0].trim(), url: p.repoUrl! })),
      ...moreProjects
        .filter((p) => p.repoUrl)
        .map((p) => ({ name: p.name.split("—")[0].trim(), url: p.repoUrl! })),
    ];

    // navSections omits the archive section (nav highlights its parent);
    // the index lists it explicitly so every numbered section is reachable.
    const sections = [
      ...navSections.map((s) => ({ id: s.id, label: s.label })),
      { id: "more-projects", label: "More Projects" },
    ];

    return [
      ...sections.map((s) => ({
        id: `section-${s.id}`,
        group: "sections" as const,
        label: s.label,
        hint: `#${s.id}`,
        run: jump(s.id),
      })),
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
          navigator.clipboard?.writeText(links.email).catch(() => {});
          setCopied(true);
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
    ];
  }, []);

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

  // Global shortcut: Ctrl/⌘+K toggles; external open event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey &&
        e.key.toLowerCase() === "k"
      ) {
        e.preventDefault();
        if (open) {
          close();
        } else {
          restoreFocusRef.current = document.activeElement as HTMLElement;
          setRecents(readRecents());
          setOpen(true);
        }
      }
    };
    const onOpen = () => {
      restoreFocusRef.current = document.activeElement as HTMLElement;
      setRecents(readRecents());
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, [open, close]);

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

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [selected, filtered]);

  if (!open) return null;

  const run = (c: Command) => {
    pushRecent(c.id.replace(/^recent-/, ""));
    c.run();
    if (!c.id.endsWith("copy-email")) close();
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
      className="fixed inset-0 z-100 flex items-start justify-center bg-bg/70 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Evidence index"
        className="w-full max-w-lg border border-hairline bg-surface shadow-none"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onDialogKeyDown}
      >
        <div className="flex items-center gap-2.5 border-b border-hairline px-4">
          <Search size={14} aria-hidden="true" className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0); // reset selection as the list refilters
            }}
            placeholder="Search the record…"
            aria-label="Search the evidence index"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={
              filtered[selected] ? `cmd-${filtered[selected].id}` : undefined
            }
            className="h-12 w-full bg-transparent font-mono text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          <kbd className="shrink-0 border border-hairline px-1.5 py-0.5 font-mono text-[10px] text-muted">
            esc
          </kbd>
        </div>

        {filtered.length === 0 && (
          <p
            role="status"
            className="px-4 py-6 font-mono text-xs text-muted"
          >
            0 matches · record unchanged
          </p>
        )}

        <ul
          id="palette-list"
          ref={listRef}
          role="listbox"
          aria-label="Commands"
          className="max-h-[50vh] overflow-y-auto py-2"
        >
          {groups.map((g) => (
            <li key={g.name} role="group" aria-labelledby={`palette-group-${g.name}`}>
              <p
                id={`palette-group-${g.name}`}
                className="px-4 pt-3 pb-1 font-mono text-[10px] lowercase tracking-widest text-muted"
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
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => run(c)}
                  className={`flex cursor-pointer items-center justify-between gap-4 px-4 py-2 text-sm ${
                    i === selected ? "bg-steel/10 text-ink" : "text-muted"
                  }`}
                >
                  <span className="truncate">
                    {c.id.endsWith("copy-email") && copied
                      ? "Copied ✓"
                      : c.label}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] text-muted">
                    {c.hint}
                    {c.group === "repositories" ? (
                      <ArrowUpRight size={11} aria-hidden="true" />
                    ) : i === selected ? (
                      <CornerDownLeft size={11} aria-hidden="true" />
                    ) : null}
                  </span>
                </div>
              ))}
            </li>
          ))}
        </ul>

        {/* Announce copy success to screen readers. */}
        <span aria-live="polite" className="sr-only">
          {copied ? `Email address ${links.email} copied to clipboard` : ""}
        </span>

        <div className="flex items-center gap-3 border-t border-hairline px-4 py-2 font-mono text-[10px] text-muted">
          <span>↑↓ navigate</span>
          <span>↵ run</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
