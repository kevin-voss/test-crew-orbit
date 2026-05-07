"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { PricePoint } from "@/utils/marketEngine";

function fmtMoney(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type PriceChartProps = {
  headerPrice: number;
  series: PricePoint[];
};

export function PriceChart({ headerPrice, series }: PriceChartProps) {
  const chartSeries =
    series.length > 0
      ? series.map((p) => ({ t: p.t, price: p.price }))
      : [{ t: Date.now(), price: headerPrice }];

  const chartHeaderText = fmtMoney(headerPrice);

  return (
    <>
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
      <div className="h-[220px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
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
        </ResponsiveContainer>
      </div>
      <p className="sr-only" data-testid="chart-last-price">
        {headerPrice.toFixed(6)}
      </p>
    </>
  );
}
