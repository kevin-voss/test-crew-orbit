import { useMemo, type CSSProperties } from "react";
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

import { useMarketStore } from "../../stores/market";
import { PRICE_CHART_POINT_CAP } from "./chartConstants";
import { resolveSelectedChartTicker } from "./resolveDisplayedTicker";
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

export function SelectedTickerPriceChart(): JSX.Element {
  const { ref, width } = useChartInnerWidth(320);
  const selectedTicker = useMarketStore((s) => s.selectedTicker);
  const prices = useMarketStore((s) => s.prices);
  const marketHistory = useMarketStore((s) => s.marketHistory);

  const ticker = resolveSelectedChartTicker(selectedTicker, prices);
  const fullSeries = ticker != null ? (marketHistory[ticker] ?? []) : [];
  const series = useMemo(
    () => fullSeries.slice(-PRICE_CHART_POINT_CAP),
    [fullSeries],
  );

  const chartData = useMemo(() => series.map((p) => ({ t: p.t, price: p.price })), [series]);

  const lastPrice = series.length > 0 ? series[series.length - 1]!.price : null;
  const empty = ticker == null || series.length === 0;

  if (empty) {
    return (
      <div
        data-testid="selected-ticker-price-chart-empty-state"
        style={panelStyle}
        aria-label="Selected stock price chart"
      >
        <span style={{ fontSize: 12, color: "rgba(0,0,0,0.55)" }}>No price history</span>
      </div>
    );
  }

  return (
    <div
      data-testid="selected-ticker-price-chart"
      style={panelStyle}
      aria-label="Selected stock price chart"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span data-testid="selected-ticker-price-chart-active-symbol" style={{ fontWeight: 600 }}>
          {ticker}
        </span>
        <span data-testid="selected-ticker-price-chart-last-price">{String(lastPrice)}</span>
      </div>
      <span
        data-testid="selected-ticker-price-chart-rendered-count"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {String(series.length)}
      </span>
      <div
        ref={ref}
        style={{ width: "100%", height: 200, minWidth: 0, minHeight: 200 }}
      >
        <LineChart
          width={width}
          height={200}
          data={chartData}
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey="t" tick={{ fontSize: 10 }} />
          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} width={48} />
          <Tooltip
            formatter={(v: number | string) => [Number(v).toFixed(4), "Price"]}
            labelFormatter={(t) => `t=${t}`}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#1a5f4a"
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </LineChart>
      </div>
      <div style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
        {series.map((p) => (
          <span
            key={`${p.t}-${p.price}`}
            data-testid={`price-chart-series-point-t-${p.t}`}
            data-t={p.t}
          />
        ))}
      </div>
    </div>
  );
}
