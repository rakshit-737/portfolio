export interface RailItem {
  value: string;
  label: string;
  href?: string;
}

/**
 * A rail of real measurements. Every value here is sourced from
 * `src/content.ts` or from build-time GitHub data — the field behind it is
 * a graphic, but a rail is always a quantity someone can check.
 */
export default function Rail({
  items,
  align = "left",
  className = "",
}: {
  items: RailItem[];
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <dl
      className={`space-y-4 ${align === "right" ? "text-right" : ""} ${className}`}
    >
      {items.map((item) => (
        <div key={item.label}>
          <dt className="label leading-[1.45]">{item.label}</dt>
          <dd className="mt-1 font-mono text-sm leading-none tracking-tight tabular-nums sm:text-base">
            {item.href ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-rule underline-offset-4 transition-colors hover:decoration-signal"
              >
                {item.value}
              </a>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
