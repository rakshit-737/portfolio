import { withBase } from "@/lib/base";

/**
 * Scroll the index to a section — the palette's jump, shared with the
 * terminal. Case-file pages don't carry the index's act sections, so there
 * the tab navigates to the index anchor instead; `replaceState` never lands
 * on a hash with nothing behind it. `scroll-behavior: smooth` was dropped
 * from <html> so it can't fight the lamp's scroll mapping — restored
 * per-call here, and never under reduced motion.
 */
export function jumpToSection(id: string): void {
  const el = document.getElementById(id);
  if (!el) {
    window.location.href = withBase(`/#${id}`);
    return;
  }
  el.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "start",
  });
  history.replaceState(null, "", `#${id}`);
}
