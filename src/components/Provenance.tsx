import { Check, X } from "lucide-react";
import type { EvidenceSegment } from "@/content";

/**
 * The provenance line. Every record on this site carries one: date,
 * status, stack, repo, and — when the build could reach GitHub — the head
 * commit and CI conclusion, each deep-linked to its own proof.
 *
 * There is no colour here to lean on, so a verified outcome is stated by
 * inversion (a filled chip) and a failing one by an outlined chip with a
 * drawn mark. Nothing is signalled by hue alone.
 */
export default function Provenance({
  segments,
  className = "",
}: {
  segments: EvidenceSegment[];
  className?: string;
}) {
  if (segments.length === 0) return null;

  return (
    <ul className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
      {segments.map((s, i) => {
        const chip = s.tone === "pass" || s.tone === "fail";
        // Padding, not font size: a pass/fail chip is the one provenance
        // token styled as a real badge (background or outline, not just an
        // underline), so it's the one worth nudging toward a real tap
        // target. Not the full 44px (WCAG 2.5.5, AAA) — these sit inline in
        // a dense receipt line with 12px gaps between neighbours (see the
        // `gap-x-3` on the list above); a 44px-tall badge in a 12px gap
        // would overlap its neighbours' hit areas, mis-tapping the wrong
        // record. py-1.5 clears the 24px WCAG 2.5.8 (AA) floor instead,
        // which the gap between chips can actually accommodate.
        const content = (
          <span
            className={
              chip
                ? `inline-flex items-center gap-1.5 px-1.5 py-1.5 ${
                    s.tone === "pass"
                      ? "bg-signal text-ground"
                      : "border border-signal"
                  }`
                : undefined
            }
          >
            {s.tone === "pass" && (
              <Check size={11} strokeWidth={2.5} aria-hidden="true" />
            )}
            {s.tone === "fail" && (
              <X size={11} strokeWidth={2.5} aria-hidden="true" />
            )}
            {s.label}
          </span>
        );

        return (
          /* `.label`'s own 1.1 leading is tuned for one-line eyebrows; a
             wrapped segment (the plate credit, a signatory's full role)
             sets its lines nearly touching at 390px. The looser box is
             the same one Rail's dt already ships — never on `.label`
             itself, which chips, nav and single-line eyebrows share. */
          <li
            key={`${s.label}-${i}`}
            className="label flex items-center gap-3 leading-[1.45] tracking-[0.13em] normal-case"
          >
            {/* The `s.disabled` branch this used to carry (a dashed-
                outline "pending" chip) was deleted here (B3, final fix
                wave): nothing in content.ts sets `disabled: true` any
                more, so it had gone unreachable. Re-add it, alongside
                `BracketDisabled` in Bracket.tsx, if a future evidence
                segment genuinely needs a pending state — see
                `EvidenceSegment.disabled`'s own comment in content.ts. */}
            {s.href ? (
              /* A plain anchor (repo, head SHA, verify) is a ~12px-tall
                 target; the same WCAG 2.5.8 device as the chip above —
                 block padding with a compensating negative margin, legal
                 here because the li's flex blockifies the anchor — lifts
                 it past the 24px floor without moving the printed line. A
                 chip anchor is exempt: its span already carries the
                 py-1.5 that clears the floor, and doubling it would
                 overlap neighbouring hit areas across the 12px gaps. */
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`underline decoration-rule underline-offset-4 transition-colors hover:decoration-signal ${
                  chip ? "" : "-my-1.5 py-1.5"
                }`}
              >
                {content}
              </a>
            ) : (
              content
            )}
            {/* The rule trails its item rather than leading the next one:
                a leading separator orphans onto the start of every wrapped
                line, which reads as broken markup on narrow widths. It
                renders at every width — hidden below sm it left wrapped
                mobile segments merging into one run while a "·" inside a
                segment's own label still showed. A trailing rule at a
                line break is quiet, which is acceptable; no boundary at
                all is not. */}
            {i < segments.length - 1 && (
              <span aria-hidden="true" className="h-3 w-px bg-rule" />
            )}
          </li>
        );
      })}
    </ul>
  );
}
