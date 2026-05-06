import { useMarketStore } from "../stores/market";

export function PriceHistorySnippet(): JSX.Element {
  const selectedTicker = useMarketStore((s) => s.selectedTicker);
  const series = useMarketStore((s) => {
    const t = s.selectedTicker;
    return t ? s.marketHistory[t] : undefined;
  });

  const tail = (series ?? []).slice(-5);

  return (
    <section aria-label="Price history">
      {!selectedTicker ? (
        <div data-testid="history-empty">Select a ticker</div>
      ) : tail.length === 0 ? (
        <div data-testid="history-empty">No history for {selectedTicker}</div>
      ) : (
        <ul data-testid="history-points">
          {tail.map((pt) => (
            <li key={pt.t}>
              {pt.t}: {pt.price.toFixed(2)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
