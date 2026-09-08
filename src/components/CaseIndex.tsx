"use client";

import { useEffect, useState } from "react";
import { caseSections } from "@/content";

/**
 * The case file's live index (CollectUI Phase 2, ref @bemiiis — a
 * catalogue index that marks the current row as you scroll). Five
 * notches at the right edge, one per section in `caseSections` order,
 * the current one filled — the index page's act rail (`Nav.tsx`,
 * `.act-notch`), in the one other place on the site that has a fixed
 * ordered spine.
 *
 * Deliberately NOT the brief's literal reading. That asked the sticky
 * `.case-heading` column to list all five sections; but that column is
 * per-section — a `<h2>` inside each `CaseSection`'s own grid — so an
 * index there would render five times over. The case-file grammar is
 * unchanged: each section still holds its own title in its own rail.
 *
 * One IntersectionObserver, no scroll listener and no scroll-driven
 * animation, matching the index page's own scroll-spy. The links are
 * plain anchors to the section ids the palette already deep-links to, so
 * the browser does the scrolling and the hash means what it says.
 */
export default function CaseIndex() {
  const [active, setActive] = useState<string>(caseSections[0].slug);

  useEffect(() => {
    const sections = caseSections
      .map((s) => document.getElementById(s.slug))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      // The same band the index page's spy uses: a section counts as
      // current once its top third is in view.
      { rootMargin: "-20% 0px -70% 0px" },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Sections"
      data-case-index
      className="fixed top-1/2 right-1 z-40 hidden -translate-y-1/2 flex-col lg:flex"
    >
      {caseSections.map((s) => (
        <a
          key={s.slug}
          href={`#${s.slug}`}
          aria-current={active === s.slug ? "location" : undefined}
          className="act-notch"
        >
          {/* Always in the accessibility tree (opacity, never
              `display: none`), revealed on hover and focus — the act
              rail's own rule. */}
          <span className="act-notch-name label">{s.title}</span>
        </a>
      ))}
    </nav>
  );
}
