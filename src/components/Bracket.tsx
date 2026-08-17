import type { ReactNode } from "react";

/**
 * The world's control: a wax-seal cartouche. A doubled hairline frame —
 * an outer rule on the control itself, a 3px gutter, then an inner rule
 * around the label — with a small seal-like mark in its own chamber at
 * the leading edge. Square geometry throughout (this system has no
 * rounded corners anywhere); the "seal" is a bordered square housing a
 * small solid square, not a circle.
 *
 * Two weights — `filled` for the one primary action on a surface, outline
 * for everything else. Hover still resolves by the control swapping its
 * own ground and mark (the established local device — see DESIGN.md's
 * "Do" list), which is what keeps hover safely at full AA contrast. The
 * seal is the one place ember appears on a control: it warms from bone to
 * ember on hover AND on focus, and never at rest — "ember solely as a
 * hover/focus accent" per the redesign brief. Focus additionally carries
 * the global 2px signal outline (`:focus-visible` in globals.css), so
 * focus is never simply "hover without a pointer": the outline is
 * present only on focus, the ember seal on either.
 */

const base =
  "bracket group relative inline-flex min-h-11 items-stretch gap-[3px] " +
  "border border-signal p-[3px] transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2";

const labelWeights = {
  filled: "bg-signal text-ground group-hover:bg-transparent group-hover:text-signal",
  outline: "text-signal group-hover:bg-signal group-hover:text-ground",
} as const;

/** The seal: a small bordered chamber holding a solid square "wax" —
 *  aria-hidden and never part of the control's accessible name, which
 *  comes entirely from the label text next to it. */
function Seal({ small }: { small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`seal relative flex shrink-0 items-center justify-center border border-signal ${
        small ? "w-4" : "w-5"
      }`}
    >
      <span
        className={`bg-signal transition-colors group-hover:bg-ember group-focus-visible:bg-ember ${
          small ? "h-1.5 w-1.5" : "h-2 w-2"
        }`}
      />
    </span>
  );
}

function Label({
  children,
  small,
  weight,
}: {
  children: ReactNode;
  small?: boolean;
  weight: keyof typeof labelWeights;
}) {
  return (
    <span
      className={`cartouche-label flex flex-1 items-center justify-center gap-2 border border-signal whitespace-nowrap uppercase transition-colors ${labelWeights[weight]} ${
        small
          ? "px-3 py-2 text-xs tracking-[0.12em]"
          : "px-5 py-3 text-sm tracking-[0.14em]"
      }`}
    >
      {children}
    </span>
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
  weight?: keyof typeof labelWeights;
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
      className={`${base} ${className}`}
    >
      <Seal small={small} />
      <Label small={small} weight={weight}>
        {children}
      </Label>
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
  weight?: keyof typeof labelWeights;
  small?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${base} ${className}`}
    >
      <Seal small={small} />
      <Label small={small} weight={weight}>
        {children}
      </Label>
    </button>
  );
}

/** A disabled control still occupies its place in the record — the label
 *  keeps full contrast (the No-Dimming Rule), and only the outer ring
 *  goes dashed and muted (`rule`, not `signal`) to mark it pending. No
 *  `group` class here, so the seal's `group-hover`/`group-focus-visible`
 *  ember never has an ancestor to match — it simply never fires. */
export function BracketDisabled({
  children,
  small = false,
}: {
  children: ReactNode;
  small?: boolean;
}) {
  return (
    <span className="bracket relative inline-flex min-h-11 cursor-not-allowed items-stretch gap-[3px] border border-dashed border-rule p-[3px]">
      <span
        aria-hidden="true"
        className={`seal relative flex shrink-0 items-center justify-center border border-dashed border-rule ${
          small ? "w-4" : "w-5"
        }`}
      >
        <span className={`bg-rule ${small ? "h-1.5 w-1.5" : "h-2 w-2"}`} />
      </span>
      <span
        className={`cartouche-label flex flex-1 items-center justify-center gap-2 border border-rule uppercase text-signal ${
          small
            ? "px-3 py-2 text-xs tracking-[0.12em]"
            : "px-5 py-3 text-sm tracking-[0.14em]"
        }`}
      >
        {children}
      </span>
    </span>
  );
}
