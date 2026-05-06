import { useMarketStore } from "../../stores/market";

export function ChartStripPanel(): JSX.Element {
  const marketHistory = useMarketStore((s) => s.marketHistory);

  return (
    <section data-testid="chart-strip-panel" aria-label="Chart history">
      <pre data-testid="chart-history-keys">{JSON.stringify(Object.keys(marketHistory).sort(), null, 0)}</pre>
    </section>
  );
}
