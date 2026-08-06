import type { MetadataRoute } from "next";
import { caseStudies, featuredProjects, site } from "@/content";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  // No lastModified: the weekly scheduled rebuild would re-stamp it
  // without content changes, which search engines learn to ignore.
  return [
    {
      url: `${site.url}/`,
      changeFrequency: "monthly",
      priority: 1,
    },
    ...featuredProjects
      .filter((p) => caseStudies[p.id])
      .map((p) => ({
        url: `${site.url}/projects/${p.id}/`,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
  ];
}
