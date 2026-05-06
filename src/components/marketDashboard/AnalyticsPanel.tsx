import { useMarketStore } from "../../stores/market";

export function AnalyticsPanel(): JSX.Element {
  const cash = useMarketStore((s) => s.cash);
  const positionCount = useMarketStore((s) => Object.keys(s.positions).length);

  return (
    <section data-testid="analytics-panel" aria-label="Analytics">
      <span data-testid="analytics-cash">{cash}</span>
      <span data-testid="analytics-positions-count">{positionCount}</span>
    </section>
  );
}
