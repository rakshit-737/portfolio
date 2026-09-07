import { Fragment, type ReactNode } from "react";

/** Unicode superscript characters → the plain characters a `<sup>`
 *  carries. `⁻` becomes a real minus sign (U+2212, which Chivo Mono does
 *  ship), not a hyphen. */
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
  "⁻": "−",
  "⁺": "+",
};
const SUP_RUN = /([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+)/g;

/**
 * A run of Unicode superscript characters renders as one `<sup>` of plain
 * digits. Chivo Mono (and Chivo) carry ¹²³ and nothing else from the
 * superscript block — left as raw characters, every exponent past ³ fell
 * through to the OS's fallback monospace at a visibly different size and
 * weight (the "⁶" of `p = 2.6×10⁻¹⁶`, the scheduler's own headline
 * number). A `<sup>` keeps the whole exponent in the brand font at every
 * size. content.ts keeps writing the Unicode form: it stays readable as
 * plain text there and in llms.txt, and the OG cards already flatten it
 * through `ogText()`.
 *
 * One `<sup>`, one text node, no twin. A `<sup>` reads flat to a screen
 * reader ("2.6 times 10 minus 16"), and an earlier fix paired it with an
 * sr-only caret rendering — which put a SECOND copy of the exponent in
 * the DOM, the exact doubled-text regression Ignite.tsx's history exists
 * to forbid: copy yielded "…10−16^−16" and find-in-page matched the
 * exponent twice (reverted 2026-09-07). The exactly-once contract
 * (DESIGN.md, Number tier) outranks the flat announcement; amending that
 * contract is the owner's call, not a rendering trick's.
 */
function superscripts(text: string, keyPrefix: string): ReactNode[] {
  return text.split(SUP_RUN).map((part, i) => {
    if (i % 2 === 0) {
      return <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>;
    }
    const plain = [...part].map((ch) => SUPERSCRIPT[ch]).join("");
    return <sup key={`${keyPrefix}-${i}`}>{plain}</sup>;
  });
}

/**
 * Renders a copy string from content.ts. `**metric**` marks the single
 * strongest number in a bullet — a bold mono chip (`.metric`), never
 * ember. Runs of Unicode superscript characters become `<sup>` (above).
 */
export default function Metric({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="metric">
            {superscripts(part, `m${i}`)}
          </strong>
        ) : (
          <Fragment key={i}>{superscripts(part, `t${i}`)}</Fragment>
        ),
      )}
    </>
  );
}
