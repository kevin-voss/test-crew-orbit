export const TICK_INTERVAL_MS = 2000;
export const HISTORY_CAP_PER_SYMBOL = 100;

export type Instrument = {
  symbol: string;
  sigma: number;
  mu: number;
  lastPrice: number;
};

export type PricePoint = { t: number; price: number };

/** Box–Muller sample for standard normal. */
function gaussian(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function defaultInstruments(): Instrument[] {
  return [
    { symbol: "AAPL", sigma: 0.018, mu: 0.00012, lastPrice: 175.25 },
    { symbol: "TSLA", sigma: 0.042, mu: 0.00028, lastPrice: 241.8 },
    { symbol: "AMZN", sigma: 0.031, mu: 0.00009, lastPrice: 178.4 },
  ];
}

export function advanceAllSymbolsGbm({
  pricesBySymbol,
  instruments,
  dtSeconds,
}: {
  pricesBySymbol: Record<string, number>;
  instruments: Instrument[];
  dtSeconds: number;
}): Record<string, number> {
  const out: Record<string, number> = { ...pricesBySymbol };
  for (const inst of instruments) {
    const S = pricesBySymbol[inst.symbol] ?? inst.lastPrice;
    const sigma = inst.sigma;
    const mu = inst.mu;
    const dt = dtSeconds;
    const z = gaussian();
    const drift = (mu - 0.5 * sigma * sigma) * dt;
    const diffusion = sigma * Math.sqrt(dt) * z;
    out[inst.symbol] = S * Math.exp(drift + diffusion);
  }
  return out;
}

export function trimHistory<T>(items: T[], cap: number): T[] {
  if (items.length <= cap) return items;
  return items.slice(items.length - cap);
}
