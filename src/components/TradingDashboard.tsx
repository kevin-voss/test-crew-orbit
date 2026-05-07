"use client";

import { useEffect } from "react";

import { AnalyticsPanel } from "@/components/analytics/AnalyticsPanel";
import { PriceChart } from "@/components/charts/PriceChart";
import { TickerPanel } from "@/components/tickers/TickerPanel";
import { TradingTerminal } from "@/components/trade/TradingTerminal";
import { createMarketController } from "@/lib/marketController";
import { useMarketStore } from "@/stores/useMarketStore";

export function TradingDashboard() {
  const selectedSymbol = useMarketStore((s) => s.selectedSymbol);
  const lastPriceBySymbol = useMarketStore((s) => s.lastPriceBySymbol);
  const priceHistoryBySymbol = useMarketStore((s) => s.priceHistoryBySymbol);

  useEffect(() => {
    const stop = createMarketController({ store: useMarketStore });
    return stop;
  }, []);

  const chartPrice = lastPriceBySymbol[selectedSymbol] ?? 0;
  const chartRows = priceHistoryBySymbol[selectedSymbol] ?? [];

  return (
    <div
      data-layout="dashboard-grid"
      className="grid min-h-screen grid-cols-1 gap-4 bg-slate-950 p-4 text-slate-100 lg:grid-cols-3"
    >
      <TickerPanel />

      <section
        data-testid="region-chart-trade"
        className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3"
      >
        <PriceChart headerPrice={chartPrice} series={chartRows} />
        <TradingTerminal />
      </section>

      <section
        data-testid="region-portfolio"
        className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3"
      >
        <AnalyticsPanel />
      </section>
    </div>
  );
}
