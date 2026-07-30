"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CornerDownLeft, Search } from "lucide-react";
import { featuredProjects, links, moreProjects, navSections } from "@/content";
import { withBase } from "@/lib/base";

/** Nav (or anything else) can open the palette by dispatching this event. */
export const OPEN_PALETTE_EVENT = "evidence-index:open";

interface Command {
  id: string;
  group: "sections" | "repositories" | "actions";
  label: string;
  hint?: string;
  keywords?: string;
  run: () => void;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState(false);
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
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
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

    return [
      ...navSections.map((s) => ({
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
        run: external(withBase("/resume.pdf")),
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
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      `${c.label} ${c.group} ${c.keywords ?? ""}`.toLowerCase().includes(q),
    );
  }, [commands, query]);

  // Global shortcut: Ctrl/⌘+K toggles; external open event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) {
          close();
        } else {
          restoreFocusRef.current = document.activeElement as HTMLElement;
          setOpen(true);
        }
      }
    };
    const onOpen = () => {
      restoreFocusRef.current = document.activeElement as HTMLElement;
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

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [selected, filtered]);

  if (!open) return null;

  const run = (c: Command) => {
    c.run();
    if (c.id !== "copy-email") close();
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && filtered[selected]) {
      e.preventDefault();
      run(filtered[selected]);
    }
  };

  let lastGroup: string | null = null;

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
            onKeyDown={onInputKeyDown}
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

        <ul
          id="palette-list"
          ref={listRef}
          role="listbox"
          aria-label="Commands"
          className="max-h-[50vh] overflow-y-auto py-2"
        >
          {filtered.length === 0 && (
            <li className="px-4 py-6 font-mono text-xs text-muted">
              0 matches · record unchanged
            </li>
          )}
          {filtered.map((c, i) => {
            const showGroup = c.group !== lastGroup;
            lastGroup = c.group;
            return (
              <li key={c.id} role="presentation">
                {showGroup && (
                  <p
                    aria-hidden="true"
                    className="px-4 pt-3 pb-1 font-mono text-[10px] lowercase tracking-widest text-muted"
                  >
                    {c.group}
                  </p>
                )}
                <div
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
                    {c.id === "copy-email" && copied ? "Copied ✓" : c.label}
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
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-3 border-t border-hairline px-4 py-2 font-mono text-[10px] text-muted">
          <span>↑↓ navigate</span>
          <span>↵ run</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
