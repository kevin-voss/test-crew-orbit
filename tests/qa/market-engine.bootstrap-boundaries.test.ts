import { describe, expect, it } from "vitest";
import {
  HISTORY_CAP_PER_SYMBOL,
  advanceAllSymbolsGbm,
  buildInitialHistories,
  computeNextTick,
  defaultInstruments,
} from "@/utils/marketEngine";

describe("marketEngine bootstrap & malformed clock steps (QA-only)", () => {
  it("buildInitialHistories emits exactly HISTORY_CAP_PER_SYMBOL points per symbol", () => {
    const instruments = defaultInstruments();
    const histories = buildInitialHistories(instruments, Date.now());
    for (const inst of instruments) {
      expect(histories[inst.symbol]).toHaveLength(HISTORY_CAP_PER_SYMBOL);
    }
  });

  it("keeps timestamps strictly increasing within each bootstrapped series", () => {
    const histories = buildInitialHistories(defaultInstruments(), 1_700_000_000_000);
    for (const series of Object.values(histories)) {
      for (let i = 1; i < series.length; i++) {
        expect(series[i]!.t).toBeGreaterThan(series[i - 1]!.t);
      }
    }
  });

  it("negative dtSeconds still yields finite positive floors (malformed controller clock)", () => {
    const instruments = defaultInstruments();
    const prev = Object.fromEntries(
      instruments.map((i) => [i.symbol, i.lastPrice]),
    ) as Record<string, number>;
    const next = advanceAllSymbolsGbm({
      pricesBySymbol: prev,
      instruments,
      dtSeconds: -2,
    });
    for (const sym of Object.keys(next)) {
      expect(Number.isFinite(next[sym])).toBe(true);
      expect(next[sym]).toBeGreaterThanOrEqual(0.01);
    }
  });

  it("computeNextTick survives empty instruments without throwing", () => {
    expect(() =>
      computeNextTick({
        pricesBySymbol: { AAPL: 100 },
        instruments: [],
        dtSeconds: 2,
      }),
    ).not.toThrow();
  });
});
