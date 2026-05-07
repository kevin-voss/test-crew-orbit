"use client";

import { AnalyticsPanel } from "../components/marketDashboard/AnalyticsPanel";
import { ChartStripPanel } from "../components/marketDashboard/ChartStripPanel";
import { EquityCurveChart } from "../components/marketDashboard/EquityCurveChart";
import { HoldingsDiversificationChart } from "../components/marketDashboard/HoldingsDiversificationChart";
import { LiveTickerPanel } from "../components/marketDashboard/LiveTickerPanel";
import { SelectedTickerPriceChart } from "../components/marketDashboard/SelectedTickerPriceChart";
import { TradingTerminal } from "../components/marketDashboard/TradingTerminal";
import { useMarketTickController } from "../market/useMarketTickController";

/**
 * Responsive three-column grid: Tickers | Chart/Trade | Portfolio (stacked on narrow viewports).
 * Middle column: TradingTerminal → SelectedTickerPriceChart → ChartStripPanel (act → primary chart → strip).
 * Portfolio column: AnalyticsPanel → HoldingsDiversificationChart → EquityCurveChart.
 */
export function DashboardShell(): JSX.Element {
  // AC-10: persisted store rehydration completes, then tick controller starts, then subscribed UI updates.
  useMarketTickController();

  return (
    <div
      data-testid="responsive-dashboard-shell"
      className="mx-auto box-border w-full max-w-[1920px] px-3 py-4 md:px-4 md:py-6"
    >
      <div
        data-testid="dashboard-layout-grid"
        className="grid min-h-0 min-w-0 w-full grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5"
      >
        <section
          data-testid="dashboard-column-tickers"
          aria-labelledby="dashboard-region-tickers-heading"
          className="flex min-h-[12rem] min-w-0 flex-col gap-3 overflow-auto lg:min-h-0"
        >
          <h2 id="dashboard-region-tickers-heading" className="sr-only">
            Tickers
          </h2>
          <LiveTickerPanel />
        </section>
        <section
          data-testid="dashboard-column-chart-trade"
          aria-labelledby="dashboard-region-chart-trade-heading"
          className="flex min-h-[12rem] min-w-0 flex-col gap-3 overflow-auto lg:min-h-0"
        >
          <h2 id="dashboard-region-chart-trade-heading" className="sr-only">
            Chart and trade
          </h2>
          <TradingTerminal />
          <SelectedTickerPriceChart />
          <ChartStripPanel />
        </section>
        <section
          data-testid="dashboard-column-portfolio"
          aria-labelledby="dashboard-region-portfolio-heading"
          className="flex min-h-[12rem] min-w-0 flex-col gap-3 overflow-auto lg:min-h-0"
        >
          <h2 id="dashboard-region-portfolio-heading" className="sr-only">
            Portfolio
          </h2>
          <AnalyticsPanel />
          <HoldingsDiversificationChart />
          <EquityCurveChart />
        </section>
      </div>
    </div>
  );
}
