/**
 * Geometric Brownian Motion (GBM) spot simulator for client-only market ticks.
 * Discrete step on log-price: S' = S * exp((μ - σ²/2)Δt + σ√Δt * Z).
 */
import type { MarketTickPayload, PricePoint } from "../stores/market/types";

/** Engine-local max points per ticker (chart initialization / rolling strip). */
export const MARKET_ENGINE_HISTORY_MAX = 100;

export type GbmParams = {
  /** Drift μ (same time units as `deltaTSeconds`). */
  mu: number;
  /** Volatility σ (same time units as `deltaTSeconds`). */
  sigma: number;
};

export const DEFAULT_MARKET_ENGINE_PARAMS: Readonly<
  Record<"AAPL" | "TSLA" | "AMZN", GbmParams>
> = {
  AAPL: { mu: 0.0001, sigma: 0.01 },
  TSLA: { mu: 0.0004, sigma: 0.04 },
  AMZN: { mu: 0.0009, sigma: 0.09 },
};

export type RunMarketTickInput = {
  prices: Partial<Record<string, number>>;
  paramsByTicker: Record<string, GbmParams>;
  histories: Record<string, PricePoint[]>;
  /** Wall-clock or logical timestamp for the new sample. */
  nowMs: number;
  /** GBM step size in seconds; defaults to 2 to match the market tick cadence. */
  deltaTSeconds?: number;
  /** Uniform(0,1) draws; injectable for tests and deterministic replays. */
  rng?: () => number;
};

export type RunMarketTickResult = {
  payload: MarketTickPayload;
  histories: Record<string, PricePoint[]>;
};

export type SymbolEngineState = {
  ticker: string;
  /** Drift μ */
  mu: number;
  /** Volatility σ */
  sigma: number;
  spot: number;
  history: PricePoint[];
};

export type StepMarketEngineInput = {
  /** Timestamp for the new sample */
  now: number;
  /** Time step Δt (same units as μ, σ scaling) */
  dt: number;
  symbols: SymbolEngineState[];
  /** One standard-normal draw per symbol (order-aligned); omitted draws use Box–Muller from Math.random */
  shocks?: number[];
};

export type StepMarketEngineOutput = MarketTickPayload & {
  histories: Record<string, PricePoint[]>;
};

function clampHistory(series: PricePoint[]): PricePoint[] {
  if (series.length <= MARKET_ENGINE_HISTORY_MAX) return series;
  return series.slice(-MARKET_ENGINE_HISTORY_MAX);
}

/**
 * Standard normal from two independent Uniform(0,1) draws (Box–Muller),
 * using only the injectable `rng` (no external RNG services).
 */
function normalFromUniform(rng: () => number): number {
  let u1 = rng();
  let u2 = rng();
  if (u1 <= 0 || u1 >= 1) u1 = Number.EPSILON;
  if (u2 <= 0 || u2 >= 1) u2 = Number.EPSILON;
  const mag = Math.sqrt(-2 * Math.log(u1));
  return mag * Math.cos(2 * Math.PI * u2);
}

function nextGbmPrice(s0: number, mu: number, sigma: number, dt: number, z: number): number {
  const drift = (mu - 0.5 * sigma * sigma) * dt;
  const shock = sigma * Math.sqrt(dt) * z;
  return s0 * Math.exp(drift + shock);
}

function isValidPriceInput(p: number | undefined): p is number {
  return typeof p === "number" && Number.isFinite(p) && p > 0;
}

/** One N(0,1) sample via polar Box–Muller (browser-local PRNG only). */
function standardNormalRand(): number {
  let u = 0;
  let v = 0;
  while (u <= Number.EPSILON) u = Math.random();
  while (v <= Number.EPSILON) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * One GBM step per ticker in `paramsByTicker` with a valid spot price.
 * Returns a `MarketTickPayload` suitable for `applyMarketTick` plus updated rolling histories.
 */
export function runMarketTick(input: RunMarketTickInput): RunMarketTickResult {
  const dt = input.deltaTSeconds ?? 2;
  const rng = input.rng ?? (() => (typeof Math !== "undefined" ? Math.random() : 0.5));

  const pricesOut: Partial<Record<string, number>> = {};
  const historySamples: NonNullable<MarketTickPayload["historySamples"]> = [];
  const historiesOut: Record<string, PricePoint[]> = { ...input.histories };

  for (const ticker of Object.keys(input.paramsByTicker)) {
    const s0 = input.prices[ticker];
    if (!isValidPriceInput(s0)) continue;

    const { mu, sigma } = input.paramsByTicker[ticker]!;
    if (!Number.isFinite(mu) || !Number.isFinite(sigma) || sigma < 0 || !Number.isFinite(dt) || dt <= 0) {
      continue;
    }

    const z = normalFromUniform(rng);
    const next = nextGbmPrice(s0, mu, sigma, dt, z);
    if (!Number.isFinite(next) || next <= 0) continue;

    pricesOut[ticker] = next;

    const prevSeries = input.histories[ticker] ?? [];
    const lastT = prevSeries.length > 0 ? prevSeries[prevSeries.length - 1]!.t : -Infinity;
    const tCoord = Math.max(input.nowMs, lastT + 1);
    const point: PricePoint = { t: tCoord, price: next };

    const series = clampHistory([...prevSeries, point]);
    historiesOut[ticker] = series;
    historySamples.push({ ticker, point });
  }

  const payload: MarketTickPayload = {
    prices: pricesOut,
    ...(historySamples.length > 0 ? { historySamples } : {}),
  };

  return { payload, histories: historiesOut };
}

/**
 * Advance all symbols one GBM step. Deterministic given the same inputs and shocks.
 */
export function stepMarketEngine(input: StepMarketEngineInput): StepMarketEngineOutput {
  const { now, dt, symbols, shocks } = input;
  const prices: Partial<Record<string, number>> = {};
  const histories: Record<string, PricePoint[]> = {};

  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i]!;
    const z = shocks !== undefined ? shocks[i]! : standardNormalRand();
    const nextSpot = nextGbmPrice(sym.spot, sym.mu, sym.sigma, dt, z);
    const point: PricePoint = { t: now, price: nextSpot };
    prices[sym.ticker] = nextSpot;
    histories[sym.ticker] = clampHistory([...sym.history, point]);
  }

  return { prices, histories };
}
