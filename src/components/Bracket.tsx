import type { ReactNode } from "react";

/**
 * The world's control: a bracketed label flanked by barcode end-caps.
 * Two weights — `filled` for the one primary action on a surface,
 * outline for everything else. Hover and focus resolve by inversion,
 * because inversion is the only emphasis this palette has.
 */

const base =
  "group inline-flex items-stretch border border-signal transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2";

const weights = {
  filled: "bg-signal text-field hover:bg-transparent hover:text-signal",
  outline: "text-signal hover:bg-signal hover:text-field",
} as const;

function Inner({ children, small }: { children: ReactNode; small?: boolean }) {
  return (
    <>
      <span aria-hidden="true" className="cap my-px w-4 shrink-0 opacity-70" />
      <span
        className={`label flex items-center gap-2 whitespace-nowrap ${
          small ? "px-3 py-2" : "px-4 py-3"
        }`}
      >
        {children}
      </span>
      <span aria-hidden="true" className="cap my-px w-4 shrink-0 opacity-70" />
    </>
  );
}

export function BracketLink({
  href,
  children,
  weight = "outline",
  small = false,
  external = false,
  download = false,
  className = "",
}: {
  href: string;
  children: ReactNode;
  weight?: keyof typeof weights;
  small?: boolean;
  external?: boolean;
  download?: boolean;
  className?: string;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...(download ? { download: true } : {})}
      className={`${base} ${weights[weight]} ${className}`}
    >
      <Inner small={small}>{children}</Inner>
    </a>
  );
}

export function BracketButton({
  children,
  onClick,
  weight = "outline",
  small = false,
  ariaLabel,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  weight?: keyof typeof weights;
  small?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${base} ${weights[weight]} ${className}`}
    >
      <Inner small={small}>{children}</Inner>
    </button>
  );
}

/** A disabled control still occupies its place in the record. */
export function BracketDisabled({
  children,
  small = false,
}: {
  children: ReactNode;
  small?: boolean;
}) {
  return (
    <span className="inline-flex cursor-not-allowed items-stretch border border-dashed border-rule">
      <Inner small={small}>{children}</Inner>
    </span>
  );
}
