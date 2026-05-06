import type { Holding } from "../stores/market/types";

/**
 * Mark-to-market equity (cash plus valued positions). Presentation-side helper; the store
 * uses the same formula when recording equity samples.
 */
export function computeMarkToMarketEquity(
  cash: number,
  positions: Record<string, Holding>,
  prices: Partial<Record<string, number>>,
): number {
  let equity = cash;
  for (const [ticker, pos] of Object.entries(positions)) {
    const px = prices[ticker];
    if (typeof px === "number" && Number.isFinite(px)) {
      equity += pos.shares * px;
    }
  }
  return equity;
}
