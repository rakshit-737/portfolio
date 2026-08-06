"use client";

import { useEffect, useRef, useState } from "react";
import {
  education,
  featuredProjects,
  hero,
  links,
  moreProjects,
  navSections,
} from "@/content";
import { withBase } from "@/lib/base";

/**
 * Terminal easter egg: `~` opens a mock shell over the record. Read-only,
 * keyboard-first, every answer comes from content.ts. Esc closes.
 */

interface Line {
  prompt?: string;
  text: string;
}

const BANNER = "evidence shell — type `help` · esc to close";

function run(input: string): string[] {
  const [cmd, ...rest] = input.trim().split(/\s+/);
  const arg = rest.join(" ");
  switch (cmd) {
    case "":
      return [];
    case "help":
      return [
        "available commands:",
        "  whoami            who this record belongs to",
        "  ls [projects]     list the projects",
        "  cat resume.txt    where the résumé lives",
        "  open <section>    jump to a section (about, projects, …)",
        "  clear             clear the screen",
        "  exit              close the shell",
      ];
    case "whoami":
      return [`${hero.name} — ${hero.role}`, `${hero.location}`];
    case "ls":
      if (arg === "" || arg === "projects")
        return [
          ...featuredProjects.map((p) => `${p.id}/  (${p.name})`),
          ...moreProjects.map((p) => `${p.name}`),
        ];
      return [`ls: cannot access '${arg}': not part of the record`];
    case "cat":
      if (arg === "resume.txt")
        return [
          `résumé: ${withBase(links.resume)}`,
          ...education.map((e) => `${e.period}  ${e.degree}, ${e.institution} — ${e.score}`),
        ];
      if (arg === "verified.log")
        return [`${hero.provenance.prefix} ${hero.provenance.text}`];
      return [`cat: ${arg || "?"}: no such file · try resume.txt`];
    case "open": {
      const section = navSections.find((s) => s.id === arg);
      if (section) {
        const reduced = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        document.getElementById(section.id)?.scrollIntoView({
          behavior: reduced ? "auto" : "smooth",
        });
        return [`opening #${section.id} …`];
      }
      return [
        `open: unknown section '${arg}' · sections: ${navSections.map((s) => s.id).join(", ")}`,
      ];
    }
    default:
      return [`command not found: ${cmd} · try help`];
  }
}

export default function MockShell() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if (e.key === "~" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        restoreFocusRef.current = document.activeElement as HTMLElement;
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [lines, open]);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    setInput("");
    restoreFocusRef.current?.focus();
  };

  const submit = () => {
    const cmd = input;
    setInput("");
    if (cmd.trim() === "clear") {
      setLines([]);
      return;
    }
    if (cmd.trim() === "exit") {
      close();
      return;
    }
    setLines((prev) => [
      ...prev,
      { prompt: "visitor@record:~$", text: cmd },
      ...run(cmd).map((text) => ({ text })),
    ]);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Evidence shell"
      className="fixed inset-x-0 bottom-0 z-100 border-t border-hairline bg-bg/95 backdrop-blur"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          close();
        } else if (e.key === "Tab") {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }}
    >
      <div className="mx-auto max-w-5xl px-6 py-4">
        <p className="font-mono text-[10px] tracking-widest text-muted">
          {BANNER}
        </p>
        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          className="mt-2 max-h-48 overflow-y-auto"
          tabIndex={-1}
        >
          {lines.map((l, i) => (
            <p key={i} className="font-mono text-xs leading-relaxed">
              {l.prompt && <span className="text-steel">{l.prompt} </span>}
              <span className={l.prompt ? "text-ink" : "text-muted"}>
                {l.text}
              </span>
            </p>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-2 font-mono text-xs">
          <span aria-hidden="true" className="text-steel">
            visitor@record:~$
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            aria-label="Shell command"
            autoComplete="off"
            spellCheck={false}
            className="h-7 w-full bg-transparent font-mono text-xs text-ink caret-amber focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
