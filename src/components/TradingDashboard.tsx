"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { createMarketController } from "@/lib/marketController";
import { useMarketStore } from "@/stores/useMarketStore";
import { defaultInstruments } from "@/utils/marketEngine";

const ACCENT = ["#22c55e", "#38bdf8", "#f97316", "#c084fc"];

function fmtMoney(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function tickerFlash(
  sym: string,
  last: Record<string, number>,
  prior: Record<string, number>,
): string {
  const a = last[sym];
  const b = prior[sym];
  if (a == null || b == null) return "";
  if (a === b) return "flash-neutral-first-tick";
  return a > b ? "flash-up" : "flash-down";
}

export function TradingDashboard() {
  const symbols = useMemo(() => defaultInstruments().map((i) => i.symbol), []);
  const [qty, setQty] = useState(1);

  const cash = useMarketStore((s) => s.cash);
  const selectedSymbol = useMarketStore((s) => s.selectedSymbol);
  const setSelectedSymbol = useMarketStore((s) => s.setSelectedSymbol);
  const lastPriceBySymbol = useMarketStore((s) => s.lastPriceBySymbol);
  const priorTickPriceBySymbol = useMarketStore((s) => s.priorTickPriceBySymbol);
  const positionsBySymbol = useMarketStore((s) => s.positionsBySymbol);
  const priceHistoryBySymbol = useMarketStore((s) => s.priceHistoryBySymbol);
  const equityHistory = useMarketStore((s) => s.equityHistory);
  const equityAtDayStart = useMarketStore((s) => s.equityAtDayStart);
  const buy = useMarketStore((s) => s.buy);
  const sell = useMarketStore((s) => s.sell);
  const maxBuyFor = useMarketStore((s) => s.maxBuyFor);

  useEffect(() => {
    const stop = createMarketController({ store: useMarketStore });
    return stop;
  }, []);

  const maxBuy = maxBuyFor(selectedSymbol);
  const chartPrice = lastPriceBySymbol[selectedSymbol] ?? 0;
  const chartRows = priceHistoryBySymbol[selectedSymbol] ?? [];
  const chartSeries =
    chartRows.length > 0
      ? chartRows.map((p) => ({ t: p.t, price: p.price }))
      : [{ t: Date.now(), price: chartPrice }];

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

  const chartHeaderText = fmtMoney(chartPrice);

  return (
    <div
      data-layout="dashboard-grid"
      className="grid min-h-screen grid-cols-1 gap-4 bg-slate-950 p-4 text-slate-100 lg:grid-cols-3"
    >
      <aside
        data-testid="region-tickers"
        className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Tickers
        </h2>
        <ul className="flex flex-col gap-1">
          {symbols.map((sym) => {
            const px = lastPriceBySymbol[sym] ?? 0;
            const flash = tickerFlash(
              sym,
              lastPriceBySymbol,
              priorTickPriceBySymbol,
            );
            return (
              <li
                key={sym}
                data-testid={`ticker-row-${sym}`}
                className={`rounded-md border border-slate-800 ${flash} ${
                  selectedSymbol === sym ? "border-emerald-600/60 bg-slate-800" : ""
                }`}
              >
                <button
                  type="button"
                  data-testid={`select-symbol-${sym}`}
                  onClick={() => setSelectedSymbol(sym)}
                  className="flex w-full items-center justify-between px-2 py-2 text-left transition-colors hover:bg-slate-800/80"
                >
                  <span className="font-medium">{sym}</span>
                  <span data-testid="ticker-price" className="tabular-nums">
                    {fmtMoney(px)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section
        data-testid="region-chart-trade"
        className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Chart
          </h2>
          <span
            data-testid="chart-header-price"
            className="tabular-nums text-lg font-semibold text-emerald-300"
          >
            {chartHeaderText}
          </span>
        </div>
        <div className="w-full overflow-x-auto">
          <LineChart
            width={560}
            height={220}
            data={chartSeries}
            margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
          >
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              hide
            />
            <YAxis domain={["auto", "auto"]} width={48} />
            <Tooltip
              formatter={(v: number) => [fmtMoney(v), "Price"]}
              labelFormatter={(t) => new Date(t as number).toLocaleTimeString()}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#34d399"
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </div>
        <p className="sr-only" data-testid="chart-last-price">
          {chartPrice.toFixed(6)}
        </p>

        <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase text-slate-400">
            Trade
          </h3>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400" htmlFor="qty-input">
              Quantity (whole shares)
            </label>
            <input
              id="qty-input"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value) || 1)}
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
            />
            <p className="text-xs text-slate-400">
              Max buy:{" "}
              <span data-testid="max-buy-display" className="text-slate-100">
                {maxBuy}
              </span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded bg-emerald-600 px-3 py-2 text-sm font-medium hover:bg-emerald-500"
                onClick={() => buy({ symbol: selectedSymbol, quantity: qty })}
              >
                Buy
              </button>
              <button
                type="button"
                className="flex-1 rounded bg-rose-600 px-3 py-2 text-sm font-medium hover:bg-rose-500"
                onClick={() => sell({ symbol: selectedSymbol, quantity: qty })}
              >
                Sell
              </button>
            </div>
          </div>
        </div>
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

        <div data-testid="equity-curve" className="w-full overflow-x-auto">
          <LineChart
            width={560}
            height={160}
            data={equityHistory}
            margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
          >
            <XAxis dataKey="t" hide />
            <YAxis domain={["auto", "auto"]} width={48} />
            <Tooltip
              formatter={(v: number) => [fmtMoney(v), "Equity"]}
              labelFormatter={(t) => new Date(t as number).toLocaleTimeString()}
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
        </div>

        <div data-testid="diversification-pie" className="w-full overflow-x-auto">
          <PieChart width={400} height={200}>
            <Pie
              data={pieData.length ? pieData : [{ name: "Cash", value: 1 }]}
              dataKey="value"
              nameKey="name"
              cx={200}
              cy={100}
              innerRadius={40}
              outerRadius={70}
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
        </div>
      </section>
    </div>
  );
}
