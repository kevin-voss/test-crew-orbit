import { useMarketStore } from "../../stores/market";

/** Active symbol: persisted selection when it has a price, else earliest priced key lexicographically. */
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

export function TickerPanel(): JSX.Element {
  const selectedTicker = useMarketStore((s) => s.selectedTicker);
  const prices = useMarketStore((s) => s.prices);
  const ticker = resolveTickerSymbol(selectedTicker, prices);
  const price = ticker != null ? prices[ticker] : undefined;

  return (
    <section data-testid="ticker-panel" aria-label="Ticker">
      {ticker != null && price != null ? (
        <>
          <span data-testid="ticker-symbol">{ticker}</span>
          <span data-testid="ticker-price">{price}</span>
        </>
      ) : (
        <span data-testid="ticker-empty">No quote</span>
      )}
    </section>
  );
}
