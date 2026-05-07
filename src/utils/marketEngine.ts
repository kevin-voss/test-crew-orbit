/**
 * Geometric Brownian Motion (GBM) for simulated equity prices.
 *
 * Continuous-time SDE: dS = μ S dt + σ S dW
 *
 * Discrete-time exact step for one interval Δt (in years):
 *   S_{t+Δt} = S_t · exp((μ − ½σ²)Δt + σ√Δt · Z),  Z ~ N(0,1)
 *
 * **Δt:** wall-clock step length is passed as `dtSeconds` (e.g. 2 for a 2s UI tick).
 * The engine converts to years: Δt_years = dtSeconds / SECONDS_PER_YEAR so μ and σ
 * are interpretable as annualized drift and volatility.
 *
 * RNG: Box–Muller, `Math.random()`-based; simulation-only (not cryptographic).
 */

import type { Instrument, PricePoint, TickSnapshot } from "@/types/market";

export type { Instrument, PricePoint, TickSnapshot } from "@/types/market";

export const TICK_INTERVAL_MS = 2000;
export const HISTORY_CAP_PER_SYMBOL = 100;

/** Calendar-year length used to map wall-clock seconds → GBM Δt in years. */
export const SECONDS_PER_YEAR = 365 * 24 * 3600;

const MIN_PRICE = 0.01;

function floorPrice(x: number): number {
  if (!Number.isFinite(x) || x <= MIN_PRICE) return MIN_PRICE;
  return x;
}

/** Box–Muller sample for standard normal. */
function gaussian(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Default universe: **annualized** σ and μ, distinct per symbol (AC-3).
 * Starting levels are illustrative spot prices.
 */
export function defaultInstruments(): Instrument[] {
  return [
    { symbol: "AAPL", sigma: 0.2, mu: 0.09, lastPrice: 175.25 },
    { symbol: "TSLA", sigma: 0.48, mu: 0.11, lastPrice: 241.8 },
    { symbol: "AMZN", sigma: 0.32, mu: 0.075, lastPrice: 178.4 },
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
  const dt = dtSeconds / SECONDS_PER_YEAR;
  for (const inst of instruments) {
    const S = pricesBySymbol[inst.symbol] ?? inst.lastPrice;
    const sigma = inst.sigma;
    const mu = inst.mu;
    const z = gaussian();
    const drift = (mu - 0.5 * sigma * sigma) * dt;
    const diffusion = sigma * Math.sqrt(dt) * z;
    out[inst.symbol] = floorPrice(S * Math.exp(drift + diffusion));
  }
  return out;
}

export function computeNextTick({
  pricesBySymbol,
  instruments,
  dtSeconds = TICK_INTERVAL_MS / 1000,
}: {
  pricesBySymbol: Record<string, number>;
  instruments: Instrument[];
  dtSeconds?: number;
}): TickSnapshot {
  const prices = advanceAllSymbolsGbm({
    pricesBySymbol,
    instruments,
    dtSeconds,
  });
  const deltaSignBySymbol: Record<string, -1 | 0 | 1> = {};
  for (const inst of instruments) {
    const prev = pricesBySymbol[inst.symbol] ?? inst.lastPrice;
    const next = prices[inst.symbol] ?? prev;
    deltaSignBySymbol[inst.symbol] =
      next > prev ? 1 : next < prev ? -1 : 0;
  }
  return { prices, deltaSignBySymbol };
}

/**
 * Bootstrap ~100 samples per symbol for chart initialization (AC-4 helper).
 * Timestamps are spaced by `TICK_INTERVAL_MS` ending at `referenceTimeMs`.
 */
export function buildInitialHistories(
  instruments: Instrument[] = defaultInstruments(),
  referenceTimeMs: number = Date.now(),
): Record<string, PricePoint[]> {
  const out: Record<string, PricePoint[]> = {};
  const dtSec = TICK_INTERVAL_MS / 1000;
  for (const inst of instruments) {
    const series: PricePoint[] = [];
    let price = floorPrice(inst.lastPrice);
    for (let i = 0; i < HISTORY_CAP_PER_SYMBOL; i++) {
      const t =
        referenceTimeMs -
        (HISTORY_CAP_PER_SYMBOL - 1 - i) * TICK_INTERVAL_MS;
      series.push({ t, price });
      if (i < HISTORY_CAP_PER_SYMBOL - 1) {
        const nextPrices = advanceAllSymbolsGbm({
          pricesBySymbol: { [inst.symbol]: price },
          instruments: [{ ...inst, lastPrice: price }],
          dtSeconds: dtSec,
        });
        price = floorPrice(nextPrices[inst.symbol] ?? price);
      }
    }
    out[inst.symbol] = series;
  }
  return out;
}

/** Alias for spec wording (`initializeHistory`). */
export const initializeHistory = buildInitialHistories;

export function trimHistory<T>(items: T[], cap: number): T[] {
  if (items.length <= cap) return items;
  return items.slice(items.length - cap);
}
