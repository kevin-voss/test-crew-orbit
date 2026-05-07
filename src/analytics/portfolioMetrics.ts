import type { Holding } from "../stores/market/types";
import { computeMarkToMarketEquity } from "../utils/portfolioEquity";

/** Denominator floor for ROI (%) per metric assumptions: `max(|R|, ε)`. */
export const ROI_DENOM_EPSILON = 1e-9;

/**
 * Mark-to-market portfolio equity (cash plus valued positions). Delegates to the shared
 * store/presentation helper so analytics and `marketStore` stay aligned.
 */
export function markToMarketEquity(
  cash: number,
  positions: Record<string, Holding>,
  prices: Partial<Record<string, number>>,
): number {
  return computeMarkToMarketEquity(cash, positions, prices);
}

export function computeTotalPnl(equity: number, referenceEquity: number): number {
  return equity - referenceEquity;
}

export function computeRoiPercent(
  equity: number,
  referenceEquity: number,
  epsilon: number = ROI_DENOM_EPSILON,
): number {
  const denom = Math.max(Math.abs(referenceEquity), epsilon);
  return ((equity - referenceEquity) / denom) * 100;
}

/**
 * **Day P&L** (per product assumptions): unrealized gain on open lots —
 * **Σ shares × (last price − basis)** per ticker where **basis = `averageCost` when finite**;
 * holdings lacking a finite `averageCost`, or lacking a finite mark in `prices`, contribute **0**.
 */
export function computeDayPnl(
  positions: Record<string, Holding>,
  prices: Partial<Record<string, number>>,
): number {
  let sum = 0;
  for (const [ticker, pos] of Object.entries(positions)) {
    const basis = pos.averageCost;
    if (typeof basis !== "number" || !Number.isFinite(basis)) continue;
    const px = prices[ticker];
    if (typeof px !== "number" || !Number.isFinite(px)) continue;
    sum += pos.shares * (px - basis);
  }
  return sum;
}
