import { ImageResponse } from "next/og";
import { hero, heroStats } from "@/content";
import { OgBarField } from "@/lib/ogField";
import { ogFamily, ogFonts, ogText } from "@/lib/ogFonts";

export const dynamic = "force-static";

/**
 * Open Graph card in the field's own grammar: absolute black, one bar
 * field, the name at display scale, and real measurements along the
 * bottom rule. Emitted at build time as a real .png path so static hosts
 * (GitHub Pages) serve it with an image/png content type — the
 * extensionless opengraph-image convention breaks scrapers there.
 */
export async function GET() {
  const fonts = await ogFonts();
  const mono = ogFamily(fonts);

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
          backgroundColor: "#000",
          color: "#fff",
          fontFamily: mono,
          position: "relative",
        }}
      >
        <OgBarField
          seed="og-index"
          width={1200}
          height={630}
          density={1.2}
          opacity={0.32}
          style={{ position: "absolute", left: 0, top: 0 }}
        />

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
          <span
            style={{
              backgroundColor: "#fff",
              color: "#000",
              padding: "4px 10px",
            }}
          >
            {hero.provenance.prefix}
          </span>
          <span>{hero.provenance.text}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 96,
              fontWeight: 600,
              letterSpacing: -4,
              lineHeight: 1,
            }}
          >
            {hero.name}
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 28 }}>
            {hero.role}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 56,
            borderTop: "1px solid rgba(255,255,255,0.35)",
            paddingTop: 26,
          }}
        >
          {heroStats.map((s) => (
            <div key={ogText(s.label)} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 44, fontWeight: 600, letterSpacing: -1 }}>
                {ogText(s.value)}
              </span>
              <span
                style={{
                  fontSize: 18,
                  letterSpacing: 2.5,
                  textTransform: "uppercase",
                  marginTop: 8,
                }}
              >
                {ogText(s.label)}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: fonts.length ? fonts : undefined },
  );
}
