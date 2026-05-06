import { useMarketTickController } from "../market/useMarketTickController";

import { AnalyticsReadout } from "./AnalyticsReadout";
import { MarketTickerStrip } from "./MarketTickerStrip";
import { PriceHistorySnippet } from "./PriceHistorySnippet";

export function Dashboard(): JSX.Element {
  useMarketTickController();

  return (
    <>
      <MarketTickerStrip />
      <PriceHistorySnippet />
      <AnalyticsReadout />
    </>
  );
}
