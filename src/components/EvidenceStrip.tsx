import type { EvidenceSegment } from "@/content";

const toneClass: Record<string, string> = {
  pass: "text-pass",
  fail: "text-fail",
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
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted">
      {segments.map((seg, i) => (
        // Trailing separator stays with its segment so a wrapped line never
        // starts with a dangling "·".
        <span key={seg.label} className="flex items-center gap-x-2">
          {seg.href ? (
            <a
              href={seg.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-steel underline decoration-steel/40 underline-offset-4 transition-colors hover:decoration-steel"
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
