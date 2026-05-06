/**
 * Adversarial / edge-case tests for useMarketStore.
 * Does not replace acceptance tests in marketStore.test.ts (AC-1–AC-3 happy paths).
 * Traceability: complements AC-2 (invalid persistence), AC-3 (pathological updates / persistence failures).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_INITIAL_CASH,
  MARKET_STORE_STORAGE_KEY,
} from "./marketStore";

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

let mem: Storage;
let useMarketStore: typeof import("./marketStore").useMarketStore;

describe("useMarketStore (QA adversarial)", () => {
  beforeEach(async () => {
    vi.unstubAllGlobals();
    vi.resetModules();
    mem = makeMemoryStorage();
    vi.stubGlobal("localStorage", mem);
    ({ useMarketStore } = await import("./marketStore"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rehydrate survives corrupt JSON in storage and falls back without throwing", async () => {
    mem.setItem(MARKET_STORE_STORAGE_KEY, "not-json{");
    vi.resetModules();
    vi.stubGlobal("localStorage", mem);
    ({ useMarketStore } = await import("./marketStore"));
    await expect(useMarketStore.persist.rehydrate()).resolves.toBeUndefined();
    expect(useMarketStore.getState().cash).toBe(DEFAULT_INITIAL_CASH);
  });

  it("merge replaces non-finite persisted cash with default", async () => {
    const blob = {
      state: {
        cash: Number.NaN,
        positions: {},
        tradeHistory: [],
        marketHistory: {},
        selectedTicker: null,
        prices: {},
      },
      version: 0,
    };
    mem.setItem(MARKET_STORE_STORAGE_KEY, JSON.stringify(blob));
    vi.resetModules();
    vi.stubGlobal("localStorage", mem);
    ({ useMarketStore } = await import("./marketStore"));
    await useMarketStore.persist.rehydrate();
    expect(useMarketStore.getState().cash).toBe(DEFAULT_INITIAL_CASH);
  });

  it("merge uses defaults for wrong-shaped persisted collections", async () => {
    const blob = {
      state: {
        cash: 50_000,
        positions: null,
        tradeHistory: {},
        marketHistory: "oops",
        selectedTicker: 123,
        prices: [],
      },
      version: 0,
    };
    mem.setItem(MARKET_STORE_STORAGE_KEY, JSON.stringify(blob));
    vi.resetModules();
    vi.stubGlobal("localStorage", mem);
    ({ useMarketStore } = await import("./marketStore"));
    await useMarketStore.persist.rehydrate();
    const s = useMarketStore.getState();
    expect(s.cash).toBe(50_000);
    expect(s.positions).toEqual({});
    expect(s.tradeHistory).toEqual([]);
    expect(s.marketHistory).toEqual({});
    expect(s.selectedTicker).toBeNull();
    expect(s.prices).toEqual({});
  });

  it("applyMarketTick ignores non-finite prices but keeps valid keys in the same payload", () => {
    useMarketStore.getState().applyMarketTick({
      prices: {
        OK: 10,
        NAN: Number.NaN,
        INF: Number.POSITIVE_INFINITY,
        NEG_INF: Number.NEGATIVE_INFINITY,
      },
    });
    const { prices } = useMarketStore.getState();
    expect(prices.OK).toBe(10);
    expect(prices.NAN).toBeUndefined();
    expect(prices.INF).toBeUndefined();
  });

  it("applyMarketTick skips history points with non-finite price", () => {
    useMarketStore.getState().applyMarketTick({
      prices: {},
      historySamples: [
        { ticker: "A", point: { t: 1, price: Number.NaN } },
        { ticker: "B", point: { t: 2, price: 5 } },
      ],
    });
    expect(useMarketStore.getState().marketHistory.A ?? []).toHaveLength(0);
    expect(useMarketStore.getState().marketHistory.B).toEqual([{ t: 2, price: 5 }]);
  });

  it("marketHistory clamps to 5000 points per ticker (boundary)", () => {
    const many = Array.from({ length: 6000 }, (_, i) => ({ t: i, price: 1 }));
    useMarketStore.getState().applyMarketTick({
      prices: {},
      historySamples: [{ ticker: "BIG", point: many[0]! }],
    });
    for (let i = 1; i < many.length; i++) {
      useMarketStore.getState().applyMarketTick({
        prices: {},
        historySamples: [{ ticker: "BIG", point: many[i]! }],
      });
    }
    const series = useMarketStore.getState().marketHistory.BIG ?? [];
    expect(series).toHaveLength(5000);
    expect(series[0]!.t).toBe(1000);
    expect(series.at(-1)!.t).toBe(5999);
  });

  it("rapid interleaved tick and trade updates preserve final authoritative values", () => {
    for (let i = 0; i < 200; i++) {
      useMarketStore.getState().applyMarketTick({
        prices: { X: 100 + i },
      });
      useMarketStore.getState().applyTradeResult({
        nextCash: 90_000 - i,
        positions: { X: { shares: i + 1, averageCost: 1 } },
        trade: {
          id: `id-${i}`,
          ticker: "X",
          side: "buy",
          shares: 1,
          pricePerShare: 1,
          timestamp: i,
        },
      });
    }
    const s = useMarketStore.getState();
    expect(s.prices.X).toBe(299);
    expect(s.cash).toBe(90_000 - 199);
    expect(s.positions.X?.shares).toBe(200);
    expect(s.tradeHistory).toHaveLength(200);
  });

  it("when setItem throws (e.g. quota), in-memory state still updates", () => {
    const throwing: Storage = {
      ...mem,
      setItem(): void {
        throw new DOMException("QuotaExceededError");
      },
    };
    vi.stubGlobal("localStorage", throwing);
    expect(() =>
      useMarketStore.getState().applyMarketTick({ prices: { Q: 1 } }),
    ).not.toThrow();
    expect(useMarketStore.getState().prices.Q).toBe(1);
  });

  it("applyTradeResult allows non-finite nextCash from engine (stores NaN)", () => {
    useMarketStore.getState().applyTradeResult({
      nextCash: Number.NaN,
      positions: {},
      trade: {
        id: "bad",
        ticker: "Z",
        side: "sell",
        shares: 1,
        pricePerShare: 1,
        timestamp: 0,
      },
    });
    expect(useMarketStore.getState().cash).toBeNaN();
  });
});
