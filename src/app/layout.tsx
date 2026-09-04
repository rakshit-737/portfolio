import type { Metadata } from "next";
import { Chivo, Chivo_Mono, Newsreader } from "next/font/google";
import { site } from "@/content";
import Lamp from "@/components/Lamp";
import Torch from "@/components/Torch";
import "./globals.css";

// The fallback shown before Chivo Mono arrives is hand-metric-matched in
// globals.css (`Chivo Mono Metric Fallback`) rather than the one next/font
// would generate. next/font builds every fallback from `local(Arial)` with
// a `size-adjust` that matches the *average* advance width — fine for a
// proportional face, wrong for a monospace one under this site's
// uppercase, 0.19em-tracked `.label`: Arial's capitals are far wider than
// its average glyph, so a label that fits two lines in Chivo Mono ran to
// three in the fallback, and the hero's centred column jumped 12px the
// moment the real font landed (mobile CLS 0.037 against a 0.02 cap,
// measured with Lighthouse on Windows; Linux CI has no Arial and never
// saw it). A real monospace at Chivo Mono's own 0.6em advance wraps
// identically, so there is nothing left to shift.
const chivoMono = Chivo_Mono({
  variable: "--font-chivo-mono",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Chivo Mono Metric Fallback", "ui-monospace", "monospace"],
});

const chivo = Chivo({
  variable: "--font-chivo",
  subsets: ["latin"],
  display: "swap",
});

// The display voice. Optical-size axis included so the statement lines
// use Newsreader's display cut rather than its text cut.
// weight is intentionally omitted: this Next.js version only allows `axes`
// on a variable font when `weight` is absent (or "variable"). The statement
// voice is weight 400 regardless — that's set in .statement's CSS, not here.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

/** The direction contract. Emitted into the built HTML so it can be
 *  audited against the render, not just against intent. */
const CONTRACT = `
  THESIS: an engineer's record lit by a moving lamp — nothing here is asserted,
  only what is lit is proven. Refuses the dark-terminal developer portfolio and
  its opposite, the airy white résumé page.
  OWN-WORLD: three values — ground #08070A, bone signal #F2EDE3, ember #E8A33D.
  No grey. Depth comes from public-domain candlelit paintings (Wright of Derby,
  Rembrandt), each credited like a source. Newsreader carries eight display
  lines, one per act; Chivo Mono carries every number, at every size, so a
  measured quantity always reads as an instrument and never as a headline.
  STORY: this person measures things, publishes what the measurements say —
  including when they say no — and every claim here carries its proof.
  FIRST VIEWPORT: Wright of Derby's Blacksmith's Shop in near-darkness, a lamp
  finding the statement line, the hero stat rail igniting as the light crosses it.
  FORM: Lamplight — scroll and cursor drive one radial mask across eight
  acts, none scroll-jacked; only the ledger's plate wrapper is sticky, inside
  an act taller than the viewport. case files stay dense and unhurried.
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
      className={`${chivoMono.variable} ${chivo.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ground text-signal">
        <div hidden dangerouslySetInnerHTML={{ __html: `<!--${CONTRACT}-->` }} />
        <Lamp />
        <Torch />
        {children}
      </body>
    </html>
  );
}
