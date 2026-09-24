/**
 * Which listed projects name each skill — for the ledger's constellation.
 *
 * Nothing is inferred. A skill is "used in" a project only when that
 * project's own `tech` list (src/content.ts) names it: the same words,
 * ignoring case, a trailing version number ("Python 3.11+", "React 19",
 * "SQLAlchemy 2") and a trailing parenthetical ("GitHub Actions (CI/CD)").
 * "C/C++" does not match "C"; "LLM-assisted development" matches nothing.
 * A skill no listed project names says so plainly.
 */

export interface SkillNode {
  name: string;
  usedIn: string[];
}
export interface SkillGroup {
  group: string;
  items: SkillNode[];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s+\d[\d.]*\+?$/, "")
    .trim();

export function skillUsage(
  skills: readonly { group: string; items: readonly string[] }[],
  projects: readonly { name: string; tech: readonly string[] }[],
): SkillGroup[] {
  return skills.map(({ group, items }) => ({
    group,
    items: items.map((name) => ({
      name,
      usedIn: projects
        .filter((p) => p.tech.some((t) => norm(t) === norm(name)))
        .map((p) => p.name),
    })),
  }));
}
