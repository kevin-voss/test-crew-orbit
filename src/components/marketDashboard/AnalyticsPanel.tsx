import { useEffect, useMemo, useState } from "react";

import {
  computeDayPnl,
  computeRoiPercent,
  computeTotalPnl,
  markToMarketEquity,
} from "../../analytics/portfolioMetrics";
import {
  marketStoreHasHydrated,
  onMarketStoreHydrationComplete,
  useMarketStore,
} from "../../stores/market";

function fmtUsd(n: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

/**
 * Baseline **R** from `useMarketStore` after persistence merge. Subscribes to hydration so the
 * panel re-renders once storage has finished loading (single source of truth; no mixed baselines).
 */
function useReferenceEquity(): number {
  const [, setHydrationTick] = useState(0);
  useEffect(() => {
    if (marketStoreHasHydrated()) return undefined;
    return onMarketStoreHydrationComplete(() => setHydrationTick((n) => n + 1));
  }, []);
  return useMarketStore((s) => s.referenceEquity);
}

export function AnalyticsPanel(): JSX.Element {
  const cash = useMarketStore((s) => s.cash);
  const positions = useMarketStore((s) => s.positions);
  const prices = useMarketStore((s) => s.prices);
  const referenceEquity = useReferenceEquity();
  const equity = useMemo(
    () => markToMarketEquity(cash, positions, prices),
    [cash, positions, prices],
  );

  const roi = computeRoiPercent(equity, referenceEquity);
  const totalPnl = computeTotalPnl(equity, referenceEquity);
  const dayPnl = useMemo(() => computeDayPnl(positions, prices), [positions, prices]);

  return (
    <section data-testid="analytics-panel" aria-label="Analytics">
      <div
        data-testid="portfolio-analytics-metrics"
        style={{
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 6,
          padding: 12,
          background: "#faf9f7",
        }}
      >
        <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600 }}>Analytics</h3>
        <p style={{ margin: "0 0 10px", fontSize: 11, color: "rgba(0,0,0,0.55)" }}>
          <span data-testid="portfolio-analytics-reference-equity">
            Reference equity: {fmtUsd(referenceEquity)}
          </span>
        </p>
        <dl style={{ margin: 0, display: "grid", gap: 10 }}>
          <div>
            <dt style={{ fontSize: 12, fontWeight: 600 }}>ROI (%)</dt>
            <dd
              data-testid="portfolio-analytics-roi-value"
              style={{ margin: "4px 0 0", fontSize: 14, fontVariantNumeric: "tabular-nums" }}
            >
              {fmtPct(roi)}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: 12, fontWeight: 600 }}>Day P&L</dt>
            <dd
              data-testid="portfolio-analytics-day-pnl-value"
              style={{ margin: "4px 0 0", fontSize: 14, fontVariantNumeric: "tabular-nums" }}
            >
              {fmtUsd(dayPnl)}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: 12, fontWeight: 600 }}>Total P&L</dt>
            <dd
              data-testid="portfolio-analytics-total-pnl-value"
              style={{ margin: "4px 0 0", fontSize: 14, fontVariantNumeric: "tabular-nums" }}
            >
              {fmtUsd(totalPnl)}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
