import { benchmarkChart } from "@/content";

/**
 * Horizontal bar list of the scheduler study's per-policy trace results.
 * Server-rendered HTML — no JS. Single-series magnitude chart; the two
 * amber rows are the finding (ML result == ML-free control). Bars grow on
 * first reveal (CSS keyed off the ancestor Reveal's data-reveal state;
 * reduced motion renders instantly). A visually-hidden table carries the
 * data for screen readers; the visual list is aria-hidden.
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

      {/* Screen-reader data table — the chart itself is presentation. */}
      <table className="sr-only">
        <caption>{benchmarkChart.title}</caption>
        <thead>
          <tr>
            <th scope="col">Policy</th>
            <th scope="col">Mean wait ({benchmarkChart.unit})</th>
          </tr>
        </thead>
        <tbody>
          {benchmarkChart.policies.map((p) => (
            <tr key={p.name}>
              <th scope="row">
                {p.name}
                {p.highlight ? " (tie — the finding)" : ""}
              </th>
              <td>{p.wait.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul aria-hidden="true" className="mt-4 space-y-1.5">
        {benchmarkChart.policies.map((p, i) => {
          const highlight = p.highlight;
          return (
            <li
              key={p.name}
              className={`-mx-2 grid grid-cols-[minmax(0,8.5rem)_1fr_auto] items-center gap-x-3 px-2 py-px sm:grid-cols-[minmax(0,14rem)_1fr_auto] ${
                highlight ? "bg-amber/5" : ""
              }`}
              title={`${p.name}: ${p.wait}`}
            >
              <span
                className={`truncate font-mono text-[11px] ${
                  highlight ? "font-medium text-ink" : "text-muted"
                }`}
              >
                {p.name}
              </span>
              <span
                className={`bench-bar h-2.5 ${highlight ? "bg-amber" : "bg-bar"}`}
                style={
                  {
                    width: `${(p.wait / max) * 100}%`,
                    minWidth: "2px",
                    "--bar-i": i,
                  } as React.CSSProperties
                }
              />
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  highlight ? "font-semibold text-amber" : "text-muted"
                }`}
              >
                {p.wait.toFixed(1)}
                {highlight && (
                  <span className="ml-1.5 border border-amber/40 px-1 py-px text-[9px] text-amber">
                    tie
                  </span>
                )}
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
