import { expect, test } from "@playwright/test";
import {
  about,
  contact,
  featuredProjects,
  links,
  moreProjects,
  navSections,
  skills,
  terminal,
} from "../src/content";
import { withBase } from "../src/lib/base";
import { COMMAND_NAMES, complete, run } from "../src/lib/terminal";

/**
 * Unit tests for the terminal's interpreter — pure and synchronous, in the
 * same Node-side style as tests/sound-unit.spec.ts: no browser, no DOM. The
 * interpreter composes everything it prints from content.ts, so most of
 * these assert "the output IS the record", never a retyped copy of it. The
 * e2e half (the dialog, the keys, focus, axe) lives in tests/terminal.spec.ts.
 */
const sectionIds = ["top", ...navSections.map((s) => s.id)];

test.describe("run (pure)", () => {
  test("help lists every registered command with its description", () => {
    const rows = run("help").lines.filter((l) => l.kind === "row");
    expect(rows).toHaveLength(COMMAND_NAMES.length);
    for (const name of COMMAND_NAMES) {
      const description = terminal.commands[name as keyof typeof terminal.commands];
      expect(rows.some((r) => r.kind === "row" && r.text === description)).toBe(true);
    }
    // The argument-taking commands show their usage, not the bare name.
    for (const usage of Object.values(terminal.usage)) {
      expect(rows.some((r) => r.kind === "row" && r.name === usage)).toBe(true);
    }
  });

  test("commands are case-insensitive", () => {
    expect(run("HELP")).toEqual(run("help"));
  });

  test("about prints exactly about.paragraphs", () => {
    expect(run("about").lines).toEqual(
      about.paragraphs.map((text) => ({ kind: "text", text })),
    );
  });

  test("projects lists each featured id with its one-liner, and links the rest", () => {
    const { lines } = run("projects");
    for (const p of featuredProjects) {
      expect(lines).toContainEqual({ kind: "row", name: p.id, text: p.oneLiner });
    }
    for (const m of moreProjects) {
      if (m.repoUrl) {
        expect(lines).toContainEqual({
          kind: "link",
          label: m.name,
          href: m.repoUrl,
          external: true,
        });
      }
    }
  });

  test("open resolves an id, any case, a unique prefix, and a name", () => {
    const warden = { kind: "open", href: withBase("/projects/warden/") };
    expect(run("open warden").effect).toEqual(warden);
    expect(run("open WARDEN").effect).toEqual(warden);
    expect(run("open war").effect).toEqual(warden);
    expect(run("open plantpal+").effect).toEqual({
      kind: "open",
      href: withBase("/projects/plantpal/"),
    });
    expect(run("open proactive").effect).toEqual({
      kind: "open",
      href: withBase("/projects/scheduler/"),
    });
  });

  test("open reports usage, a missing project, and an ambiguous prefix as not found", () => {
    expect(run("open")).toEqual({ lines: [{ kind: "text", text: terminal.openUsage }] });
    const missing = run("open nope");
    expect(missing.effect).toBeUndefined();
    expect(missing.lines).toEqual([
      { kind: "text", text: terminal.openMissing.replace("{name}", "nope") },
    ]);
    // "p" is both plantpal (id) and Proactive Feasibility Scheduler (name).
    expect(run("open p").effect).toBeUndefined();
  });

  test("skills prints every group with its items", () => {
    expect(run("skills").lines).toEqual(
      skills.map((g) => ({ kind: "row", name: g.group, text: g.items.join(", ") })),
    );
  });

  test("contact prints the headline and the real links", () => {
    const { lines } = run("contact");
    expect(lines[0]).toEqual({ kind: "text", text: contact.headline });
    expect(lines).toContainEqual({
      kind: "link",
      label: links.email,
      href: `mailto:${links.email}`,
    });
    expect(lines).toContainEqual({
      kind: "link",
      label: links.github.label,
      href: links.github.url,
      external: true,
    });
    expect(lines).toContainEqual({
      kind: "link",
      label: links.linkedin.label,
      href: links.linkedin.url,
      external: true,
    });
  });

  test("resume downloads the résumé and keeps the link as a fallback", () => {
    const href = withBase(links.resume);
    const { lines, effect } = run("resume");
    expect(effect).toEqual({ kind: "download", href });
    expect(lines).toContainEqual({
      kind: "link",
      label: terminal.resumeLink,
      href,
      download: true,
    });
  });

  test("goto knows top and every nav section, by id or label", () => {
    for (const id of sectionIds) {
      expect(run(`goto ${id}`).effect).toEqual({ kind: "goto", id });
    }
    for (const s of navSections) {
      expect(run(`goto ${s.label}`).effect).toEqual({ kind: "goto", id: s.id });
    }
  });

  test("goto reports usage and a missing section, naming the ids", () => {
    const ids = sectionIds.join(", ");
    expect(run("goto").lines).toEqual([
      { kind: "text", text: terminal.gotoUsage.replace("{ids}", ids) },
    ]);
    const missing = run("goto nowhere");
    expect(missing.effect).toBeUndefined();
    expect(missing.lines).toEqual([
      {
        kind: "text",
        text: terminal.gotoMissing.replace("{name}", "nowhere").replace("{ids}", ids),
      },
    ]);
  });

  test("palette, clear and exit are effects with no output", () => {
    expect(run("palette")).toEqual({ lines: [], effect: { kind: "palette" } });
    expect(run("clear")).toEqual({ lines: [], effect: { kind: "clear" } });
    expect(run("exit")).toEqual({ lines: [], effect: { kind: "exit" } });
  });

  test("an unknown word is named in the hint, and an empty line prints nothing", () => {
    expect(run("sudo make me a sandwich")).toEqual({
      lines: [{ kind: "text", text: terminal.unknown.replace("{name}", "sudo") }],
    });
    expect(run("   ")).toEqual({ lines: [] });
    expect(run("")).toEqual({ lines: [] });
  });
});

test.describe("complete (pure)", () => {
  test("completes a unique command prefix, leaving a space after argument commands", () => {
    expect(complete("he")).toBe("help");
    expect(complete("pr")).toBe("projects");
    expect(complete("ope")).toBe("open ");
    expect(complete("go")).toBe("goto ");
  });

  test("leaves ambiguous, unmatched and empty input alone", () => {
    expect(complete("p")).toBe("p"); // projects, palette
    expect(complete("c")).toBe("c"); // contact, clear
    expect(complete("zzz")).toBe("zzz");
    expect(complete("")).toBe("");
  });

  test("completes the argument of open and goto when the prefix is unique", () => {
    expect(complete("open w")).toBe("open warden");
    expect(complete("open pl")).toBe("open plantpal");
    expect(complete("goto c")).toBe("goto contact");
    expect(complete("goto a")).toBe("goto about");
  });

  test("completes an argument exactly as run resolves it — never an ambiguous prefix", () => {
    // "p" is plantpal (id) and Proactive Feasibility Scheduler (name): run
    // says not found, so Tab must not pick one.
    expect(complete("open p")).toBe("open p");
    expect(run("open p").effect).toBeUndefined();
    // "pr" is the scheduler's name alone, and run opens it.
    expect(complete("open pr")).toBe("open scheduler");
  });

  test("leaves other commands' arguments and empty arguments alone", () => {
    expect(complete("open ")).toBe("open ");
    expect(complete("help me")).toBe("help me");
    expect(complete("open zzz")).toBe("open zzz");
  });
});
