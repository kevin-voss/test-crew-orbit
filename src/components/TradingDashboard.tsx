"use client";

import { useEffect, useMemo } from "react";
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PriceChart } from "@/components/charts/PriceChart";
import { TickerPanel } from "@/components/tickers/TickerPanel";
import { TradingTerminal } from "@/components/trade/TradingTerminal";
import { createMarketController } from "@/lib/marketController";
import { useMarketStore } from "@/stores/useMarketStore";

const ACCENT = ["#22c55e", "#38bdf8", "#f97316", "#c084fc"];

function fmtMoney(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function TradingDashboard() {
  const cash = useMarketStore((s) => s.cash);
  const selectedSymbol = useMarketStore((s) => s.selectedSymbol);
  const lastPriceBySymbol = useMarketStore((s) => s.lastPriceBySymbol);
  const positionsBySymbol = useMarketStore((s) => s.positionsBySymbol);
  const priceHistoryBySymbol = useMarketStore((s) => s.priceHistoryBySymbol);
  const equityHistory = useMarketStore((s) => s.equityHistory);
  const equityAtDayStart = useMarketStore((s) => s.equityAtDayStart);

  useEffect(() => {
    const stop = createMarketController({ store: useMarketStore });
    return stop;
  }, []);

  const chartPrice = lastPriceBySymbol[selectedSymbol] ?? 0;
  const chartRows = priceHistoryBySymbol[selectedSymbol] ?? [];

  const equity = useMemo(() => {
    let mkt = 0;
    for (const [sym, q] of Object.entries(positionsBySymbol)) {
      mkt += q * (lastPriceBySymbol[sym] ?? 0);
    }
    return cash + mkt;
  }, [cash, positionsBySymbol, lastPriceBySymbol]);

  const baseline = 100_000;
  const totalPnl = equity - baseline;
  const roiPct = (equity / baseline - 1) * 100;
  const dayPnl = equity - equityAtDayStart;

  const pieData = Object.entries(positionsBySymbol)
    .map(([symbol, quantity]) => ({
      name: symbol,
      value: quantity * (lastPriceBySymbol[symbol] ?? 0),
    }))
    .filter((d) => d.value > 0);

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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Portfolio &amp; analytics
        </h2>
        <p className="text-xs text-slate-500">
          Cash:{" "}
          <span className="text-slate-200 tabular-nums">{fmtMoney(cash)}</span>
        </p>
        <div data-testid="metric-roi" className="text-sm">
          ROI (%):{" "}
          <span className="tabular-nums text-emerald-300">
            {roiPct.toFixed(2)}
          </span>
        </div>
        <div data-testid="metric-day-pnl" className="text-sm">
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
        </div>
        <div data-testid="metric-total-pnl" className="text-sm">
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

        <div data-testid="equity-curve" className="h-[160px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={equityHistory}
              margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
            >
              <XAxis dataKey="t" hide />
              <YAxis domain={["auto", "auto"]} width={48} />
              <Tooltip
                formatter={(v: number) => [fmtMoney(v), "Equity"]}
                labelFormatter={(t) =>
                  new Date(t as number).toLocaleTimeString()
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#60a5fa"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div data-testid="diversification-pie" className="h-[200px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData.length ? pieData : [{ name: "Cash", value: 1 }]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="40%"
                outerRadius="70%"
                paddingAngle={2}
              >
                {(pieData.length ? pieData : [{ name: "Cash", value: 1 }]).map(
                  (entry, i) => (
                    <Cell
                      key={`cell-${entry.name}-${i}`}
                      fill={ACCENT[i % ACCENT.length] ?? "#94a3b8"}
                    />
                  ),
                )}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
