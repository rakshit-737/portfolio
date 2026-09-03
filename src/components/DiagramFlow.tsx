import Metric from "@/components/Metric";
import type { DiagramStep } from "@/content";

/**
 * A pipeline drawn in the field's grammar: bracketed stages on a hairline,
 * the verdict stage inverted out of the ground. Horizontal where there is
 * room, vertical where there is not; the reading order never changes.
 */
export default function DiagramFlow({
  steps,
  title,
}: {
  steps: DiagramStep[];
  title: string;
}) {
  return (
    <ol
      aria-label={title}
      className="flex flex-col gap-0 lg:flex-row lg:items-stretch"
    >
      {steps.map((step, i) => (
        <li
          key={step.label}
          className="flex items-stretch gap-0 lg:flex-1 lg:flex-col"
        >
          {/* Connector into this stage (never before the first). */}
          {i > 0 && (
            <span
              aria-hidden="true"
              className="flex shrink-0 items-center justify-center lg:hidden"
              style={{ width: "2.75rem" }}
            >
              <span className="h-full w-px bg-rule" />
            </span>
          )}

          <div className="flex grow flex-col lg:grow-0">
            {/* Horizontal rail with the stage node on it. */}
            <span
              aria-hidden="true"
              className="hidden items-center lg:flex"
              style={{ height: "1.25rem" }}
            >
              <span
                className={`h-px grow ${i === 0 ? "bg-transparent" : "bg-rule"}`}
              />
              <span className="mx-1.5 block h-1.5 w-1.5 shrink-0 bg-signal" />
              <span
                className={`h-px grow ${
                  i === steps.length - 1 ? "bg-transparent" : "bg-rule"
                }`}
              />
            </span>

            <div
              className={`flex h-full flex-col justify-center border px-3.5 py-3 lg:mx-1 ${
                step.accent
                  ? "border-signal bg-signal text-ground"
                  : "border-rule"
              }`}
            >
              <p className="label">{step.label}</p>
              {step.sub && (
                <p className="mt-1.5 font-mono text-[0.6875rem] leading-snug">
                  <Metric text={step.sub} />
                </p>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
