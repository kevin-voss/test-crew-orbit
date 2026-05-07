import { describe, expect, it } from "vitest";
import {
  HISTORY_CAP_PER_SYMBOL,
  SECONDS_PER_YEAR,
  advanceAllSymbolsGbm,
  defaultInstruments,
  trimHistory,
} from "@/utils/marketEngine";

describe("marketEngine adversarial / boundary (non-AC duplicate)", () => {
  it("clamps non-finite prior spot to a positive floor after GBM step", () => {
    // QA risk: AC-2 (GBM path); malformed prior must not poison the store
    const instruments = defaultInstruments();
    const next = advanceAllSymbolsGbm({
      pricesBySymbol: { AAPL: Number.NaN, TSLA: Number.POSITIVE_INFINITY, AMZN: -50 },
      instruments,
      dtSeconds: 2,
    });
    for (const sym of ["AAPL", "TSLA", "AMZN"]) {
      expect(Number.isFinite(next[sym])).toBe(true);
      expect(next[sym] ?? 0).toBeGreaterThanOrEqual(0.01);
    }
  });

  it("uses a no-op diffusion step when dtSeconds is zero (price unchanged)", () => {
    // QA risk: AC-2; zero dt must not jitter prices
    const instruments = defaultInstruments();
    const prev = Object.fromEntries(
      instruments.map((i) => [i.symbol, i.lastPrice]),
    ) as Record<string, number>;
    const next = advanceAllSymbolsGbm({
      pricesBySymbol: prev,
      instruments,
      dtSeconds: 0,
    });
    expect(next).toEqual(prev);
  });

  it("returns the input record unchanged when instruments is empty", () => {
    // QA risk: resilience; controller misconfiguration must not throw
    const prev = { AAPL: 1, TSLA: 2 };
    const next = advanceAllSymbolsGbm({
      pricesBySymbol: prev,
      instruments: [],
      dtSeconds: 2,
    });
    expect(next).toEqual(prev);
  });

  it("never exceeds HISTORY_CAP_PER_SYMBOL when repeatedly trimming oversized arrays", () => {
    // QA risk: AC-4 overflow / memory exhaustion
    const blob = Array.from({ length: 10_000 }, (_, i) => ({ i }));
    expect(trimHistory(blob, HISTORY_CAP_PER_SYMBOL)).toHaveLength(
      HISTORY_CAP_PER_SYMBOL,
    );
  });

  it("defines SECONDS_PER_YEAR large enough that per-tick Δt stays finite positive", () => {
    // QA risk: AC-3 / AC-5 numerical stability on long runs
    const dtYears = 2 / SECONDS_PER_YEAR;
    expect(Number.isFinite(dtYears)).toBe(true);
    expect(dtYears).toBeGreaterThan(0);
  });
});
