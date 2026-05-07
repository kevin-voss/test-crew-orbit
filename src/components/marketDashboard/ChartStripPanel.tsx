import { SelectedTickerPriceChart } from "./SelectedTickerPriceChart";

/**
 * Compact strip uses the same Recharts surface as the dashboard card but resolves the active
 * symbol like the ticker headline (selection when priced, else first finite priced key).
 */
export function ChartStripPanel(): JSX.Element {
  return (
    <section data-testid="chart-strip-panel" aria-label="Chart history">
      <SelectedTickerPriceChart variant="strip" />
    </section>
  );
}
