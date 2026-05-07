"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer } from "recharts";

const ACCENT = ["#22c55e", "#38bdf8", "#f97316", "#c084fc"];

type Props = {
  positionsBySymbol: Record<string, number>;
  lastPriceBySymbol: Record<string, number>;
};

export function HoldingsPieChart({
  positionsBySymbol,
  lastPriceBySymbol,
}: Props) {
  const pieData = Object.entries(positionsBySymbol)
    .map(([symbol, quantity]) => ({
      name: symbol,
      value: quantity * (lastPriceBySymbol[symbol] ?? 0),
    }))
    .filter((d) => d.value > 0);

  if (pieData.length === 0) {
    return (
      <div
        data-testid="diversification-pie"
        className="flex min-h-[200px] w-full min-w-0 flex-col items-center justify-center rounded-md border border-dashed border-slate-700 bg-slate-900/40 px-3 py-6 text-center"
      >
        <p className="text-sm text-slate-400">No holdings</p>
        <p className="mt-1 text-xs text-slate-500">
          Positions-only allocation by ticker
        </p>
      </div>
    );
  }

  return (
    <div data-testid="diversification-pie" className="h-[200px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="40%"
            outerRadius="70%"
            paddingAngle={2}
          >
            {pieData.map((entry, i) => (
              <Cell
                key={`cell-${entry.name}-${i}`}
                fill={ACCENT[i % ACCENT.length] ?? "#94a3b8"}
              />
            ))}
          </Pie>
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
