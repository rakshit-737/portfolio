import type { Metadata } from "next";
import { Chivo, Chivo_Mono } from "next/font/google";
import { site } from "@/content";
import "./globals.css";

const chivoMono = Chivo_Mono({
  variable: "--font-chivo-mono",
  subsets: ["latin"],
  display: "swap",
});

const chivo = Chivo({
  variable: "--font-chivo",
  subsets: ["latin"],
  display: "swap",
});

/** The direction contract. Emitted into the built HTML so it can be
 *  audited against the render, not just against intent. */
const CONTRACT = `
  THESIS: an engineer's record rendered as a data field — the numbers are the
  page, at the scale of the thing they measure. Refuses the dark-terminal
  developer portfolio and its opposite, the airy white résumé page.
  OWN-WORLD: absolute #000/#fff, no third value and no grey; hierarchy by scale,
  tracking and density. Hairline bar fields, sine lattices, binary matrices cut
  from real commit SHAs, bracketed controls with barcode end-caps, and inversion
  used as a structural beat rather than a filter. Monospace at every size, with a
  single stated exception: reading passages take the sans sibling, because a case
  study is read rather than scanned.
  STORY: this person measures things, publishes what the measurements say —
  including when they say no — and every claim here carries its proof.
  FIRST VIEWPORT: full-bleed bar field, sine drawn over it, name at display
  scale on the left, real measurements stacked in rails on both flanks, résumé
  as the one filled control.
  FORM: Datamatics Field — user-pinned challenger over assigned grounded
  candidate 4 (Admiralty Chart); seed fda32a15.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the
  finish review, the verdict, and DESIGN.md
`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.title,
  description: site.description,
  openGraph: {
    title: site.title,
    description: site.description,
    // Absolute URLs: metadataBase resolution drops sub-paths (GitHub Pages
    // basePath), so the full origin+path from site.url is used directly.
    url: site.url,
    siteName: "Rakshit Rameshbabu",
    type: "website",
    locale: "en_US",
    images: [
      { url: `${site.url}/og.png`, width: 1200, height: 630, alt: site.title },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
    images: [`${site.url}/og.png`],
  },
  icons: {
    apple: `${site.url}/apple-icon.png`,
  },
  alternates: { canonical: site.url },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${chivoMono.variable} ${chivo.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-field text-signal">
        <div hidden dangerouslySetInnerHTML={{ __html: `<!--${CONTRACT}-->` }} />
        {children}
      </body>
    </html>
  );
}
