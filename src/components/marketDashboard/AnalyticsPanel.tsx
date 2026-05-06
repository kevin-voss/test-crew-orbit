import { useMemo } from "react";

import { useMarketStore } from "../../stores/market";
import { computeMarkToMarketEquity } from "../../utils/portfolioEquity";

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

export function AnalyticsPanel(): JSX.Element {
  const cash = useMarketStore((s) => s.cash);
  const positions = useMarketStore((s) => s.positions);
  const prices = useMarketStore((s) => s.prices);
  const referenceEquity = useMarketStore((s) => s.referenceEquity);
  const dayOpenEquity = useMarketStore((s) => s.dayOpenEquity);

  const equity = useMemo(
    () => computeMarkToMarketEquity(cash, positions, prices),
    [cash, positions, prices],
  );

  const roi = referenceEquity > 0 ? (equity / referenceEquity - 1) * 100 : 0;
  const totalPnl = equity - referenceEquity;
  const dayPnl = equity - dayOpenEquity;

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
            <dd data-testid="portfolio-analytics-roi-value" style={{ margin: "4px 0 0", fontSize: 14 }}>
              {fmtPct(roi)}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: 12, fontWeight: 600 }}>Day P&L</dt>
            <dd data-testid="portfolio-analytics-day-pnl-value" style={{ margin: "4px 0 0", fontSize: 14 }}>
              {fmtUsd(dayPnl)}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: 12, fontWeight: 600 }}>Total P&L</dt>
            <dd data-testid="portfolio-analytics-total-pnl-value" style={{ margin: "4px 0 0", fontSize: 14 }}>
              {fmtUsd(totalPnl)}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
