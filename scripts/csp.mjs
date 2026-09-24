// The site's response headers — the one place they are written down.
//
// `vercel.json` must carry exactly these (scripts/check-vercel-json.mjs
// fails CI otherwise, and regenerates it with --write); the CSP test run
// (playwright.csp.config.ts, via scripts/serve-with-headers.mjs) serves
// ./out with the committed vercel.json applied; and
// scripts/check-headers.mjs asserts them against a live deploy.
//
// Why each allowance exists (vercel.json cannot carry comments, so the
// reasoning lives here and in README → Deployment):
//
// - script-src 'unsafe-inline': Next's static export emits inline
//   hydration scripts (`self.__next_f.push(...)`) and there is no server to
//   mint a per-request nonce. Mitigated by object-src 'none' (no plugin
//   execution), base-uri 'self' (no <base> hijack of relative script URLs)
//   and frame-ancestors 'none' (no clickjacking). No 'unsafe-eval': nothing
//   at runtime evaluates strings.
// - style-src 'unsafe-inline' and img-src data:: the plate LQIP is an
//   inline `style` background data URI (Plate.tsx), React SSR emits
//   `style=""` attributes, the lamp writes CSS custom properties onto each
//   act at runtime, the cursor scripts inject a <style>, and the CSS
//   cursors themselves are data: SVGs.
// - img-src https://rakshit-737.vercel.app: the favicon, icon and Apple
//   icon links are absolute URLs at `site.url` (layout.tsx explains why a
//   relative icon href cannot survive the GitHub Pages basePath). On the
//   primary that is 'self', but on a Vercel preview URL it is another
//   origin and the icons were blocked — tests/csp.spec.ts caught it. It
//   names only the site's own primary origin.
// - font-src 'self': every face is self-hosted by next/font.
// - connect-src: nothing else fetches at runtime — the GitHub provenance
//   (src/lib/github.ts) is fetched at build time and baked in.
// - media-src 'none': every sound is synthesized with Web Audio; there is
//   no audio or video file anywhere (AGENTS.md, the night archive).
// - worker-src 'none': no workers. frame-src: the captcha's iframe only.
// - The contact form (2026-09-24): hCaptcha (script, its iframe, its
//   stylesheet and its API calls) and Web3Forms (the one POST that
//   delivers the message). The captcha script is fetched only once a
//   visitor starts writing in the form; nothing else talks to either.
// - No HSTS here: Vercel already sends Strict-Transport-Security.
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.hcaptcha.com https://*.hcaptcha.com",
  "style-src 'self' 'unsafe-inline' https://*.hcaptcha.com",
  "img-src 'self' data: https://rakshit-737.vercel.app",
  "font-src 'self'",
  "connect-src 'self' https://api.web3forms.com https://*.hcaptcha.com",
  "media-src 'none'",
  "object-src 'none'",
  "frame-src https://*.hcaptcha.com",
  "worker-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

/** In the order they appear in vercel.json. */
export const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  // Redundant with frame-ancestors 'none'; kept for scanners that predate it.
  { key: "X-Frame-Options", value: "DENY" },
];

/** The vercel.json document these headers produce. */
export function vercelJson() {
  return { headers: [{ source: "/(.*)", headers: SECURITY_HEADERS }] };
}
