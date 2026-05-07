/** Whole-share affordability — shared by terminal Max Buy and execution floors (keep UI imports off `simulateTradeExecution`). */
export function maxWholeSharesAffordable(cash: number, price: number): number {
  if (!Number.isFinite(cash) || !Number.isFinite(price) || price <= 0) return 0;
  return Math.floor(cash / price);
}
