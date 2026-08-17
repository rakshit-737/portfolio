"use client";

import { useEffect, useRef } from "react";
import { benchmarkChart } from "@/content";

/**
 * The finding, drawn: mean wait by scheduling policy on the SDSC SP2 trace.
 * The two marked rows are the result — the XGBoost scheduler and its own
 * ML-free control land on the same number. They're highlighted by bar
 * weight alone (full-opacity `bg-signal` vs. every other row's 0.55) —
 * deliberately not `.ignite`. This table sits in the widened `.scrim-wide`
 * reading column, near its right edge (measured directly against the
 * built page: the value column centres at x≈1196px against the lamp's
 * pinned rest x of 666px, a 530px gap the lamp's own maximum lit radius,
 * 352px, can never close, at any scroll position on either viewport) — a
 * class that can only ever render bone-with-JS or ember-without is a
 * standing contradiction, not emphasis, so it does not belong on these
 * values. See DESIGN.md's Benchmark Chart section.
 *
 * Bars grow once, on approach, as part of the page's single motion budget.
 */
export default function BenchmarkChart() {
  const ref = useRef<HTMLElement>(null);

  // The grown flag is a DOM attribute rather than React state: this is a
  // one-shot presentational transition, so it never needs to re-render.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const grow = () => {
      el.dataset.grown = "true";
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      grow();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          grow();
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const max = Math.max(...benchmarkChart.policies.map((p) => p.wait));
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <figure ref={ref} data-grown="false" className="mt-12">
      <figcaption className="max-w-2xl">
        <h3 className="font-mono text-lg leading-tight font-semibold tracking-tight sm:text-xl">
          {benchmarkChart.title}
        </h3>
        <p className="label mt-3 normal-case">
          {benchmarkChart.unit} · source: {benchmarkChart.source}
        </p>
      </figcaption>

      {/* Axis */}
      <div
        aria-hidden="true"
        className="relative mt-8 hidden h-4 border-b border-rule sm:ml-[15rem] sm:block"
      >
        {ticks.map((t) => (
          <span
            key={t}
            className="label absolute bottom-1 -translate-x-1/2"
            style={{ left: `${t * 100}%` }}
          >
            {Math.round(t * max)}
          </span>
        ))}
      </div>

      <table className="mt-2 w-full border-collapse">
        <caption className="sr-only">
          {benchmarkChart.title} — {benchmarkChart.unit}
        </caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Policy</th>
            <th scope="col">Mean wait</th>
          </tr>
        </thead>
        <tbody>
          {benchmarkChart.policies.map((p, i) => (
            <tr key={p.name} className="border-b border-rule-soft">
              <th
                scope="row"
                className="w-full py-2.5 pr-4 pl-2 text-left font-mono text-[0.8125rem] leading-tight font-normal sm:w-[15rem] sm:min-w-[15rem]"
              >
                {p.name}
              </th>
              <td className="py-2.5 pr-2 align-middle sm:w-full">
                <span className="flex items-center gap-3">
                  <span className="relative block h-2.5 grow bg-signal/12">
                    <span
                      className={`bar-grow absolute inset-y-0 left-0 block ${p.highlight ? "bg-signal" : "bg-signal/55"}`}
                      style={
                        {
                          width: `${(p.wait / max) * 100}%`,
                          "--i": i,
                        } as React.CSSProperties
                      }
                    />
                  </span>
                  <span className="w-14 shrink-0 text-right font-mono text-sm tabular-nums">
                    {p.wait.toFixed(1)}
                  </span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="prose-field mt-6 text-sm">
        {benchmarkChart.note}
      </p>
    </figure>
  );
}
