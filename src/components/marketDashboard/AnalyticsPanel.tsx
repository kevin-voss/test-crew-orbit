import { useMarketStore } from "../../stores/market";

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

export function AnalyticsPanel(): JSX.Element {
  const selectedTicker = useMarketStore((s) => s.selectedTicker);
  const prices = useMarketStore((s) => s.prices);
  const marketHistory = useMarketStore((s) => s.marketHistory);

  const ticker = resolveTickerSymbol(selectedTicker, prices);
  const series = ticker != null ? (marketHistory[ticker] ?? []) : [];
  const lastChange =
    series.length >= 2
      ? series[series.length - 1]!.price - series[series.length - 2]!.price
      : null;

  return (
    <section data-testid="analytics-panel" aria-label="Analytics">
      <span data-testid="analytics-history-count">{series.length}</span>
      <span data-testid="analytics-last-price-change">{lastChange != null ? lastChange : ""}</span>
      {ticker != null ? <span data-testid="analytics-symbol">{ticker}</span> : null}
    </section>
  );
}
