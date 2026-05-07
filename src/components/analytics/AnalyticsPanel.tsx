"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { EquityCurveChart } from "@/components/analytics/EquityCurveChart";
import { HoldingsPieChart } from "@/components/analytics/HoldingsPieChart";
import { useMarketStore } from "@/stores/useMarketStore";

const BASELINE = 100_000;

function fmtMoney(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function AnalyticsPanel() {
  const {
    cash,
    positionsBySymbol,
    lastPriceBySymbol,
    equityHistory,
    equityAtSessionStart,
  } = useMarketStore(
    useShallow((s) => ({
      cash: s.cash,
      positionsBySymbol: s.positionsBySymbol,
      lastPriceBySymbol: s.lastPriceBySymbol,
      equityHistory: s.equityHistory,
      equityAtSessionStart: s.equityAtSessionStart,
    })),
  );

  const equity = useMemo(() => {
    let mkt = 0;
    for (const [sym, q] of Object.entries(positionsBySymbol)) {
      mkt += q * (lastPriceBySymbol[sym] ?? 0);
    }
    return cash + mkt;
  }, [cash, positionsBySymbol, lastPriceBySymbol]);

  const totalPnl = equity - BASELINE;
  const roiPct = ((equity - BASELINE) / BASELINE) * 100;
  const dayPnl = equity - equityAtSessionStart;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Portfolio &amp; analytics
      </h2>
      <p className="text-xs text-slate-500">
        Cash:{" "}
        <span className="text-slate-200 tabular-nums">{fmtMoney(cash)}</span>
      </p>
      <div data-testid="metric-roi" className="min-w-0 text-sm">
        ROI (%):{" "}
        <span className="tabular-nums text-emerald-300">
          {roiPct.toFixed(2)}
        </span>
        <span className="mt-0.5 block text-[11px] font-normal normal-case tracking-normal text-slate-500">
          vs $100,000 life grant
        </span>
      </div>
      <div data-testid="metric-day-pnl" className="min-w-0 text-sm">
        Day P&amp;L:{" "}
        <span
          className={
            dayPnl >= 0
              ? "tabular-nums text-emerald-300"
              : "tabular-nums text-rose-300"
          }
        >
          {fmtMoney(dayPnl)}
        </span>
        <span className="mt-0.5 block text-[11px] font-normal normal-case tracking-normal text-slate-500">
          Session: vs equity at page load (after restore)
        </span>
      </div>
      <div data-testid="metric-total-pnl" className="min-w-0 text-sm">
        Total P&amp;L:{" "}
        <span
          className={
            totalPnl >= 0
              ? "tabular-nums text-emerald-300"
              : "tabular-nums text-rose-300"
          }
        >
          {fmtMoney(totalPnl)}
        </span>
      </div>

      <div className="min-w-0">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Equity curve
        </p>
        <EquityCurveChart equityHistory={equityHistory} />
      </div>

      <div className="min-w-0">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Diversification
        </p>
        <HoldingsPieChart
          positionsBySymbol={positionsBySymbol}
          lastPriceBySymbol={lastPriceBySymbol}
        />
      </div>
    </div>
  );
}
