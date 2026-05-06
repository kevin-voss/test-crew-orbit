import { useMarketStore } from "../stores/market/marketStore";
import type { MarketStoreState } from "../stores/market/types";
import {
  DEFAULT_MARKET_ENGINE_PARAMS,
  runMarketTick as defaultRunMarketTick,
  type RunMarketTickInput,
  type RunMarketTickResult,
} from "../utils/marketEngine";

const DEFAULT_INTERVAL_MS = 2000;

export type CreateMarketTickControllerOptions = {
  getStore?: () => MarketStoreState;
  intervalMs?: number;
  nowMs?: () => number;
  runMarketTick?: (input: RunMarketTickInput) => RunMarketTickResult;
};

export type MarketTickControllerHandle = {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
};

function historiesForEngine(state: MarketStoreState): RunMarketTickInput["histories"] {
  const histories: RunMarketTickInput["histories"] = {};
  for (const ticker of Object.keys(DEFAULT_MARKET_ENGINE_PARAMS)) {
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
