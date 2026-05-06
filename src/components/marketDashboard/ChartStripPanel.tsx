import { useMarketStore } from "../../stores/market";

/** Max points rendered in viewBox scaling (no animations; redraws from store ticks only). */
const VISIBLE_POINTS = 48;

/** Matches Ticker headline symbol precedence (selection with price, else first priced key). */
function resolveTickerSymbol(
  selectedTicker: string | null,
  prices: Record<string, number>,
): string | null {
  if (
    selectedTicker != null &&
    typeof prices[selectedTicker] === "number" &&
    Number.isFinite(prices[selectedTicker])
  ) {
    return selectedTicker;
  }
  for (const k of Object.keys(prices).sort()) {
    const p = prices[k];
    if (typeof p === "number" && Number.isFinite(p)) return k;
  }
  return null;
}

function scaledPolyline(series: readonly { price: number }[]): string {
  const slice = series.slice(-VISIBLE_POINTS);
  if (slice.length === 0) return "";
  const values = slice.map((p) => p.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max === min ? 1 : max - min;
  const denom = slice.length <= 1 ? 1 : slice.length - 1;
  return slice
    .map((pt, i) => {
      const x = (i / denom) * 100;
      const y = 40 - ((pt.price - min) / spread) * 36 - 2;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function ChartStripPanel(): JSX.Element {
  const selectedTicker = useMarketStore((s) => s.selectedTicker);
  const prices = useMarketStore((s) => s.prices);
  const marketHistory = useMarketStore((s) => s.marketHistory);

  const ticker = resolveTickerSymbol(selectedTicker, prices);
  const series = ticker != null ? (marketHistory[ticker] ?? []) : [];
  const points = scaledPolyline(series);

  return (
    <section data-testid="chart-strip-panel" aria-label="Chart history">
      {ticker != null ? (
        <>
          <span data-testid="chart-strip-symbol">{ticker}</span>
          <svg
            data-testid="chart-strip-svg"
            role="img"
            aria-label={`${ticker} history strip`}
            viewBox="0 0 100 40"
            width={200}
            height={48}
          >
            {points.length > 0 ? (
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth={0.75}
                points={points}
              />
            ) : (
              <text x={4} y={22} fontSize={6}>
                —
              </text>
            )}
          </svg>
          <span data-testid="chart-strip-point-count">{series.length}</span>
        </>
      ) : (
        <span data-testid="chart-strip-empty">No series</span>
      )}
    </section>
  );
}
