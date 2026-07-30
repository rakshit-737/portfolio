import { benchmarkChart } from "@/content";

/**
 * Horizontal bar list of the scheduler study's per-policy trace results.
 * Server-rendered HTML — no JS. Single-series magnitude chart; the two
 * amber rows are the finding (ML result == ML-free control). Every row
 * shows name + value as real text, so the chart is its own table view.
 */
export default function BenchmarkChart() {
  const max = Math.max(...benchmarkChart.policies.map((p) => p.wait));

  return (
    <figure className="mt-10 border border-hairline bg-surface px-5 py-5 sm:px-6">
      <figcaption>
        <p className="font-mono text-xs text-ink">{benchmarkChart.title}</p>
        <p className="mt-0.5 font-mono text-[11px] text-muted">
          {benchmarkChart.unit} · {benchmarkChart.source}
        </p>
      </figcaption>

      <ul className="mt-4 space-y-1.5">
        {benchmarkChart.policies.map((p) => {
          const highlight = "highlight" in p && p.highlight;
          return (
            <li
              key={p.name}
              className="grid grid-cols-[minmax(0,14rem)_1fr_auto] items-center gap-x-3"
              title={`${p.name}: ${p.wait}`}
            >
              <span
                className={`truncate font-mono text-[11px] ${
                  highlight ? "text-ink" : "text-muted"
                }`}
              >
                {p.name}
              </span>
              <span
                aria-hidden="true"
                className={`h-2.5 ${highlight ? "bg-amber" : "bg-[#507087]"}`}
                style={{ width: `${(p.wait / max) * 100}%`, minWidth: "2px" }}
              />
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  highlight ? "font-semibold text-amber" : "text-muted"
                }`}
              >
                {p.wait.toFixed(1)}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 max-w-2xl font-mono text-[11px] leading-relaxed text-muted">
        {benchmarkChart.note}
      </p>
    </figure>
  );
}
