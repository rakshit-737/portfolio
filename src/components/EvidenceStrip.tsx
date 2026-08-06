import type { EvidenceSegment } from "@/content";

// Toned segments read as chips when the parent card (`group`) is hovered.
const toneClass: Record<string, string> = {
  pass: "text-pass rounded-xs px-1 -mx-1 transition-colors group-hover:bg-pass/10",
  fail: "text-fail rounded-xs px-1 -mx-1 transition-colors group-hover:bg-fail/10",
};

// Linked chips keep their verdict color; untoned links read steel.
// Padding grows the tap target to ≥24px without shifting layout.
const linkBase =
  "inline-block py-[5px] -my-[5px] underline underline-offset-4 transition-colors";
const linkClass: Record<string, string> = {
  pass: `${linkBase} text-pass decoration-pass/40 hover:decoration-pass`,
  fail: `${linkBase} text-fail decoration-fail/40 hover:decoration-fail`,
};

/**
 * The site's signature element: a mono metadata line styled like package
 * provenance — date · status · stack · repo · tests/CI.
 */
export default function EvidenceStrip({
  segments,
}: {
  segments: readonly EvidenceSegment[];
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-xs text-muted">
      {segments.map((seg, i) => (
        // Trailing separator stays with its segment so a wrapped line never
        // starts with a dangling "·".
        <span key={seg.label} className="flex items-center gap-x-2">
          {seg.href ? (
            <a
              href={seg.href}
              target="_blank"
              rel="noopener noreferrer"
              className={
                (seg.tone && linkClass[seg.tone]) ||
                `${linkBase} text-steel decoration-steel/40 hover:decoration-steel`
              }
            >
              {seg.label}
            </a>
          ) : seg.disabled ? (
            <span className="italic" title="Link coming soon">
              {seg.label}
            </span>
          ) : (
            <span className={seg.tone ? toneClass[seg.tone] : undefined}>
              {seg.label}
            </span>
          )}
          {i < segments.length - 1 && (
            <span aria-hidden="true" className="select-none">
              ·
            </span>
          )}
        </span>
      ))}
    </p>
  );
}
