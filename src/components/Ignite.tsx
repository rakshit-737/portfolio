import Metric from "@/components/Metric";

/**
 * A measurement that ignites: bone at rest, ember once the lamp's pool
 * actually reaches it. One element, one text node — the ignition is a
 * `color` transition on the element itself (`.ignite`, globals.css),
 * driven by Lamp.tsx toggling `.is-lit` every rAF tick. With no JS, or
 * under reduced motion, `data-lamp="on"` is never set and the base rule
 * simply renders ember — the fully-lit default.
 *
 * It used to be two copies of the value: the bone text plus an ember twin
 * laid over it — first a `::after` pseudo-element carrying
 * `content: attr(data-value)`, then briefly a real `aria-hidden` element.
 * A pseudo-element can't hold markup, so a value with an exponent
 * (`p = 2.6×10⁻¹⁶`) had to ship as raw Unicode superscript characters, and
 * Chivo Mono has no glyphs for ⁰ or ⁴–⁹ — the "⁶" fell back to the OS
 * monospace at a different size and weight, in the site's own headline
 * number. A DOM twin fixed the glyph but doubled the text: find-in-page hit
 * "9.07" twice, a copy took both, a text locator resolved to two elements,
 * and Chromium exposed "9.07 9.07" as the accessible value (the pseudo-
 * element had done that too). A colour transition on the one real element
 * needs no copy at all, so `Metric` renders the exponent as `<sup>` in the
 * brand font and the value exists exactly once.
 */
export default function Ignite({
  value,
  href,
  as: Tag = "span",
  className = "",
}: {
  /** The measurement, verbatim from content.ts — `Metric` renders its
   *  `**` and superscript conventions. */
  value: string;
  /** Optional deep link (a rail value that is also a receipt). */
  href?: string;
  as?: "span" | "dd";
  className?: string;
}) {
  const text = <Metric text={value} />;
  return (
    <Tag className={`ignite ${className}`.trim()}>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-rule underline-offset-4 transition-colors hover:decoration-signal"
        >
          {text}
        </a>
      ) : (
        text
      )}
    </Tag>
  );
}
