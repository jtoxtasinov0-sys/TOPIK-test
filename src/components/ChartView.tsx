import type { ChartSpec } from "@/lib/exam";

const COLORS = ["#8b3dff", "#3a86ff", "#ff5c9a", "#19c6a7", "#ffad33", "#6a11ff"];

export function ChartView({ chart, compact }: { chart: ChartSpec; compact?: boolean }) {
  const W = 340;
  const H = compact ? 210 : 230;
  const pad = { l: 16, r: 16, t: chart.title ? 34 : 14, b: 36 };
  const series = chart.series?.length ? chart.series : [{ values: [] }];
  const all = series.flatMap((s) => s.values);
  const max = Math.max(1, ...all) * 1.15;
  const unit = chart.unit ?? "";
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const n = chart.labels.length || 1;
  const legend = series.length > 1;

  let body: React.ReactNode = null;

  if (chart.kind === "pie") {
    const vals = series[0].values;
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const cx = 92;
    const cy = pad.t + ih / 2 + 4;
    const r = Math.min(ih / 2 + 8, 78);
    const starts = vals.map((_, i) => -Math.PI / 2 + (vals.slice(0, i).reduce((a, b) => a + b, 0) / total) * Math.PI * 2);
    body = (
      <g>
        {vals.map((v, i) => {
          const a0 = starts[i];
          const a1 = a0 + (v / total) * Math.PI * 2;
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const d = `M${cx},${cy} L${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)} Z`;
          return <path key={i} d={d} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth={2} />;
        })}
        {chart.labels.map((l, i) => (
          <g key={l} transform={`translate(196, ${pad.t + 14 + i * 26})`}>
            <rect width={12} height={12} rx={3} fill={COLORS[i % COLORS.length]} />
            <text x={18} y={11} fontSize={12} fill="#160f3b" fontFamily="var(--font-kr)">
              {l} {vals[i]}
              {unit}
            </text>
          </g>
        ))}
      </g>
    );
  } else if (chart.kind === "line") {
    body = (
      <g>
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => [pad.l + 20 + i * ((iw - 40) / Math.max(1, n - 1)), pad.t + ih - (v / max) * ih] as const);
          return (
            <g key={si}>
              <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={COLORS[si]} strokeWidth={3} strokeLinejoin="round" />
              {pts.map(([x, y], i) => (
                <g key={i}>
                  <circle cx={x} cy={y} r={5} fill="#fff" stroke={COLORS[si]} strokeWidth={3} />
                  <text x={x} y={y - 11} textAnchor="middle" fontSize={12} fontWeight={700} fill="#160f3b">
                    {s.values[i]}
                    {unit}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
        {chart.labels.map((l, i) => (
          <text key={l} x={pad.l + 20 + i * ((iw - 40) / Math.max(1, n - 1))} y={H - 12} textAnchor="middle" fontSize={11.5} fill="#463f73" fontFamily="var(--font-kr)">
            {l}
          </text>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke="#ddd6fb" />
      </g>
    );
  } else {
    const groupW = iw / n;
    const bw = Math.min(26, (groupW - 10) / series.length);
    body = (
      <g>
        <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke="#ddd6fb" />
        {chart.labels.map((l, i) => {
          const gx = pad.l + i * groupW + groupW / 2 - (bw * series.length) / 2;
          return (
            <g key={l}>
              {series.map((s, si) => {
                const v = s.values[i] ?? 0;
                const h = (v / max) * ih;
                return (
                  <g key={si}>
                    <rect x={gx + si * bw} y={pad.t + ih - h} width={bw - 3} height={h} rx={5} fill={COLORS[si % COLORS.length]} />
                    <text x={gx + si * bw + (bw - 3) / 2} y={pad.t + ih - h - 5} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="#160f3b">
                      {v}
                    </text>
                  </g>
                );
              })}
              <text x={pad.l + i * groupW + groupW / 2} y={H - 12} textAnchor="middle" fontSize={11} fill="#463f73" fontFamily="var(--font-kr)">
                {l}
              </text>
            </g>
          );
        })}
      </g>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={chart.title ?? "chart"} style={{ display: "block" }}>
      {chart.title && (
        <text x={W / 2} y={18} textAnchor="middle" fontSize={13} fontWeight={700} fill="#160f3b" fontFamily="var(--font-kr)">
          {chart.title}
          {unit && chart.kind !== "pie" ? ` (단위: ${unit})` : ""}
        </text>
      )}
      {body}
      {legend && (
        <g transform={`translate(${W - pad.r - series.length * 70}, ${chart.title ? 24 : 4})`}>
          {series.map((s, i) => (
            <g key={i} transform={`translate(${i * 70}, 0)`}>
              <rect width={10} height={10} rx={2} fill={COLORS[i]} />
              <text x={14} y={9} fontSize={10.5} fill="#463f73" fontFamily="var(--font-kr)">
                {s.name}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
