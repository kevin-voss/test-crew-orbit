import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { MarketTickPayload, PricePoint } from "../stores/market/types";

/**
 * Contract surface expected from `marketEngine.ts` (implementer-provided).
 * Tests assert behavior only — they must fail until the module exists and satisfies ACs.
 */
import {
  DEFAULT_MARKET_ENGINE_PARAMS,
  runMarketTick,
} from "./marketEngine";

function engineDir(): string {
  return dirname(fileURLToPath(import.meta.url));
}

function engineFilePath(): string {
  return join(engineDir(), "marketEngine.ts");
}

function readEngineSource(): string {
  return readFileSync(engineFilePath(), "utf8");
}

/** Deterministic uniform [0,1) stream for AC-8 / AC-10 without external RNG services */
function makeSeededUniformRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function assertFinitePositivePrices(
  prices: Partial<Record<string, number>>,
  tickers: string[],
): void {
  for (const ticker of tickers) {
    const p = prices[ticker];
    expect(p, ticker).toEqual(expect.any(Number));
    expect(Number.isFinite(p), ticker).toBe(true);
    expect(p!, ticker).toBeGreaterThan(0);
  }
}

function payloadShapeMatchesStoreMerge(p: MarketTickPayload): void {
  expect(p.prices).toEqual(expect.any(Object));
  if (p.historySamples !== undefined) {
    expect(Array.isArray(p.historySamples)).toBe(true);
    for (const row of p.historySamples!) {
      expect(row.ticker).toEqual(expect.any(String));
      expect(row.point.t).toEqual(expect.any(Number));
      expect(row.point.price).toEqual(expect.any(Number));
    }
  }
}

describe("runMarketTick", () => {
  const triple = ["AAPL", "TSLA", "AMZN"] as const;

  const distinctParams = {
    AAPL: { mu: 0.0001, sigma: 0.01 },
    TSLA: { mu: 0.0004, sigma: 0.04 },
    AMZN: { mu: 0.0009, sigma: 0.09 },
  } as const;

  it("advances every tracked symbol with finite positive prices from a GBM step", () => {
    // covers AC-1
    const rng = makeSeededUniformRng(42);
    const prev = { AAPL: 100, TSLA: 200, AMZN: 300 };
    const { payload } = runMarketTick({
      prices: prev,
      paramsByTicker: distinctParams,
      histories: { AAPL: [], TSLA: [], AMZN: [] },
      nowMs: 2000,
      deltaTSeconds: 2,
      rng,
    });
    assertFinitePositivePrices(payload.prices, [...triple]);
    expect(payload.prices.AAPL).not.toBe(prev.AAPL);
    expect(payload.prices.TSLA).not.toBe(prev.TSLA);
    expect(payload.prices.AMZN).not.toBe(prev.AMZN);
  });

  it("does not force identical dynamics when μ and σ differ across symbols", () => {
    // covers AC-2
    const series: Record<string, number[]> = { AAPL: [], TSLA: [], AMZN: [] };
    let prices: Partial<Record<string, number>> = {
      AAPL: 100,
      TSLA: 100,
      AMZN: 100,
    };
    let histories: Record<string, PricePoint[]> = {
      AAPL: [],
      TSLA: [],
      AMZN: [],
    };
    const rng = makeSeededUniformRng(7);
    for (let tick = 0; tick < 24; tick++) {
      const { payload, histories: nextHist } = runMarketTick({
        prices,
        paramsByTicker: distinctParams,
        histories,
        nowMs: 1000 + tick * 100,
        deltaTSeconds: 2,
        rng,
      });
      histories = nextHist;
      prices = { ...prices, ...payload.prices };
      for (const t of triple) {
        series[t].push(payload.prices[t]!);
      }
    }
    expect(series.AAPL).not.toEqual(series.TSLA);
    expect(series.AAPL).not.toEqual(series.AMZN);
    expect(series.TSLA).not.toEqual(series.AMZN);
  });

  it("updates AAPL, TSLA, and AMZN independently within a single tick invocation", () => {
    // covers AC-3
    const rng = makeSeededUniformRng(99);
    const { payload } = runMarketTick({
      prices: { AAPL: 50, TSLA: 150, AMZN: 250 },
      paramsByTicker: distinctParams,
      histories: { AAPL: [], TSLA: [], AMZN: [] },
      nowMs: 5000,
      rng,
    });
    assertFinitePositivePrices(payload.prices, [...triple]);
  });

  it("exposes default presets for AAPL, TSLA, and AMZN with visibly distinct parameters", () => {
    // covers AC-3, AC-2
    expect(DEFAULT_MARKET_ENGINE_PARAMS.AAPL).toEqual(
      expect.objectContaining({ mu: expect.any(Number), sigma: expect.any(Number) }),
    );
    expect(DEFAULT_MARKET_ENGINE_PARAMS.TSLA).toEqual(
      expect.objectContaining({ mu: expect.any(Number), sigma: expect.any(Number) }),
    );
    expect(DEFAULT_MARKET_ENGINE_PARAMS.AMZN).toEqual(
      expect.objectContaining({ mu: expect.any(Number), sigma: expect.any(Number) }),
    );
    const pairs: Array<[string, string]> = [
      ["AAPL", "TSLA"],
      ["AAPL", "AMZN"],
      ["TSLA", "AMZN"],
    ];
    for (const [a, b] of pairs) {
      const pa = DEFAULT_MARKET_ENGINE_PARAMS[a as keyof typeof DEFAULT_MARKET_ENGINE_PARAMS];
      const pb = DEFAULT_MARKET_ENGINE_PARAMS[b as keyof typeof DEFAULT_MARKET_ENGINE_PARAMS];
      const sameMu = pa.mu === pb.mu && pa.sigma === pb.sigma;
      expect(sameMu, `${a} vs ${b}`).toBe(false);
    }
  });

  it("returns payloads consumable as MarketTickPayload without reshaping", () => {
    // covers AC-6
    const { payload } = runMarketTick({
      prices: { AAPL: 120 },
      paramsByTicker: { AAPL: distinctParams.AAPL },
      histories: { AAPL: [] },
      nowMs: 8000,
      rng: makeSeededUniformRng(3),
    });
    payloadShapeMatchesStoreMerge(payload);
  });

  it("respects explicit snapshots so repeated calls with the same inputs and rng match", () => {
    // covers AC-10
    const makeSnapshot = () => ({
      prices: { AAPL: 88, TSLA: 188 },
      paramsByTicker: {
        AAPL: distinctParams.AAPL,
        TSLA: distinctParams.TSLA,
      },
      histories: {
        AAPL: [{ t: 1, price: 88 }],
        TSLA: [{ t: 1, price: 188 }],
      },
      nowMs: 9000,
      deltaTSeconds: 2,
      rng: makeSeededUniformRng(12345),
    });
    const first = runMarketTick(makeSnapshot());
    const second = runMarketTick(makeSnapshot());
    expect(second.payload).toEqual(first.payload);
    expect(second.histories).toEqual(first.histories);
  });

  it("never retains more than 100 engine-managed samples per symbol across repeated ticks", () => {
    // covers AC-5
    let prices: Partial<Record<string, number>> = {
      AAPL: 100,
      TSLA: 110,
      AMZN: 120,
    };
    let histories: Record<string, PricePoint[]> = {
      AAPL: [],
      TSLA: [],
      AMZN: [],
    };
    const rng = makeSeededUniformRng(500);
    for (let i = 0; i < 140; i++) {
      const out = runMarketTick({
        prices,
        paramsByTicker: distinctParams,
        histories,
        nowMs: 10_000 + i * 50,
        deltaTSeconds: 2,
        rng,
      });
      histories = out.histories;
      prices = { ...prices, ...out.payload.prices };
      for (const t of triple) {
        expect(out.histories[t].length).toBeLessThanOrEqual(100);
      }
    }
  });

  it("can grow cold-start histories toward the 100-sample cap without exceeding it", () => {
    // covers AC-12
    let prices: Partial<Record<string, number>> = { AAPL: 100 };
    let histories: Record<string, PricePoint[]> = { AAPL: [] };
    const rng = makeSeededUniformRng(777);
    let maxSeen = 0;
    for (let i = 0; i < 110; i++) {
      const out = runMarketTick({
        prices,
        paramsByTicker: { AAPL: distinctParams.AAPL },
        histories,
        nowMs: 20_000 + i * 10,
        rng,
      });
      histories = out.histories;
      prices = { ...prices, ...out.payload.prices };
      maxSeen = Math.max(maxSeen, out.histories.AAPL.length);
    }
    expect(maxSeen).toBe(100);
  });

  it("emits strictly increasing time coordinates versus the last stored sample per ticker", () => {
    // covers AC-13
    let prices: Partial<Record<string, number>> = { MSFT: 50 };
    let histories: Record<string, PricePoint[]> = {
      MSFT: [{ t: 500, price: 50 }],
    };
    const rng = makeSeededUniformRng(321);
    let lastT = histories.MSFT.at(-1)!.t;
    for (let i = 0; i < 5; i++) {
      const nextT = 600 + i * 25;
      const out = runMarketTick({
        prices,
        paramsByTicker: { MSFT: { mu: 0.0002, sigma: 0.02 } },
        histories,
        nowMs: nextT,
        rng,
      });
      const appended = out.payload.historySamples?.find((s) => s.ticker === "MSFT");
      expect(appended?.point.t).toBeDefined();
      expect(appended!.point.t).toBeGreaterThan(lastT);
      lastT = appended!.point.t;
      histories = out.histories;
      prices = { ...prices, ...out.payload.prices };
    }
  });

  it("omits symbols that would yield non-finite or non-positive prices from merged price maps", () => {
    // covers AC-11
    const rng = makeSeededUniformRng(600);
    const { payload } = runMarketTick({
      prices: { GOOD: 75, BAD: Number.NaN },
      paramsByTicker: {
        GOOD: { mu: 0.0001, sigma: 0.01 },
        BAD: { mu: 0.0001, sigma: 0.01 },
      },
      histories: { GOOD: [], BAD: [] },
      nowMs: 30_000,
      rng,
    });
    assertFinitePositivePrices(payload.prices, ["GOOD"]);
    expect(payload.prices.BAD).toBeUndefined();
    for (const [, price] of Object.entries(payload.prices)) {
      expect(Number.isFinite(price)).toBe(true);
      expect(price).toBeGreaterThan(0);
    }
  });

  it("uses an injectable uniform RNG hook without external randomness services", () => {
    // covers AC-8
    const draws: number[] = [];
    const rng = (): number => {
      const v = draws.length * 0.01;
      draws.push(v);
      return v % 1;
    };
    runMarketTick({
      prices: { AAPL: 100 },
      paramsByTicker: { AAPL: distinctParams.AAPL },
      histories: { AAPL: [] },
      nowMs: 40_000,
      rng,
    });
    expect(draws.length).toBeGreaterThan(0);
  });
});

describe("browser-only GBM module constraints", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps the GBM implementation file under utils/marketEngine.ts", () => {
    // covers AC-7
    expect(existsSync(engineFilePath())).toBe(true);
    expect(engineFilePath().replace(/\\/g, "/")).toMatch(/\/utils\/marketEngine\.ts$/);
  });

  it("avoids network primitives inside the engine module source", () => {
    // covers AC-4
    const src = readEngineSource();
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/\bXMLHttpRequest\b/);
    expect(src).not.toMatch(/from\s+["']node:http["']/);
    expect(src).not.toMatch(/from\s+["']https?:\/\//);
  });

  it("does not couple to dashboard or chart folders via static imports", () => {
    // covers AC-9
    const src = readEngineSource();
    expect(src).not.toMatch(
      /from\s+["'](?:\.{1,2}\/)*(?:components|pages|dashboard|widgets)\//,
    );
    expect(src).not.toMatch(/from\s+["'][^"']*\/(components|dashboard)\//);
  });

  it("does not invoke fetch while ticking", () => {
    // covers AC-4
    const spy = vi.fn(() => Promise.reject(new Error("fetch must not be called")));
    vi.stubGlobal("fetch", spy as unknown as typeof fetch);
    runMarketTick({
      prices: { AMZN: 222 },
      paramsByTicker: { AMZN: { mu: 0.0003, sigma: 0.03 } },
      histories: { AMZN: [] },
      nowMs: 50_000,
      rng: makeSeededUniformRng(8),
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
