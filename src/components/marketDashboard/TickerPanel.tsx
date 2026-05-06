import { useMarketStore } from "../../stores/market";

export function TickerPanel(): JSX.Element {
  const prices = useMarketStore((s) => s.prices);
  const selected = useMarketStore((s) => s.selectedTicker);

  return (
    <section data-testid="ticker-panel" aria-label="Ticker">
      <pre data-testid="ticker-prices">{JSON.stringify(prices, null, 0)}</pre>
      {selected != null ? <span data-testid="ticker-selected">{selected}</span> : null}
    </section>
  );
}
