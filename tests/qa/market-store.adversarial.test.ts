import { afterEach, describe, expect, it, vi } from "vitest";
import { HISTORY_CAP_PER_SYMBOL } from "@/utils/marketEngine";

import { useMarketStore } from "@/stores/useMarketStore";

describe("useMarketStore adversarial flows (non-AC duplicate)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    useMarketStore.persist.clearStorage?.();
    useMarketStore.getState().resetToFirstRun?.();
  });

  it("rejects non-integer buy quantities including IEEE754 fractions", () => {
    // QA risk: AC-7 / injection via quantity parsing
    useMarketStore.getState().resetToFirstRun?.();
    expect(() =>
      useMarketStore.getState().buy?.({ symbol: "AAPL", quantity: 1.0000000001 }),
    ).toThrow();
  });

  it("rejects buys for unknown ticker symbols deterministically", () => {
    // QA risk: AC-12 cash integrity
    useMarketStore.getState().resetToFirstRun?.();
    expect(() =>
      useMarketStore.getState().buy?.({ symbol: "NOT_A_SYMBOL", quantity: 1 }),
    ).toThrow("unknown symbol");
  });

  it("blocks oversell even when attacker requests MAX_SAFE_INTEGER shares", () => {
    // QA risk: AC-12 integer overflow semantics in positions
    useMarketStore.getState().resetToFirstRun?.();
    useMarketStore.getState().buy?.({ symbol: "AAPL", quantity: 1 });
    expect(() =>
      useMarketStore
        .getState()
        .sell?.({ symbol: "AAPL", quantity: Number.MAX_SAFE_INTEGER }),
    ).toThrow("insufficient shares");
  });

  it("maintains capped per-symbol history under bursty synchronous tick bursts", () => {
    // QA race-style load: AC-8 / AC-4 coherency
    useMarketStore.getState().resetToFirstRun?.();
    useMarketStore.getState().ensurePriceHistoriesSeeded?.();
    for (let i = 0; i < 400; i++) {
      useMarketStore.getState().applyMarketTick();
    }
    const hist = useMarketStore.getState().priceHistoryBySymbol ?? {};
    for (const symbol of ["AAPL", "TSLA", "AMZN"]) {
      const len = hist[symbol]?.length ?? 0;
      expect(len).toBeGreaterThan(0);
      expect(len).toBeLessThanOrEqual(HISTORY_CAP_PER_SYMBOL);
    }
  });

  it("isolates fractional sell quantities like buys", () => {
    // QA symmetry: malformed sell quantity
    useMarketStore.getState().resetToFirstRun?.();
    useMarketStore.getState().buy?.({ symbol: "TSLA", quantity: 2 });
    expect(() =>
      useMarketStore.getState().sell?.({ symbol: "TSLA", quantity: 2.5 }),
    ).toThrow("invalid quantity");
  });

  it("recovers from corrupted persisted JSON instead of trapping the dashboard", async () => {
    // QA risk: AC-11 hardening vs storage tampering
    localStorage.clear();
    useMarketStore.persist.clearStorage?.();
    localStorage.setItem("sim-trading-storage", "{not-json}");
    await useMarketStore.persist.rehydrate?.();
    expect(() => useMarketStore.getState().applyMarketTick()).not.toThrow();
  });
});
