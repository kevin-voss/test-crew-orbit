import { useMarketTickController } from "../market/useMarketTickController";
import { AnalyticsPanel } from "./marketDashboard/AnalyticsPanel";
import { ChartStripPanel } from "./marketDashboard/ChartStripPanel";
import { EquityCurveChart } from "./marketDashboard/EquityCurveChart";
import { HoldingsDiversificationChart } from "./marketDashboard/HoldingsDiversificationChart";
import { LiveTickerPanel } from "./marketDashboard/LiveTickerPanel";
import { SelectedTickerPriceChart } from "./marketDashboard/SelectedTickerPriceChart";
import { TradingTerminal } from "./marketDashboard/TradingTerminal";

/**
 * Dashboard shell: one tick controller drives ticker, chart, trade, and analytics from the same store snapshot.
 * Responsive columns follow container width so narrow shells stack while wide shells show Tickers | Chart/Trade | Portfolio.
 */
export function MarketDashboard(): JSX.Element {
  useMarketTickController();

  return (
    <div data-testid="market-dashboard" className="w-full min-w-0 box-border">
      <div
        data-testid="responsive-dashboard-shell"
        className="mx-auto box-border w-full max-w-[1920px] px-3 py-4 md:px-4 md:py-6"
      >
        <div
          data-testid="dashboard-layout-grid"
          className="grid min-w-0 w-full grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5"
        >
          <div
            data-testid="dashboard-column-tickers"
            className="flex min-w-0 flex-col gap-3 lg:min-h-0"
          >
            <LiveTickerPanel />
          </div>
          <div
            data-testid="dashboard-column-chart-trade"
            className="flex min-w-0 flex-col gap-3 lg:min-h-0"
          >
            <TradingTerminal />
            <SelectedTickerPriceChart />
            <ChartStripPanel />
          </div>
          <div
            data-testid="dashboard-column-portfolio"
            className="flex min-w-0 flex-col gap-3 lg:min-h-0"
          >
            <AnalyticsPanel />
            <HoldingsDiversificationChart />
            <EquityCurveChart />
          </div>
        </div>
      </div>
    </div>
  );
}
