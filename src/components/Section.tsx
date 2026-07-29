export default function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-t border-hairline">
      <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <p className="font-mono text-xs lowercase tracking-widest text-muted">
          {eyebrow}
        </p>
        <h2
          id={`${id}-title`}
          className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
        >
          {title}
        </h2>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
