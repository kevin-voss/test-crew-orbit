import { useMarketTickController } from "../marketTick/useMarketTickController";
import { AnalyticsPanel } from "./marketDashboard/AnalyticsPanel";
import { ChartStripPanel } from "./marketDashboard/ChartStripPanel";
import { TickerPanel } from "./marketDashboard/TickerPanel";

/**
 * Dashboard shell: one tick controller drives ticker, chart, and analytics from the same store snapshot.
 */
export function MarketDashboard(): JSX.Element {
  useMarketTickController();

  return (
    <div data-testid="market-dashboard">
      <TickerPanel />
      <ChartStripPanel />
      <AnalyticsPanel />
    </div>
  );
}
