import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_MARKET_ENGINE_PARAMS,
  MARKET_ENGINE_HISTORY_MAX,
  runMarketTick,
} from "./marketEngine";
import { MARKET_STORE_STORAGE_KEY } from "../stores/market/marketStore";

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

/** Deterministic Uniform(0,1) stream — same LCG as `marketEngine.test.ts`. */
function makeSeededUniformRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

let mem: Storage;
let useMarketStore: typeof import("../stores/market/marketStore").useMarketStore;

describe("runMarketTick → applyMarketTick (store integration)", () => {
  beforeEach(async () => {
    vi.unstubAllGlobals();
    vi.resetModules();
    mem = makeMemoryStorage();
    vi.stubGlobal("localStorage", mem);
    ({ useMarketStore } = await import("../stores/market/marketStore"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("merges engine MarketTickPayload without reshaping; prices and histories stay finite per symbol", () => {
    const triple = ["AAPL", "TSLA", "AMZN"] as const;

    const snapshot = {
      prices: { AAPL: 150.25, TSLA: 242.5, AMZN: 118.75 },
      paramsByTicker: {
        AAPL: DEFAULT_MARKET_ENGINE_PARAMS.AAPL,
        TSLA: DEFAULT_MARKET_ENGINE_PARAMS.TSLA,
        AMZN: DEFAULT_MARKET_ENGINE_PARAMS.AMZN,
      },
      histories: {
        AAPL: [
          { t: 900, price: 149.5 },
          { t: 950, price: 150.0 },
        ],
        TSLA: [
          { t: 900, price: 241.0 },
          { t: 950, price: 241.75 },
        ],
        AMZN: [
          { t: 900, price: 118.0 },
          { t: 950, price: 118.4 },
        ],
      },
    };

    const rng = makeSeededUniformRng(42);
    const { payload } = runMarketTick({
      prices: snapshot.prices,
      paramsByTicker: snapshot.paramsByTicker,
      histories: snapshot.histories,
      nowMs: 10_000,
      deltaTSeconds: 2,
      rng,
    });

    for (const sym of triple) {
      const p = payload.prices[sym];
      expect(p, `${sym} engine price`).toEqual(expect.any(Number));
      expect(Number.isFinite(p), `${sym} engine price finite`).toBe(true);
    }

    useMarketStore.getState().applyMarketTick(payload);

    const s = useMarketStore.getState();
    for (const sym of triple) {
      expect(s.prices[sym]).toBe(payload.prices[sym]);
      expect(Number.isFinite(s.prices[sym])).toBe(true);
    }

    expect(payload.historySamples).toBeDefined();
    const byTicker = new Map(payload.historySamples!.map((h) => [h.ticker, h.point] as const));
    for (const sym of triple) {
      const point = byTicker.get(sym)!;
      expect(s.marketHistory[sym]).toEqual([point]);
      expect(point.price).toBe(payload.prices[sym]);
      expect(Number.isFinite(point.price)).toBe(true);
      expect(point.t).toBeGreaterThan(snapshot.histories[sym][snapshot.histories[sym].length - 1]!.t);
    }

    expect(s.prices.AAPL).not.toBe(s.prices.TSLA);
    expect(s.prices.TSLA).not.toBe(s.prices.AMZN);
  });

  it("does not let non-finite tick fields clobber other symbols after a good engine merge", () => {
    const snapshot = {
      prices: { AAPL: 100, TSLA: 200, AMZN: 300 },
      paramsByTicker: {
        AAPL: { mu: 0.0001, sigma: 0.01 },
        TSLA: { mu: 0.0004, sigma: 0.04 },
        AMZN: { mu: 0.0009, sigma: 0.09 },
      },
      histories: { AAPL: [], TSLA: [], AMZN: [] },
    };

    const { payload } = runMarketTick({
      prices: snapshot.prices,
      paramsByTicker: snapshot.paramsByTicker,
      histories: snapshot.histories,
      nowMs: 5_000,
      deltaTSeconds: 2,
      rng: makeSeededUniformRng(7),
    });

    useMarketStore.getState().applyMarketTick(payload);

    const before = useMarketStore.getState();
    const tslaPrice = before.prices.TSLA;
    const amznHistLen = before.marketHistory.AMZN?.length ?? 0;

    useMarketStore.getState().applyMarketTick({
      prices: { AAPL: Number.NaN, TSLA: Number.POSITIVE_INFINITY },
      historySamples: [
        { ticker: "AAPL", point: { t: 99_000, price: Number.NaN } },
        { ticker: "AMZN", point: { t: 99_000, price: Number.NaN } },
      ],
    });

    const after = useMarketStore.getState();
    expect(Number.isFinite(after.prices.AAPL)).toBe(true);
    expect(after.prices.AAPL).toBe(before.prices.AAPL);
    expect(after.prices.TSLA).toBe(tslaPrice);
    expect(after.marketHistory.AMZN).toHaveLength(amznHistLen);
    expect(Number.isFinite(after.prices.AMZN)).toBe(true);
    expect(after.prices.AMZN).toBe(before.prices.AMZN);
  });

  it("engine rolling histories stay capped at MARKET_ENGINE_HISTORY_MAX through many ticks", () => {
    let prices: Partial<Record<string, number>> = { AAPL: 100, TSLA: 100, AMZN: 100 };
    let histories: Record<string, import("../stores/market/types").PricePoint[]> = {
      AAPL: [],
      TSLA: [],
      AMZN: [],
    };
    const params = {
      AAPL: DEFAULT_MARKET_ENGINE_PARAMS.AAPL,
      TSLA: DEFAULT_MARKET_ENGINE_PARAMS.TSLA,
      AMZN: DEFAULT_MARKET_ENGINE_PARAMS.AMZN,
    };
    const rng = makeSeededUniformRng(100);

    for (let i = 0; i < MARKET_ENGINE_HISTORY_MAX + 15; i++) {
      const { payload, histories: nextH } = runMarketTick({
        prices,
        paramsByTicker: params,
        histories,
        nowMs: 1_000 + i * 50,
        deltaTSeconds: 2,
        rng,
      });
      histories = nextH;
      prices = { ...prices, ...payload.prices };
      useMarketStore.getState().applyMarketTick(payload);
    }

    for (const sym of ["AAPL", "TSLA", "AMZN"] as const) {
      expect(histories[sym]!.length).toBe(MARKET_ENGINE_HISTORY_MAX);
      for (const pt of histories[sym]!) {
        expect(Number.isFinite(pt.price)).toBe(true);
      }
    }

    const s = useMarketStore.getState();
    for (const sym of ["AAPL", "TSLA", "AMZN"] as const) {
      for (const pt of s.marketHistory[sym]!) {
        expect(Number.isFinite(pt.price)).toBe(true);
      }
    }

    expect(mem.getItem(MARKET_STORE_STORAGE_KEY)).toBeTruthy();
  });
});
