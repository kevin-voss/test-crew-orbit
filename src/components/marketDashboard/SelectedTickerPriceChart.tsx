import { useMemo, type CSSProperties } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useMarketStore } from "../../stores/market";
import { PRICE_CHART_POINT_CAP } from "./chartConstants";
import { resolveDisplayedTicker, resolveSelectedChartTicker } from "./resolveDisplayedTicker";
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

const stripOuterStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,
  minHeight: 96,
  boxSizing: "border-box",
};

export type SelectedTickerPriceChartVariant = "dashboard" | "strip";

export type SelectedTickerPriceChartProps = {
  /** Dashboard card vs compact strip (ChartStripPanel). Strip matches headline ticker fallback; dashboard stays selection-only (PriceHistorySnippet alignment). */
  variant?: SelectedTickerPriceChartVariant;
};

export function SelectedTickerPriceChart({
  variant = "dashboard",
}: SelectedTickerPriceChartProps): JSX.Element {
  const fallbackWidth = variant === "strip" ? 200 : 320;
  const { ref: chartMeasureRef, width: measuredChartWidth } = useChartInnerWidth(fallbackWidth);
  const responsiveWidth = Math.max(measuredChartWidth, fallbackWidth);

  const selectedTicker = useMarketStore((s) => s.selectedTicker);
  const prices = useMarketStore((s) => s.prices);
  const marketHistory = useMarketStore((s) => s.marketHistory);

  const ticker =
    variant === "strip"
      ? resolveDisplayedTicker(selectedTicker, prices)
      : resolveSelectedChartTicker(selectedTicker, prices);

  const fullSeries = ticker != null ? (marketHistory[ticker] ?? []) : [];

  const series = useMemo(() => {
    const tail = fullSeries.slice(-PRICE_CHART_POINT_CAP);
    const finite = tail.filter(
      (p) => Number.isFinite(p.price) && Number.isFinite(p.t),
    );
    return [...finite].sort((a, b) => a.t - b.t);
  }, [fullSeries]);

  const chartData = useMemo(
    () => series.map((p) => ({ t: p.t, price: p.price })),
    [series],
  );

  const lastPrice = series.length > 0 ? series[series.length - 1]!.price : null;

  const emptyCopy =
    variant === "strip"
      ? "No series"
      : selectedTicker == null
        ? "Select a ticker"
        : ticker == null
          ? "Select a ticker"
          : `No history for ${selectedTicker}`;

  const empty =
    ticker == null ||
    series.length === 0 ||
    lastPrice == null ||
    !Number.isFinite(lastPrice);

  const chartHeight = variant === "strip" ? 72 : 200;

  const emptyTestId =
    variant === "strip"
      ? "chart-strip-empty"
      : "selected-ticker-price-chart-empty-state";

  const chartRootTestId =
    variant === "strip" ? "chart-strip-price-chart" : "selected-ticker-price-chart";

  const headerSymbolTestId =
    variant === "strip" ? "chart-strip-symbol" : "selected-ticker-price-chart-active-symbol";

  const lastPriceTestId =
    variant === "strip"
      ? "chart-strip-last-price"
      : "selected-ticker-price-chart-last-price";

  const renderedCountTestId =
    variant === "strip"
      ? "chart-strip-point-count"
      : "selected-ticker-price-chart-rendered-count";

  const chartHostTestId = variant === "strip" ? "chart-strip-svg" : undefined;

  const filledChart =
    empty ? null : (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span data-testid={headerSymbolTestId} style={{ fontWeight: 600 }}>
          {ticker}
        </span>
        <span data-testid={lastPriceTestId}>{String(lastPrice)}</span>
      </div>
      <span
        data-testid={renderedCountTestId}
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
        ref={chartMeasureRef}
        data-testid={chartHostTestId}
        role="img"
        aria-label={`${ticker} price chart`}
        style={{
          width: "100%",
          height: chartHeight,
          minWidth: 0,
          minHeight: chartHeight,
        }}
      >
        <ResponsiveContainer width={responsiveWidth} height={chartHeight}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="t" tick={{ fontSize: variant === "strip" ? 9 : 10 }} />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: variant === "strip" ? 9 : 10 }} width={variant === "strip" ? 40 : 48} />
            <Tooltip
              formatter={(v: number | string) => [Number(v).toFixed(4), "Price"]}
              labelFormatter={(t) => `t=${t}`}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#1a5f4a"
              dot={false}
              strokeWidth={variant === "strip" ? 1 : 1.5}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {variant === "dashboard" ? (
        <div style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
          {series.map((p) => (
            <span
              key={`${p.t}-${p.price}`}
              data-testid={`price-chart-series-point-t-${p.t}`}
              data-t={p.t}
            />
          ))}
        </div>
      ) : null}
    </>
    );

  return (
    <div
      data-testid={chartRootTestId}
      style={variant === "strip" ? stripOuterStyle : panelStyle}
      aria-label="Selected stock price chart"
    >
      {empty ? (
        <span style={{ fontSize: 12, color: "rgba(0,0,0,0.55)" }} data-testid={emptyTestId}>
          {emptyCopy}
        </span>
      ) : (
        filledChart
      )}
    </div>
  );
}
