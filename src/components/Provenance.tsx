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
        const content = (
          <span
            className={
              chip
                ? `inline-flex items-center gap-1.5 px-1.5 py-0.5 ${
                    s.tone === "pass"
                      ? "bg-signal text-field"
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
          <li
            key={`${s.label}-${i}`}
            className="label flex items-center gap-3 tracking-[0.13em] normal-case"
          >
            {s.href ? (
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-rule underline-offset-4 transition-colors hover:decoration-signal"
              >
                {content}
              </a>
            ) : s.disabled ? (
              // Not dimmed: a pending item still has to be readable, so it
              // is marked by a dashed outline rather than by low contrast.
              <span className="border border-dashed border-rule px-1.5 py-0.5">
                {s.label}
              </span>
            ) : (
              content
            )}
            {/* The rule trails its item rather than leading the next one:
                a leading separator orphans onto the start of every wrapped
                line, which reads as broken markup on narrow widths. */}
            {i < segments.length - 1 && (
              <span
                aria-hidden="true"
                className="hidden h-3 w-px bg-rule sm:block"
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
