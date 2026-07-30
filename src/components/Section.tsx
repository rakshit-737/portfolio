import Reveal from "./Reveal";

export default function Section({
  id,
  index,
  eyebrow,
  title,
  children,
  revealChildren = true,
}: {
  id: string;
  /** Position in the record — rendered as `01 / eyebrow`. */
  index?: number;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  /** Disable when children handle their own staggered reveal. */
  revealChildren?: boolean;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-t border-hairline">
      <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <Reveal>
          <p className="font-mono text-xs lowercase tracking-widest text-muted">
            {index !== undefined && (
              <span className="text-ink/70">
                {String(index).padStart(2, "0")}
              </span>
            )}
            {index !== undefined && " / "}
            {eyebrow}
          </p>
          <h2
            id={`${id}-title`}
            className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
          >
            {title}
          </h2>
        </Reveal>
        {revealChildren ? (
          <Reveal delayMs={90} className="mt-8">
            {children}
          </Reveal>
        ) : (
          <div className="mt-8">{children}</div>
        )}
      </div>
    </section>
  );
}
