/**
 * Periodic GBM market tick: `setInterval` at **2000 ms** in the foreground tab.
 * Browsers may throttle timers in background tabs; ticks may pause or coarsen when the tab is not focused.
 */
import { useMarketStore } from "../stores/market/marketStore";
import type { MarketStoreState } from "../stores/market/types";
import {
  DEFAULT_MARKET_ENGINE_PARAMS,
  runMarketTick as defaultRunMarketTick,
  type RunMarketTickInput,
  type RunMarketTickResult,
} from "../utils/marketEngine";

const DEFAULT_INTERVAL_MS = 2000;

/** Default GBM step for hooks outside `market/` — keeps engine imports centralized per acceptance audit AC-7. */
export function executeGbmMarketStep(input: RunMarketTickInput): RunMarketTickResult {
  return defaultRunMarketTick(input);
}

export type CreateMarketTickControllerOptions = {
  getStore?: () => MarketStoreState;
  intervalMs?: number;
  nowMs?: () => number;
  /** Injectable uniform RNG for deterministic tests; production omits and uses the engine default (`Math.random`). */
  rng?: () => number;
  runMarketTick?: (input: RunMarketTickInput) => RunMarketTickResult;
};

export type MarketTickControllerHandle = {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
};

/** Tracked symbols for snapshots: default engine universe ∪ store price keys ∪ history keys. */
function trackedTickerSymbols(state: MarketStoreState): string[] {
  const keys = new Set<string>(Object.keys(DEFAULT_MARKET_ENGINE_PARAMS));
  for (const t of Object.keys(state.prices)) keys.add(t);
  for (const t of Object.keys(state.marketHistory)) keys.add(t);
  return [...keys];
}

function historiesForEngine(state: MarketStoreState): RunMarketTickInput["histories"] {
  const histories: RunMarketTickInput["histories"] = {};
  for (const ticker of trackedTickerSymbols(state)) {
    const series = state.marketHistory[ticker];
    histories[ticker] = series ? [...series] : [];
  }
  return histories;
}

export function createMarketTickController(
  options?: CreateMarketTickControllerOptions,
): MarketTickControllerHandle {
  const getStore = options?.getStore ?? (() => useMarketStore.getState());
  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const nowMs = options?.nowMs ?? (() => Date.now());
  const runMarketTickFn = options?.runMarketTick ?? defaultRunMarketTick;
  const rng = options?.rng;

  let intervalId: ReturnType<typeof setInterval> | null = null;

  const tick = (): void => {
    const state = getStore();
    const deltaTSeconds = intervalMs / 1000;
    const { payload } = runMarketTickFn({
      prices: state.prices,
      paramsByTicker: { ...DEFAULT_MARKET_ENGINE_PARAMS },
      histories: historiesForEngine(state),
      nowMs: nowMs(),
      deltaTSeconds,
      ...(rng !== undefined ? { rng } : {}),
    });

    state.applyMarketTick(payload);
  };

  return {
    start: () => {
      if (intervalId !== null) return;
      intervalId = setInterval(tick, intervalMs);
    },
    stop: () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
    isRunning: () => intervalId !== null,
  };
}
