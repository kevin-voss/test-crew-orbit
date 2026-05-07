import { useMarketTickController } from "../market/useMarketTickController";
import { AnalyticsPanel } from "./marketDashboard/AnalyticsPanel";
import { ChartStripPanel } from "./marketDashboard/ChartStripPanel";
import { EquityCurveChart } from "./marketDashboard/EquityCurveChart";
import { HoldingsDiversificationChart } from "./marketDashboard/HoldingsDiversificationChart";
import { LiveTickerPanel } from "./marketDashboard/LiveTickerPanel";
import { SelectedTickerPriceChart } from "./marketDashboard/SelectedTickerPriceChart";
import { TradingTerminal } from "./marketDashboard/TradingTerminal";

/**
 * Dashboard shell: one tick controller drives ticker, chart, and analytics from the same store snapshot.
 */
export function MarketDashboard(): JSX.Element {
  useMarketTickController();

  return (
    <div
      data-testid="market-dashboard"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
        minWidth: 320,
        boxSizing: "border-box",
      }}
    >
      <LiveTickerPanel />
      <TradingTerminal />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          minWidth: 0,
          width: "100%",
          alignItems: "flex-start",
        }}
      >
        <SelectedTickerPriceChart />
        <EquityCurveChart />
      </div>
      <div style={{ width: "100%", minWidth: 0 }}>
        <HoldingsDiversificationChart />
      </div>
      <AnalyticsPanel />
      <ChartStripPanel />
    </div>
  );
}
