/**
 * Build-time Google Fonts loader for ImageResponse (Satori). A legacy
 * user-agent makes the CSS endpoint return TTF sources, which Satori can
 * consume. Any failure returns null and the caller falls back to the
 * bundled default font — the OG image still renders.
 *
 * Module-internal, alongside `OG_MONO` below — nothing outside this file
 * imports either (B4/B5/B6/B8, final fix wave); `ogFonts()`/`ogFamily()`
 * are the exported surface OG card call sites actually use.
 */
async function loadGoogleFont(
  family: string,
  weight: number,
): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`,
        {
          headers: { "user-agent": "Mozilla/5.0 (Windows NT 6.1; rv:60.0)" },
          signal: AbortSignal.timeout(8000),
        },
      )
    ).text();
    const m = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/);
    if (!m) return null;
    const res = await fetch(m[1], { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

const OG_MONO = "Chivo Mono";

/** Satori font entries for the field cards (null-safe). */
export async function ogFonts() {
  const [regular, semi] = await Promise.all([
    loadGoogleFont(OG_MONO, 400),
    loadGoogleFont(OG_MONO, 600),
  ]);
  const fonts = [];
  if (regular)
    fonts.push({ name: OG_MONO, data: regular, weight: 400 as const });
  if (semi) fonts.push({ name: OG_MONO, data: semi, weight: 600 as const });
  return fonts;
}

/** The font family string to use, given what actually loaded. */
export function ogFamily(fonts: { name: string }[]) {
  return fonts.length ? OG_MONO : "monospace";
}

const SUPERSCRIPT: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁻": "-",
  "⁺": "+",
};

/**
 * Superscripts survive on the page (the browser has fonts for them) but not
 * in an OG card: Satori has no glyph for U+207B and renders a tofu box, so
 * `2.6×10⁻¹⁶` shipped as `2.6×10□¹⁶` on every share. Runs of superscript
 * characters become an unambiguous caret exponent instead.
 */
export function ogText(s: string): string {
  return s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, (run) => {
    const flat = [...run].map((ch) => SUPERSCRIPT[ch]).join("");
    return `^${flat}`;
  });
}
