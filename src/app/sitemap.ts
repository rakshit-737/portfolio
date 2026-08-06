import type { MetadataRoute } from "next";
import { site } from "@/content";

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
  ];
}
