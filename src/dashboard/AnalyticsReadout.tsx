import { useMemo } from "react";

import { useMarketStore } from "../stores/market";

export function AnalyticsReadout(): JSX.Element {
  const cash = useMarketStore((s) => s.cash);
  const positions = useMarketStore((s) => s.positions);
  const prices = useMarketStore((s) => s.prices);

  const { holdingsValue, equity } = useMemo(() => {
    let holdingsValue = 0;
    for (const [ticker, holding] of Object.entries(positions)) {
      const px = prices[ticker];
      if (typeof px === "number" && Number.isFinite(px)) {
        holdingsValue += holding.shares * px;
      }
    }
    return { holdingsValue, equity: cash + holdingsValue };
  }, [cash, positions, prices]);

  return (
    <section aria-label="Analytics" data-testid="analytics-readout">
      <div>Cash: {cash.toFixed(2)}</div>
      <div>Holdings (mark): {holdingsValue.toFixed(2)}</div>
      <div>Equity (cash + marks): {equity.toFixed(2)}</div>
    </section>
  );
}
