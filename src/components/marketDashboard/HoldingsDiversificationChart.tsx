import { useMemo, type CSSProperties } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

import { useMarketStore } from "../../stores/market";
import { useChartInnerWidth } from "./useChartInnerWidth";

const COLORS = ["#1a5f4a", "#3d6e8c", "#c45c3e", "#6b4f9a", "#b8860b", "#2c5282"];

const panelStyle: CSSProperties = {
  position: "relative",
  border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: 6,
  padding: 8,
  background: "#faf9f7",
  minWidth: 0,
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};

type SliceRow = { name: string; value: number };

export function HoldingsDiversificationChart(): JSX.Element {
  const { ref, width } = useChartInnerWidth(280);
  const positions = useMarketStore((s) => s.positions);
  const prices = useMarketStore((s) => s.prices);

  const pieData = useMemo(() => {
    const rows: SliceRow[] = [];
    for (const [ticker, pos] of Object.entries(positions)) {
      const px = prices[ticker];
      if (typeof px !== "number" || !Number.isFinite(px) || pos.shares <= 0) continue;
      const value = pos.shares * px;
      if (!Number.isFinite(value) || value <= 0) continue;
      rows.push({ name: ticker, value });
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [positions, prices]);

  const total = pieData.reduce((s, r) => s + r.value, 0);

  return (
    <div data-testid="holdings-diversification-chart" style={panelStyle} aria-label="Holdings diversification">
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Holdings by value</div>
      {pieData.length > 0 && total > 0 ? (
        <>
          <div ref={ref} style={{ width: "100%", height: 200, minWidth: 0, minHeight: 200 }}>
            <PieChart width={width} height={200}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={1}
                  isAnimationActive={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]!} stroke="rgba(0,0,0,0.06)" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) =>
                    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(v)
                  }
                />
              </PieChart>
          </div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "8px 0 0",
              fontSize: 12,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {pieData.map((row) => {
              const pct = (row.value / total) * 100;
              const label = pct.toFixed(1);
              return (
                <li key={row.name}>
                  <span style={{ fontWeight: 600 }}>{row.name}</span>{" "}
                  <span data-testid={`holdings-diversification-slice-pct-${row.name}`}>{label}%</span>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)" }}>No valued holdings</div>
      )}
    </div>
  );
}
