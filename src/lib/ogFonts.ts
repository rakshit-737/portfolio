/**
 * Build-time Google Fonts loader for ImageResponse (Satori). A legacy
 * user-agent makes the CSS endpoint return TTF sources, which Satori can
 * consume. Any failure returns null and the caller falls back to the
 * bundled default font — the OG image still renders.
 */
export async function loadGoogleFont(
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

/** Satori font entries for the evidence-file OG cards (null-safe). */
export async function ogFonts() {
  const [mono, monoSemi, display] = await Promise.all([
    loadGoogleFont("IBM Plex Mono", 400),
    loadGoogleFont("IBM Plex Mono", 600),
    loadGoogleFont("Archivo", 700),
  ]);
  const fonts = [];
  if (mono)
    fonts.push({ name: "IBM Plex Mono", data: mono, weight: 400 as const });
  if (monoSemi)
    fonts.push({ name: "IBM Plex Mono", data: monoSemi, weight: 600 as const });
  if (display)
    fonts.push({ name: "Archivo", data: display, weight: 700 as const });
  return fonts;
}
