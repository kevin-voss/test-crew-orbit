import { afterEach, describe, expect, it, vi } from "vitest";
import { useMarketStore } from "@/stores/useMarketStore";

function seedEmptyStorage() {
  localStorage.clear();
}

describe("useMarketStore system of record", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("routes portfolio, histories, and trades through the Zustand store API", () => {
    // covers AC-10
    const s = useMarketStore.getState();
    expect(typeof s.cash).toBe("number");
    expect(s.positionsBySymbol).toBeDefined();
    expect(s.priceHistoryBySymbol).toBeDefined();
    expect(s.equityHistory).toBeDefined();
    expect(s.tradeLog).toBeDefined();
    expect(typeof s.buy).toBe("function");
    expect(typeof s.sell).toBe("function");
  });

  it("restores cash, positions, and persisted histories after rehydration", async () => {
    // covers AC-11
    seedEmptyStorage();
    useMarketStore.getState().resetToFirstRun?.();
    useMarketStore.getState().buy?.({ symbol: "AAPL", quantity: 2 });
    const frozen = {
      cash: useMarketStore.getState().cash,
      positions: { ...useMarketStore.getState().positionsBySymbol },
      histories: structuredClone(
        useMarketStore.getState().priceHistoryBySymbol,
      ),
    };
    await useMarketStore.persist.rehydrate?.();
    expect(useMarketStore.getState().cash).toBe(frozen.cash);
    expect(useMarketStore.getState().positionsBySymbol).toEqual(
      frozen.positions,
    );
    expect(useMarketStore.getState().priceHistoryBySymbol).toEqual(
      frozen.histories,
    );
  });

  it("starts with $100,000 cash when no persisted state exists", () => {
    // covers AC-12
    seedEmptyStorage();
    useMarketStore.getState().resetToFirstRun?.();
    expect(useMarketStore.getState().cash).toBe(100_000);
  });

  it("rejects zero or negative buy/sell quantities", () => {
    // covers AC-18
    useMarketStore.getState().resetToFirstRun?.();
    expect(() =>
      useMarketStore.getState().buy?.({ symbol: "AAPL", quantity: 0 }),
    ).toThrow();
    expect(() =>
      useMarketStore.getState().buy?.({ symbol: "AAPL", quantity: -3 }),
    ).toThrow();
    expect(() =>
      useMarketStore.getState().sell?.({ symbol: "AAPL", quantity: 0 }),
    ).toThrow();
    expect(() =>
      useMarketStore.getState().sell?.({ symbol: "AAPL", quantity: -1 }),
    ).toThrow();
  });

  it("sets Max Buy to 0 and blocks buys when cash cannot afford a share", () => {
    // covers AC-19
    useMarketStore.getState().resetToFirstRun?.();
    useMarketStore.getState().seedBroke?.({ symbol: "AAPL", lastPrice: 1e9 });
    expect(useMarketStore.getState().maxBuyFor("AAPL")).toBe(0);
    expect(() =>
      useMarketStore.getState().buy?.({ symbol: "AAPL", quantity: 1 }),
    ).toThrow();
  });

  it("returns to $100,000 cash and empty histories when storage is cleared", () => {
    // covers AC-21
    useMarketStore.persist.clearStorage?.();
    localStorage.clear();
    useMarketStore.getState().resetToFirstRun?.();
    const s = useMarketStore.getState();
    expect(s.cash).toBe(100_000);
    expect(Object.keys(s.positionsBySymbol ?? {})).toHaveLength(0);
    for (const hist of Object.values(s.priceHistoryBySymbol ?? {})) {
      expect(hist?.length ?? 0).toBe(0);
    }
  });
});
