import { useMarketStore } from "../stores/market";

export function MarketTickerStrip(): JSX.Element {
  const prices = useMarketStore((s) => s.prices);
  const selectedTicker = useMarketStore((s) => s.selectedTicker);

  const entries = Object.entries(prices).sort(([a], [b]) => a.localeCompare(b));

  return (
    <section aria-label="Market ticker">
      <div data-testid="ticker-selected">{selectedTicker ?? "—"}</div>
      <ul data-testid="ticker-prices">
        {entries.length === 0 ? (
          <li>No prices yet</li>
        ) : (
          entries.map(([sym, px]) => (
            <li key={sym}>
              {sym}: {typeof px === "number" && Number.isFinite(px) ? px.toFixed(2) : "—"}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
