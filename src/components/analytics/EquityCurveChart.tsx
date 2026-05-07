"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { EquityPoint } from "@/stores/useMarketStore";

function fmtMoney(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Props = {
  equityHistory: EquityPoint[];
};

export function EquityCurveChart({ equityHistory }: Props) {
  return (
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
      </ResponsiveContainer>
    </div>
  );
}
