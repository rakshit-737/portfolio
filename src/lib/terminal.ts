/**
 * The terminal's interpreter — framework-free and pure: no React, no DOM, no
 * `window`. `run` turns a typed line into printed lines plus, at most, one
 * effect (data, performed by the panel); `complete` is Tab. Everything it
 * prints is composed from `content.ts` — no new claim lives here — so the
 * whole command set is unit-testable in Node (tests/terminal-unit.spec.ts).
 * Adding a command is one registry entry plus one copy key.
 */
import {
  about,
  caseStudies,
  contact,
  featuredProjects,
  links,
  moreProjects,
  navSections,
  skills,
  terminal,
} from "@/content";
import { withBase } from "@/lib/base";

/** One printed line. The panel renders each kind; nothing here is markup. */
export type Line =
  | { kind: "text"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "row"; name: string; text: string }
  | {
      kind: "link";
      label: string;
      href: string;
      external?: boolean;
      download?: boolean;
    };

/** What a command asks the panel to do besides print. */
export type Effect =
  | { kind: "goto"; id: string }
  | { kind: "open"; href: string }
  | { kind: "download"; href: string }
  | { kind: "palette" }
  | { kind: "clear" }
  | { kind: "exit" };

export interface Result {
  lines: Line[];
  effect?: Effect;
}

type CommandName = keyof typeof terminal.commands;

interface CommandDef {
  name: CommandName;
  /** Takes an argument — `complete` leaves a space after the name. */
  arg?: boolean;
  run: (arg: string) => Result;
}

const USAGE: Partial<Record<CommandName, string>> = terminal.usage;

const fill = (template: string, vars: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");

/** Case, spaces and punctuation never decide a match ("PlantPal+" is
 *  "plantpal"). */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const text = (t: string): Line => ({ kind: "text", text: t });

/** Only featured projects with a case file can be opened — the same rule
 *  the index and the case-file routes use. */
const openable = featuredProjects.filter((p) => caseStudies[p.id]);

/** `top` plus the rail's sections — what the palette's jump list offers. */
const SECTIONS: { id: string; label: string }[] = [
  { id: "top", label: "top" },
  ...navSections.map((s) => ({ id: s.id as string, label: s.label as string })),
];

/** The one item `q` names: an exact match on any key, else a unique prefix.
 *  More than one candidate is not a match. */
function resolve<T>(items: T[], q: string, keys: (item: T) => string[]): T | null {
  const n = norm(q);
  if (!n) return null;
  const exact = items.filter((i) => keys(i).some((k) => norm(k) === n));
  if (exact.length === 1) return exact[0];
  const prefix = items.filter((i) => keys(i).some((k) => norm(k).startsWith(n)));
  return prefix.length === 1 ? prefix[0] : null;
}

const COMMANDS: readonly CommandDef[] = [
  {
    name: "help",
    run: () => ({
      lines: [
        { kind: "heading", text: terminal.helpHeading },
        ...COMMANDS.map(
          (c): Line => ({
            kind: "row",
            name: USAGE[c.name] ?? c.name,
            text: terminal.commands[c.name],
          }),
        ),
      ],
    }),
  },
  {
    name: "about",
    run: () => ({ lines: about.paragraphs.map((p) => text(p)) }),
  },
  {
    name: "projects",
    run: () => ({
      lines: [
        { kind: "heading", text: terminal.projectsFeatured },
        ...openable.map(
          (p): Line => ({ kind: "row", name: p.id, text: p.oneLiner }),
        ),
        { kind: "heading", text: terminal.projectsMore },
        ...moreProjects.map(
          (m): Line =>
            m.repoUrl
              ? { kind: "link", label: m.name, href: m.repoUrl, external: true }
              : text(m.name),
        ),
      ],
    }),
  },
  {
    name: "open",
    arg: true,
    run: (arg) => {
      if (!arg) return { lines: [text(terminal.openUsage)] };
      const p = resolve(openable, arg, (x) => [x.id, x.name]);
      if (!p) return { lines: [text(fill(terminal.openMissing, { name: arg }))] };
      return {
        lines: [text(fill(terminal.opening, { name: p.name.split(" — ")[0] }))],
        effect: { kind: "open", href: withBase(`/projects/${p.id}/`) },
      };
    },
  },
  {
    name: "skills",
    run: () => ({
      lines: skills.map(
        (g): Line => ({ kind: "row", name: g.group, text: g.items.join(", ") }),
      ),
    }),
  },
  {
    name: "contact",
    run: () => ({
      lines: [
        text(contact.headline),
        { kind: "link", label: links.email, href: `mailto:${links.email}` },
        {
          kind: "link",
          label: links.github.label,
          href: links.github.url,
          external: true,
        },
        {
          kind: "link",
          label: links.linkedin.label,
          href: links.linkedin.url,
          external: true,
        },
      ],
    }),
  },
  {
    name: "resume",
    run: () => {
      const href = withBase(links.resume);
      return {
        lines: [
          text(terminal.resume),
          { kind: "link", label: terminal.resumeLink, href, download: true },
        ],
        effect: { kind: "download", href },
      };
    },
  },
  {
    name: "goto",
    arg: true,
    run: (arg) => {
      const ids = SECTIONS.map((s) => s.id).join(", ");
      if (!arg) return { lines: [text(fill(terminal.gotoUsage, { ids }))] };
      const s = resolve(SECTIONS, arg, (x) => [x.id, x.label]);
      if (!s) {
        return { lines: [text(fill(terminal.gotoMissing, { name: arg, ids }))] };
      }
      return { lines: [], effect: { kind: "goto", id: s.id } };
    },
  },
  { name: "palette", run: () => ({ lines: [], effect: { kind: "palette" } }) },
  { name: "clear", run: () => ({ lines: [], effect: { kind: "clear" } }) },
  { name: "exit", run: () => ({ lines: [], effect: { kind: "exit" } }) },
];

/** Every command name, in `help` order. */
export const COMMAND_NAMES: readonly string[] = COMMANDS.map((c) => c.name);

/** Run one typed line. An empty line prints nothing; an unknown word is
 *  named in the hint. */
export function run(input: string): Result {
  const trimmed = input.trim();
  if (!trimmed) return { lines: [] };
  const [word, ...rest] = trimmed.split(/\s+/);
  const def = COMMANDS.find((c) => c.name === word.toLowerCase());
  if (!def) return { lines: [text(fill(terminal.unknown, { name: word }))] };
  return def.run(rest.join(" "));
}

/** Tab: complete the command word, or `open`/`goto`'s argument, when the
 *  prefix is unique. Anything ambiguous or unmatched comes back unchanged. */
export function complete(input: string): string {
  const line = input.trimStart();
  const gap = line.search(/\s/);
  if (gap === -1) {
    const word = line.toLowerCase();
    if (!word) return input;
    const hits = COMMANDS.filter((c) => c.name.startsWith(word));
    if (hits.length !== 1) return input;
    return hits[0].arg ? `${hits[0].name} ` : hits[0].name;
  }
  const cmd = line.slice(0, gap).toLowerCase();
  const arg = norm(line.slice(gap));
  const pool =
    cmd === "open"
      ? openable.map((p) => p.id)
      : cmd === "goto"
        ? SECTIONS.map((s) => s.id)
        : null;
  if (!pool || !arg) return input;
  const hits = pool.filter((id) => id.startsWith(arg));
  return hits.length === 1 ? `${cmd} ${hits[0]}` : input;
}
