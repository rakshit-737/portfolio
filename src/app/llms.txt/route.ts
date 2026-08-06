import {
  about,
  achievements,
  education,
  featuredProjects,
  hero,
  links,
  moreProjects,
  researchSpotlight,
  site,
  skills,
} from "@/content";

export const dynamic = "force-static";

/** Strip the `**metric**` markers used for amber highlighting. */
const plain = (s: string) => s.replace(/\*\*/g, "");

/**
 * llms.txt — a machine-readable summary of the record, generated from
 * content.ts at build time. https://llmstxt.org
 */
export function GET() {
  const lines = [
    `# ${hero.name}`,
    "",
    `> ${site.description}`,
    "",
    `Location: ${hero.location}`,
    `GitHub: ${links.github.url}`,
    `LinkedIn: ${links.linkedin.url}`,
    `Email: ${links.email}`,
    `Site: ${site.url}/`,
    "",
    "## About",
    "",
    ...about.paragraphs,
    "",
    "## Featured Projects",
    "",
    ...featuredProjects.flatMap((p) => [
      `### ${p.name} (${p.timeframe})`,
      "",
      p.oneLiner,
      ...p.bullets.map((b) => `- ${plain(b)}`),
      ...(p.repoUrl ? [`- Repository: ${p.repoUrl}`] : []),
      `- Case study: ${site.url}/projects/${p.id}/`,
      "",
    ]),
    "## Research",
    "",
    researchSpotlight.context,
    `Takeaway: "${researchSpotlight.quote}"`,
    "",
    "## More Projects",
    "",
    ...moreProjects.map(
      (p) =>
        `- ${p.name} (${p.timeframe}): ${plain(p.description)}${p.repoUrl ? ` Repository: ${p.repoUrl}` : ""}`,
    ),
    "",
    "## Achievements",
    "",
    ...achievements.map((a) => `- ${a.title} — ${a.detail} (${a.date})`),
    "",
    "## Skills",
    "",
    ...skills.map((s) => `- ${s.group}: ${s.items.join(", ")}`),
    "",
    "## Education",
    "",
    ...education.map(
      (e) => `- ${e.degree}, ${e.institution}, ${e.period} — ${e.score}`,
    ),
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
