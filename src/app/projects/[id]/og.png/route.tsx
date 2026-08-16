import { ImageResponse } from "next/og";
import { caseStudies, featuredProjects } from "@/content";
import { OG_BONE, OG_EMBER, OG_GROUND, OgChip } from "@/lib/ogField";
import { ogFamily, ogFonts, ogText } from "@/lib/ogFonts";

export const dynamic = "force-static";

export function generateStaticParams() {
  return featuredProjects
    .filter((p) => caseStudies[p.id])
    .map((p) => ({ id: p.id }));
}

/** Per-case-file OG card: ground, the project's name, and its numbers. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const project = featuredProjects.find((p) => p.id === id);
  if (!project) return new Response("not found", { status: 404 });

  const fonts = await ogFonts();
  const mono = ogFamily(fonts);
  const strip = project.evidence
    .filter((s) => !s.href)
    .map((s) => s.label)
    .slice(0, 3)
    .join("  ·  ");
  const numbers = project.headlineNumbers ?? [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          backgroundColor: OG_GROUND,
          color: OG_BONE,
          fontFamily: mono,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 22,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          <OgChip>case file</OgChip>
          <span>{strip}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 68,
              fontWeight: 600,
              letterSpacing: -2.5,
              lineHeight: 1.05,
            }}
          >
            {ogText(project.name)}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: 26,
              lineHeight: 1.4,
            }}
          >
            {ogText(project.oneLiner)}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 56,
            borderTop: `2px solid ${OG_EMBER}`,
            paddingTop: 26,
          }}
        >
          {numbers.length ? (
            numbers.map((n) => (
              <div
                key={ogText(n.label)}
                style={{ display: "flex", flexDirection: "column" }}
              >
                <span
                  style={{ fontSize: 42, fontWeight: 600, letterSpacing: -1 }}
                >
                  {ogText(n.value)}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    letterSpacing: 2.5,
                    textTransform: "uppercase",
                    marginTop: 8,
                  }}
                >
                  {ogText(n.label)}
                </span>
              </div>
            ))
          ) : (
            <span style={{ fontSize: 22, letterSpacing: 2 }}>
              rakshit rameshbabu · software &amp; security engineer
            </span>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: fonts.length ? fonts : undefined },
  );
}
