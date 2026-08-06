import { ImageResponse } from "next/og";
import { caseStudies, featuredProjects } from "@/content";
import { ogFonts } from "@/lib/ogFonts";

export const dynamic = "force-static";

export function generateStaticParams() {
  return featuredProjects
    .filter((p) => caseStudies[p.id])
    .map((p) => ({ id: p.id }));
}

/** Per-case-file OG card: evidence strip, project name, one number. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const project = featuredProjects.find((p) => p.id === id);
  if (!project) return new Response("not found", { status: 404 });

  const fonts = await ogFonts();
  const mono = fonts.some((f) => f.name === "IBM Plex Mono")
    ? "IBM Plex Mono"
    : "monospace";
  const display = fonts.some((f) => f.name === "Archivo")
    ? "Archivo"
    : "sans-serif";
  const stat = project.headlineNumbers?.[0];
  const strip = project.evidence
    .filter((s) => !s.href)
    .map((s) => s.label)
    .slice(0, 3)
    .join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: "#101418",
          color: "#E8EAED",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: mono,
            fontSize: 24,
            color: "#98A2AD",
            borderBottom: "1px solid rgba(152,162,173,0.25)",
            paddingBottom: 28,
          }}
        >
          <span style={{ color: "#E0A83C" }}>case file:</span>
          <span>{strip}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: display,
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: -1.5,
              lineHeight: 1.1,
            }}
          >
            {project.name}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontSize: 28,
              color: "#98A2AD",
              lineHeight: 1.4,
            }}
          >
            {project.oneLiner}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            fontFamily: mono,
            borderTop: "1px solid rgba(152,162,173,0.25)",
            paddingTop: 28,
          }}
        >
          {stat ? (
            <>
              <span
                style={{ fontSize: 44, fontWeight: 600, color: "#E0A83C" }}
              >
                {stat.value}
              </span>
              <span style={{ fontSize: 24, color: "#98A2AD" }}>
                {stat.label}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 24, color: "#98A2AD" }}>
              rakshit rameshbabu · software & security engineer
            </span>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: fonts.length ? fonts : undefined },
  );
}
