import { useMarketTickController } from "../market/useMarketTickController";
import { AnalyticsPanel } from "./marketDashboard/AnalyticsPanel";
import { ChartStripPanel } from "./marketDashboard/ChartStripPanel";
import { LiveTickerPanel } from "./marketDashboard/LiveTickerPanel";
import { TradingTerminal } from "./marketDashboard/TradingTerminal";

/**
 * Dashboard shell: one tick controller drives ticker, chart, and analytics from the same store snapshot.
 */
export function MarketDashboard(): JSX.Element {
  useMarketTickController();

  return (
    <div data-testid="market-dashboard">
      <LiveTickerPanel />
      <TradingTerminal />
      <ChartStripPanel />
      <AnalyticsPanel />
    </div>
  );
}
