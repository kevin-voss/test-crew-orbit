import { useMemo, type CSSProperties } from "react";
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

import { useMarketStore } from "../../stores/market";
import { computeMarkToMarketEquity } from "../../utils/portfolioEquity";
import { useChartInnerWidth } from "./useChartInnerWidth";

const panelStyle: CSSProperties = {
  position: "relative",
  border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: 6,
  padding: 8,
  background: "#faf9f7",
  flex: "1 1 280px",
  minWidth: 280,
  width: "280px",
  maxWidth: "100%",
  boxSizing: "border-box",
};

export function EquityCurveChart(): JSX.Element {
  const { ref, width } = useChartInnerWidth(320);
  const portfolioEquityHistory = useMarketStore((s) => s.portfolioEquityHistory);
  const cash = useMarketStore((s) => s.cash);
  const positions = useMarketStore((s) => s.positions);
  const prices = useMarketStore((s) => s.prices);

  const liveEquity = useMemo(
    () => computeMarkToMarketEquity(cash, positions, prices),
    [cash, positions, prices],
  );

  const chartData = useMemo(
    () => portfolioEquityHistory.map((p) => ({ t: p.t, equity: p.equity })),
    [portfolioEquityHistory],
  );

  const lastEquity =
    portfolioEquityHistory.length > 0
      ? portfolioEquityHistory[portfolioEquityHistory.length - 1]!.equity
      : liveEquity;

  const fmt = (n: number): string =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

  return (
    <div data-testid="equity-curve-chart" style={panelStyle} aria-label="Equity curve">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>Portfolio equity</span>
        <span data-testid="equity-curve-last-equity">{fmt(lastEquity)}</span>
      </div>
      {chartData.length > 0 ? (
        <div ref={ref} style={{ width: "100%", height: 200, minWidth: 0, minHeight: 200 }}>
          <LineChart
            width={width}
            height={200}
            data={chartData}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="t" tick={{ fontSize: 10 }} />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fontSize: 10 }}
              width={56}
              tickFormatter={(v: number) =>
                new Intl.NumberFormat(undefined, {
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(v)
              }
            />
            <Tooltip
              formatter={(v: number | string) => [fmt(Number(v)), "Equity"]}
              labelFormatter={(t) => `t=${t}`}
            />
            <Line
              type="monotone"
              dataKey="equity"
              stroke="#3d6e8c"
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </LineChart>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)", minHeight: 120 }}>Awaiting equity samples</div>
      )}
    </div>
  );
}
