/**
 * Client-side market tick orchestration: periodic GBM steps bridged into the persisted market store.
 *
 * **Cadence:** the loop uses `setInterval` at 2000 ms (foreground tab). Browsers may throttle timers
 * in background tabs; ticks are expected to pause or coarsen when the tab is not in the foreground.
 */
import type { MarketStoreState, MarketTickPayload } from "../stores/market/types";
import {
  DEFAULT_MARKET_ENGINE_PARAMS,
  type GbmParams,
  type RunMarketTickInput,
  type RunMarketTickResult,
} from "../utils/marketEngine";

export type MarketTickLoopDeps = {
  intervalMs: number;
  getState: () => MarketStoreState;
  applyMarketTick: (payload: MarketTickPayload) => void;
  runMarketTick: (input: RunMarketTickInput) => RunMarketTickResult | Promise<RunMarketTickResult>;
  nowMs: () => number;
  rng?: () => number;
};

export type MarketTickLoopHandle = {
  stop: () => void;
};

let nextLoopHandleId = 0;
let activeIntervalId: ReturnType<typeof setInterval> | null = null;
let activeLoopHandleId: number | null = null;

function buildRunInput(
  state: MarketStoreState,
  nowMs: number,
  rng?: () => number,
): RunMarketTickInput | null {
  const paramsByTicker: Record<string, GbmParams> = {};
  const prices: Partial<Record<string, number>> = {};
  const histories = { ...state.marketHistory };

  for (const ticker of Object.keys(DEFAULT_MARKET_ENGINE_PARAMS) as Array<
    keyof typeof DEFAULT_MARKET_ENGINE_PARAMS
  >) {
    const spot = state.prices[ticker];
    if (typeof spot === "number" && Number.isFinite(spot) && spot > 0) {
      paramsByTicker[ticker] = DEFAULT_MARKET_ENGINE_PARAMS[ticker];
      prices[ticker] = spot;
    }
  }

  if (Object.keys(paramsByTicker).length === 0) return null;

  return {
    prices,
    paramsByTicker,
    histories,
    nowMs,
    deltaTSeconds: 2,
    ...(rng ? { rng } : {}),
  };
}

function payloadHasUpdates(payload: MarketTickPayload): boolean {
  const priceKeys = Object.keys(payload.prices);
  if (priceKeys.length > 0) return true;
  return (payload.historySamples?.length ?? 0) > 0;
}

/**
 * Starts a single shared tick loop. Starting again replaces any previous interval so only one live loop runs.
 */
export function startMarketTickLoop(deps: MarketTickLoopDeps): MarketTickLoopHandle {
  const handleId = ++nextLoopHandleId;
  let latestRun = 0;

  if (activeIntervalId !== null) {
    clearInterval(activeIntervalId);
    activeIntervalId = null;
  }
  activeLoopHandleId = handleId;

  const runOnce = (): void => {
    if (activeLoopHandleId !== handleId) return;

    const state = deps.getState();
    const input = buildRunInput(state, deps.nowMs(), deps.rng);
    if (!input) return;

    const runId = ++latestRun;
    const outcome = deps.runMarketTick(input);

    const finish = (result: RunMarketTickResult): void => {
      if (activeLoopHandleId !== handleId || runId !== latestRun) return;
      if (!payloadHasUpdates(result.payload)) return;
      deps.applyMarketTick(result.payload);
    };

    if (outcome instanceof Promise) {
      void outcome.then(finish);
    } else {
      finish(outcome);
    }
  };

  activeIntervalId = setInterval(() => {
    void runOnce();
  }, deps.intervalMs);

  return {
    stop(): void {
      if (activeLoopHandleId !== handleId) return;
      latestRun++;
      if (activeIntervalId !== null) {
        clearInterval(activeIntervalId);
        activeIntervalId = null;
      }
      activeLoopHandleId = null;
    },
  };
}
