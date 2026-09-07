import Ignite from "@/components/Ignite";

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
  ignite = false,
}: {
  items: RailItem[];
  align?: "left" | "right";
  className?: string;
  ignite?: boolean;
}) {
  return (
    <dl
      className={`space-y-4 ${align === "right" ? "text-right" : ""} ${className}`}
    >
      {items.map((item) => (
        <div key={item.label}>
          <dt className="label leading-[1.45]">{item.label}</dt>
          {ignite ? (
            <Ignite
              as="dd"
              value={item.value}
              href={item.href}
              className="font-mono text-2xl leading-none font-semibold tracking-tight tabular-nums sm:text-3xl"
            />
          ) : (
            <dd className="mt-1 font-mono text-sm leading-none tracking-tight tabular-nums sm:text-base">
              {item.href ? (
                /* A leading-none text-sm link is a ~14px target. Same
                   WCAG 2.5.8 device as Provenance's anchors — block
                   padding with a compensating negative margin, inline-
                   block so the padding takes inside the block dd — lifts
                   the hit area past the 24px floor without moving the
                   printed value. */
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="-my-1.5 inline-block py-1.5 underline decoration-rule underline-offset-4 transition-colors hover:decoration-signal"
                >
                  {item.value}
                </a>
              ) : (
                item.value
              )}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
