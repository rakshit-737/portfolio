/** Prefix for static assets when the site is served under a sub-path
 *  (GitHub Pages). Inlined at build time from NEXT_PUBLIC_BASE_PATH.
 *  Module-internal — nothing outside this file imports it (B4/B5/B6/B8,
 *  final fix wave); every call site uses `withBase()` below instead. */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const withBase = (path: string) => `${BASE_PATH}${path}`;
