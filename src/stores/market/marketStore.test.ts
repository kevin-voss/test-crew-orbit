import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MARKET_STORE_STORAGE_KEY } from "./marketStore";

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

describe("useMarketStore", () => {
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

  it("starts with $100,000 cash when storage is empty", () => {
    expect(useMarketStore.getState().cash).toBe(100_000);
  });

  it("rehydrates cash, portfolio, history, prices, and selected ticker from persistence after a simulated reload", async () => {
    useMarketStore.getState().applyMarketTick({
      prices: { AAPL: 190 },
      historySamples: [{ ticker: "AAPL", point: { t: 1, price: 189 } }],
    });
    useMarketStore.getState().setSelectedTicker("AAPL");
    useMarketStore.getState().applyTradeResult({
      nextCash: 99_000,
      positions: { AAPL: { shares: 10, averageCost: 100 } },
      trade: {
        id: "t1",
        ticker: "AAPL",
        side: "buy",
        shares: 10,
        pricePerShare: 100,
        timestamp: 42,
      },
    });

    expect(mem.getItem(MARKET_STORE_STORAGE_KEY)).toBeTruthy();

    vi.resetModules();
    vi.stubGlobal("localStorage", mem);
    ({ useMarketStore } = await import("./marketStore"));

    await useMarketStore.persist.rehydrate();

    const s = useMarketStore.getState();
    expect(s.cash).toBe(99_000);
    expect(s.positions.AAPL).toEqual({ shares: 10, averageCost: 100 });
    expect(s.tradeHistory).toHaveLength(1);
    expect(s.tradeHistory[0].id).toBe("t1");
    expect(s.prices.AAPL).toBe(190);
    expect(s.marketHistory.AAPL).toEqual([{ t: 1, price: 189 }]);
    expect(s.selectedTicker).toBe("AAPL");
  });

  it("persists updates after market ticks and trades for later refresh", () => {
    useMarketStore.getState().applyMarketTick({ prices: { MSFT: 300 } });
    const persisted = JSON.parse(mem.getItem(MARKET_STORE_STORAGE_KEY)!);

    expect(persisted.state.prices.MSFT).toBe(300);

    useMarketStore.getState().applyTradeResult({
      nextCash: 120_000,
      positions: {},
      trade: {
        id: "t2",
        ticker: "MSFT",
        side: "sell",
        shares: 1,
        pricePerShare: 300,
        timestamp: 99,
      },
    });

    expect(JSON.parse(mem.getItem(MARKET_STORE_STORAGE_KEY)!).state.cash).toBe(120_000);
    expect(JSON.parse(mem.getItem(MARKET_STORE_STORAGE_KEY)!).state.tradeHistory).toHaveLength(1);
  });

  it("restores persisted tick + trade payloads across module reload without clobbering localStorage mid-test", async () => {
    useMarketStore.getState().applyMarketTick({ prices: { MSFT: 300 } });
    useMarketStore.getState().applyTradeResult({
      nextCash: 120_000,
      positions: {},
      trade: {
        id: "t2",
        ticker: "MSFT",
        side: "sell",
        shares: 1,
        pricePerShare: 300,
        timestamp: 99,
      },
    });

    vi.resetModules();
    vi.stubGlobal("localStorage", mem);

    ({ useMarketStore } = await import("./marketStore"));
    await useMarketStore.persist.rehydrate();

    expect(useMarketStore.getState().cash).toBe(120_000);
    expect(useMarketStore.getState().prices.MSFT).toBe(300);
    expect(useMarketStore.getState().tradeHistory).toHaveLength(1);
  });

  it("does not mutate engine-supplied totals inside applyTradeResult", () => {
    useMarketStore.getState().applyTradeResult({
      nextCash: 81_000,
      positions: {},
      trade: {
        id: "t3",
        ticker: "FOO",
        side: "buy",
        shares: 100,
        pricePerShare: 190,
        timestamp: 0,
      },
    });
    expect(useMarketStore.getState().cash).toBe(81_000);
  });
});
