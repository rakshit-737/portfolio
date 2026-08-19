import { ImageResponse } from "next/og";
import { hero, heroStats } from "@/content";
import { OG_BONE, OG_EMBER, OG_GROUND, OgChip } from "@/lib/ogField";
import { ogFamily, ogFonts, ogText } from "@/lib/ogFonts";

export const dynamic = "force-static";

/**
 * Open Graph card in the lit site's own grammar: ground, bone type, one
 * ember rule, and real measurements along it. Satori cannot render the
 * lamp mask, so the card is flat rather than an unmasked painting. Emitted
 * at build time as a real .png path so static hosts (GitHub Pages) serve
 * it with an image/png content type — the extensionless opengraph-image
 * convention breaks scrapers there.
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
          <OgChip>{hero.provenance.prefix}</OgChip>
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
            alignItems: "flex-start",
            gap: 40,
            borderTop: `2px solid ${OG_EMBER}`,
            paddingTop: 26,
          }}
        >
          {/* `flex: 1` + `minWidth: 0` (rather than the old fixed `gap`
              with no width bound) so a long label — P2's hero stats read
              as full sentences, not the short "CGPA / 10" this card was
              first tuned against — wraps inside its own column instead of
              overflowing the 1200px card. `alignItems: flex-start`
              replaces the old `flex-end`: with labels now wrapping to a
              different number of lines each, bottom-aligning the values
              would stagger them; top-aligning keeps all three numbers on
              one shared baseline regardless of label length. */}
          {heroStats.map((s) => (
            <div
              key={ogText(s.label)}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: 44, fontWeight: 600, letterSpacing: -1 }}>
                {ogText(s.value)}
              </span>
              <span
                style={{
                  display: "flex",
                  fontSize: 16,
                  lineHeight: 1.35,
                  letterSpacing: 1.5,
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
