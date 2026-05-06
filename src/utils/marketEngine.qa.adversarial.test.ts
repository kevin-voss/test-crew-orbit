/**
 * QA adversarial coverage — targets gaps acceptance tests do not stress:
 * malformed inputs, boundary dt/shocks alignment, concurrency, and scale.
 * Requirements reference: AC-11 negative path (no NaN/∞/non-positive merged).
 */
import { describe, expect, it } from "vitest";

import type { PricePoint } from "../stores/market/types";

import { MARKET_ENGINE_HISTORY_MAX, runMarketTick, stepMarketEngine } from "./marketEngine";

function makeSeededUniformRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function assertMergeSafePrices(prices: Partial<Record<string, number>>): void {
  for (const [ticker, p] of Object.entries(prices)) {
    expect(Number.isFinite(p), `${ticker}: expected finite price`).toBe(true);
    expect(p!, `${ticker}: expected strictly positive price`).toBeGreaterThan(0);
  }
}

describe("QA adversarial — stepMarketEngine input hygiene (AC-11 negative path)", () => {
  it("does not emit NaN when shocks length is shorter than symbols (caller misalignment)", () => {
    const out = stepMarketEngine({
      now: 1000,
      dt: 0.01,
      shocks: [0.25],
      symbols: [
        { ticker: "A", mu: 0.01, sigma: 0.15, spot: 100, history: [] },
        { ticker: "B", mu: 0.02, sigma: 0.2, spot: 100, history: [] },
      ],
    });
    assertMergeSafePrices(out.prices);
  });

  it("does not emit NaN when dt is zero", () => {
    const out = stepMarketEngine({
      now: 1,
      dt: 0,
      shocks: [0.1],
      symbols: [{ ticker: "Z", mu: 0, sigma: 0.2, spot: 50, history: [] }],
    });
    assertMergeSafePrices(out.prices);
  });

  it("does not emit NaN when dt is negative", () => {
    const out = stepMarketEngine({
      now: 2,
      dt: -0.05,
      shocks: [0],
      symbols: [{ ticker: "Z", mu: 0.001, sigma: 0.1, spot: 99, history: [] }],
    });
    assertMergeSafePrices(out.prices);
  });

  it("does not emit zero or negative prices when spot is non-positive", () => {
    const out = stepMarketEngine({
      now: 3,
      dt: 0.01,
      shocks: [0],
      symbols: [
        { ticker: "ZERO", mu: 0, sigma: 0.1, spot: 0, history: [] },
        { ticker: "NEG", mu: 0, sigma: 0.1, spot: -10, history: [] },
      ],
    });
    expect(out.prices.ZERO).toBeUndefined();
    expect(out.prices.NEG).toBeUndefined();
    assertMergeSafePrices(out.prices);
  });

  it("does not emit NaN when prior spot is NaN", () => {
    const out = stepMarketEngine({
      now: 4,
      dt: 0.01,
      shocks: [0.5],
      symbols: [{ ticker: "BAD", mu: 0, sigma: 0.2, spot: Number.NaN, history: [] }],
    });
    expect(out.prices.BAD).toBeUndefined();
    assertMergeSafePrices(out.prices);
  });

  it("does not emit Infinity when μ or σ are non-finite", () => {
    const out = stepMarketEngine({
      now: 5,
      dt: 0.01,
      shocks: [0, 0],
      symbols: [
        { ticker: "MU_INF", mu: Number.POSITIVE_INFINITY, sigma: 0.1, spot: 100, history: [] },
        { ticker: "SIG_NAN", mu: 0.01, sigma: Number.NaN, spot: 100, history: [] },
      ],
    });
    assertMergeSafePrices(out.prices);
    expect(out.prices.MU_INF).toBeUndefined();
    expect(out.prices.SIG_NAN).toBeUndefined();
  });
});

describe("QA adversarial — runMarketTick resilience", () => {
  it("does not mutate caller-owned history arrays (concurrent-read safety)", () => {
    const hist: PricePoint[] = [{ t: 100, price: 200 }];
    const snapshot = [...hist];
    runMarketTick({
      prices: { Q: 200 },
      paramsByTicker: { Q: { mu: 0.0001, sigma: 0.02 } },
      histories: { Q: hist },
      nowMs: 500,
      rng: makeSeededUniformRng(4242),
    });
    expect(hist).toEqual(snapshot);
  });

  it("handles many tickers in one synchronous tick without throwing", () => {
    const n = 1500;
    const symbols = Array.from({ length: n }, (_, i) => ({
      ticker: `SYM_${i}`,
      mu: 1e-6,
      sigma: 0.01,
      spot: 100,
      history: [] as PricePoint[],
    }));
    expect(() =>
      stepMarketEngine({
        now: 1,
        dt: 0.001,
        shocks: symbols.map(() => 0),
        symbols,
      }),
    ).not.toThrow();
  });

  it("isolates parallel scheduled ticks that share no mutable snapshot", async () => {
    const tasks = Array.from({ length: 40 }, (_, idx) =>
      Promise.resolve().then(() => {
        const rng = makeSeededUniformRng(9000 + idx);
        return runMarketTick({
          prices: { P: 100 },
          paramsByTicker: { P: { mu: 0.0002, sigma: 0.015 } },
          histories: { P: [] },
          nowMs: idx,
          rng,
        });
      }),
    );
    const results = await Promise.all(tasks);
    for (const r of results) {
      assertMergeSafePrices(r.payload.prices);
      expect(r.histories.P!.length).toBeLessThanOrEqual(MARKET_ENGINE_HISTORY_MAX);
    }
  });

  it("treats rng draws outside (0,1) without throwing (adversarial rng)", () => {
    let flip = false;
    const rng = (): number => {
      flip = !flip;
      return flip ? 0 : 1;
    };
    expect(() =>
      runMarketTick({
        prices: { R: 88 },
        paramsByTicker: { R: { mu: 0, sigma: 0.05 } },
        histories: { R: [] },
        nowMs: 777,
        rng,
      }),
    ).not.toThrow();
  });
});

describe("QA adversarial — duplicate ticker rows", () => {
  it("last duplicate ticker wins deterministically without corrupting merge-safe prices", () => {
    const out = stepMarketEngine({
      now: 10,
      dt: 0.02,
      shocks: [1, -1],
      symbols: [
        { ticker: "DUP", mu: 0.05, sigma: 0.1, spot: 100, history: [{ t: 0, price: 99 }] },
        { ticker: "DUP", mu: 0.5, sigma: 0.5, spot: 200, history: [{ t: 1, price: 198 }] },
      ],
    });
    assertMergeSafePrices(out.prices);
    expect(Object.keys(out.prices)).toEqual(["DUP"]);
    expect(out.histories.DUP).toHaveLength(2);
  });
});
