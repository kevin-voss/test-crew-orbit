import { describe, expect, it } from "vitest";

import type { Holding } from "../stores/market/types";
import {
  ROI_DENOM_EPSILON,
  computeDayPnl,
  computeRoiPercent,
  computeTotalPnl,
  markToMarketEquity,
} from "./portfolioMetrics";

describe("portfolioMetrics", () => {
  it("markToMarketEquity skips non-finite marks and sums cash plus valued legs", () => {
    expect(
      markToMarketEquity(10_000, { A: { shares: 2, averageCost: 5 }, B: { shares: 3, averageCost: 1 } }, { A: 40 }),
    ).toBe(10_000 + 2 * 40);
  });

  it("computeTotalPnl is equity minus reference", () => {
    expect(computeTotalPnl(105_000, 100_000)).toBe(5000);
  });

  it("computeRoiPercent uses max(|R|, ε) as denominator", () => {
    expect(computeRoiPercent(100_000, 100_000)).toBe(0);
    const r = computeRoiPercent(100_000, 90_000);
    expect(r).toBeCloseTo((10_000 / 90_000) * 100, 10);
    const zeroRef = computeRoiPercent(ROI_DENOM_EPSILON, 0);
    expect(zeroRef).toBeCloseTo(100, 5);
  });

  it("computeDayPnl uses finite averageCost and finite prices only", () => {
    const positions: Record<string, Holding> = {
      Good: { shares: 10, averageCost: 40 },
      BadCost: { shares: 10, averageCost: Number.NaN },
      NoCost: { shares: 5 },
    };
    const prices: Partial<Record<string, number>> = { Good: 44 };
    expect(computeDayPnl(positions, prices)).toBeCloseTo(10 * (44 - 40), 10);
  });

  it("computeDayPnl ignores tickers missing a finite mark", () => {
    expect(computeDayPnl({ X: { shares: 100, averageCost: 10 } }, {})).toBe(0);
  });
});
