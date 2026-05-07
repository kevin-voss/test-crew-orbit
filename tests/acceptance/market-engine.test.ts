import { describe, expect, it } from "vitest";
import {
  HISTORY_CAP_PER_SYMBOL,
  TICK_INTERVAL_MS,
  advanceAllSymbolsGbm,
  defaultInstruments,
  trimHistory,
} from "@/utils/marketEngine";

describe("Geometric Brownian Motion and buffers", () => {
  it("updates each tracked price using GBM for a single tick step", () => {
    // covers AC-2
    const instruments = defaultInstruments();
    const prev = Object.fromEntries(
      instruments.map((i) => [i.symbol, i.lastPrice]),
    ) as Record<string, number>;
    const next = advanceAllSymbolsGbm({
      pricesBySymbol: prev,
      instruments,
      dtSeconds: TICK_INTERVAL_MS / 1000,
    });
    for (const sym of ["AAPL", "TSLA", "AMZN"]) {
      expect(next[sym]).toBeDefined();
      expect(next[sym]).not.toBe(prev[sym]);
      expect(Number.isFinite(next[sym])).toBe(true);
    }
  });

  it("uses a 2-second market tick interval for GBM steps", () => {
    // covers AC-2
    expect(TICK_INTERVAL_MS).toBe(2000);
  });

  it("defines distinct sigma and mu for AAPL, TSLA, and AMZN", () => {
    // covers AC-3
    const rows = defaultInstruments();
    const sigmas = rows.map((r) => r.sigma);
    const mus = rows.map((r) => r.mu);
    expect(new Set(sigmas).size).toBe(rows.length);
    expect(new Set(mus).size).toBe(rows.length);
  });

  it("caps per-symbol price history at 100 samples", () => {
    // covers AC-4
    expect(HISTORY_CAP_PER_SYMBOL).toBe(100);
    const long = Array.from({ length: 150 }, (_, i) => ({
      t: i,
      price: 100 + i * 0.01,
    }));
    const capped = trimHistory(long, HISTORY_CAP_PER_SYMBOL);
    expect(capped).toHaveLength(100);
  });
});
