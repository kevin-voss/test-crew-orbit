import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MarketTickPayload } from "../stores/market/types";
import {
  DEFAULT_MARKET_ENGINE_PARAMS,
  runMarketTick,
  type RunMarketTickInput,
  type RunMarketTickResult,
} from "../utils/marketEngine";
import { startMarketTickLoop } from "./marketTickLoop";

function makeMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear(): void {
      map.clear();
    },
    getItem(key: string): string | null {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number): string | null {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string): void {
      map.delete(key);
    },
    setItem(key: string, value: string): void {
      map.set(key, value);
    },
  };
}

/** Deterministic Uniform(0,1) stream */
function makeSeededUniformRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

let mem: Storage;
let useMarketStore: typeof import("../stores/market/marketStore").useMarketStore;

describe("market tick loop (MarketController / marketTickLoop)", () => {
  /** Injectable loop deps — oracle matches planner contract for testability + store bridge */
  function defaultLoopDeps(overrides?: {
    runMarketTickFn?: (
      input: RunMarketTickInput,
    ) => RunMarketTickResult | Promise<RunMarketTickResult>;
  }) {
    const runMarketTickFn = overrides?.runMarketTickFn ?? runMarketTick;
    return {
      intervalMs: 2000,
      getState: () => useMarketStore.getState(),
      applyMarketTick: (payload: MarketTickPayload) => {
        useMarketStore.getState().applyMarketTick(payload);
      },
      runMarketTick: runMarketTickFn as typeof runMarketTick,
      nowMs: () => 10_000,
      rng: makeSeededUniformRng(99),
    };
  }

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
    mem = makeMemoryStorage();
    vi.stubGlobal("localStorage", mem);
    ({ useMarketStore } = await import("../stores/market/marketStore"));
    await useMarketStore.persist.rehydrate();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("schedules ticks at ~2000 ms while the loop is running (foreground cadence)", () => {
    // covers AC-1
    const spy = vi.spyOn(globalThis, "setInterval");

    useMarketStore.getState().applyMarketTick({
      prices: { AAPL: 100, TSLA: 50, AMZN: 120 },
    });

    const handle = startMarketTickLoop(defaultLoopDeps());
    expect(spy).toHaveBeenCalledWith(expect.any(Function), 2000);

    handle.stop();
    spy.mockRestore();
  });

  it("runs one GBM pass covering every then-tracked eligible symbol each tick", () => {
    // covers AC-2
    useMarketStore.getState().applyMarketTick({
      prices: { AAPL: 100, TSLA: 50, AMZN: 120 },
    });

    const runSpy = vi.fn((input: RunMarketTickInput) => runMarketTick(input));
    const handle = startMarketTickLoop(
      defaultLoopDeps({ runMarketTickFn: runSpy as unknown as typeof runMarketTick }),
    );

    vi.advanceTimersByTime(2000);
    expect(runSpy).toHaveBeenCalledTimes(1);
    const arg = runSpy.mock.calls[0]![0];
    expect(Object.keys(arg.paramsByTicker).sort()).toEqual(["AAPL", "AMZN", "TSLA"]);
    for (const sym of ["AAPL", "TSLA", "AMZN"] as const) {
      expect(arg.paramsByTicker[sym]).toEqual(DEFAULT_MARKET_ENGINE_PARAMS[sym]);
      expect(arg.prices[sym]).toBeDefined();
    }

    handle.stop();
  });

  it("applies at most one coherent store write per scheduled tick with the latest payload", () => {
    // covers AC-3
    useMarketStore.getState().applyMarketTick({
      prices: { AAPL: 100 },
    });

    const applySpy = vi.spyOn(useMarketStore.getState(), "applyMarketTick");
    const handle = startMarketTickLoop(defaultLoopDeps());

    vi.advanceTimersByTime(2000);
    expect(applySpy).toHaveBeenCalledTimes(1);
    const firstArg = applySpy.mock.calls[0]![0];
    expect(firstArg.prices.AAPL).toEqual(expect.any(Number));

    applySpy.mockClear();
    vi.advanceTimersByTime(2000);
    expect(applySpy).toHaveBeenCalledTimes(1);

    handle.stop();
    applySpy.mockRestore();
  });

  it("does not use network or server timers for the tick loop", () => {
    // covers AC-4
    const fetchSpy = vi.fn(() => {
      throw new Error("fetch must not be used for the client tick loop");
    });
    vi.stubGlobal("fetch", fetchSpy);

    useMarketStore.getState().applyMarketTick({
      prices: { AAPL: 100 },
    });

    const handle = startMarketTickLoop(defaultLoopDeps());
    vi.advanceTimersByTime(4000);
    expect(fetchSpy).not.toHaveBeenCalled();

    handle.stop();
  });

  it("routes engine inputs through getState and writes only via applyMarketTick", () => {
    // covers AC-10
    const getSpy = vi.spyOn(useMarketStore, "getState");
    const applySpy = vi.spyOn(useMarketStore.getState(), "applyMarketTick");

    useMarketStore.getState().applyMarketTick({
      prices: { AMZN: 200 },
    });

    const handle = startMarketTickLoop(defaultLoopDeps());
    vi.advanceTimersByTime(2000);

    expect(getSpy).toHaveBeenCalled();
    expect(applySpy).toHaveBeenCalled();

    handle.stop();
    getSpy.mockRestore();
    applySpy.mockRestore();
  });

  it("when no eligible tracked symbols exist, the loop keeps running without throwing or junk writes", () => {
    // covers AC-11
    const applySpy = vi.spyOn(useMarketStore.getState(), "applyMarketTick");
    const handle = startMarketTickLoop(defaultLoopDeps());

    expect(useMarketStore.getState().prices).toEqual({});

    vi.advanceTimersByTime(6000);
    expect(applySpy).not.toHaveBeenCalled();

    handle.stop();
    applySpy.mockRestore();
  });

  it("after stop, no further store writes are scheduled from the loop", () => {
    // covers AC-6
    useMarketStore.getState().applyMarketTick({
      prices: { AAPL: 100 },
    });

    const applySpy = vi.spyOn(useMarketStore.getState(), "applyMarketTick");
    const handle = startMarketTickLoop(defaultLoopDeps());
    vi.advanceTimersByTime(2000);
    applySpy.mockClear();

    handle.stop();
    vi.advanceTimersByTime(20_000);
    expect(applySpy).not.toHaveBeenCalled();

    applySpy.mockRestore();
  });

  it("after stop, clears the underlying interval so tick scope ends cleanly", () => {
    // covers AC-6
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });
    const handle = startMarketTickLoop(defaultLoopDeps());
    handle.stop();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it("when the engine step is still in-flight, completing after stop must not apply a late tick", async () => {
    // covers AC-12
    let release!: () => void;
    const runSpy = vi.fn(
      (_input: RunMarketTickInput) =>
        new Promise<RunMarketTickResult>((resolve) => {
          release = () =>
            resolve({
              payload: { prices: { AAPL: 999 } },
              histories: {},
            });
        }),
    );

    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });
    const applySpy = vi.spyOn(useMarketStore.getState(), "applyMarketTick");

    const handle = startMarketTickLoop(
      defaultLoopDeps({
        runMarketTickFn: ((input: RunMarketTickInput) => runSpy(input)) as unknown as typeof runMarketTick,
      }),
    );

    vi.advanceTimersByTime(2000);
    expect(runSpy).toHaveBeenCalled();

    handle.stop();
    release();
    await vi.runOnlyPendingTimersAsync();
    expect(applySpy).not.toHaveBeenCalled();

    applySpy.mockRestore();
  });

  it("starting the loop twice must not stack multiple live intervals", () => {
    // covers AC-13
    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });
    const applySpy = vi.spyOn(useMarketStore.getState(), "applyMarketTick");

    const first = startMarketTickLoop(defaultLoopDeps());
    const second = startMarketTickLoop(defaultLoopDeps());

    vi.advanceTimersByTime(2000);
    expect(applySpy).toHaveBeenCalledTimes(1);

    first.stop();
    second.stop();
    applySpy.mockClear();
    vi.advanceTimersByTime(2000);
    expect(applySpy).not.toHaveBeenCalled();

    applySpy.mockRestore();
  });

  it("targets ~2000 ms between ticks under normal foreground conditions", () => {
    // covers AC-9
    const spy = vi.spyOn(globalThis, "setInterval");
    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });
    const handle = startMarketTickLoop(defaultLoopDeps());
    expect(spy.mock.calls.some((c) => c[1] === 2000)).toBe(true);

    handle.stop();
    spy.mockRestore();
  });

});
