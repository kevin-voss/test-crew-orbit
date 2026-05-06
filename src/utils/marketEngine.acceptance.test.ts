import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MarketTickPayload, PricePoint } from "../stores/market/types";

/** Discrete GBM spot step (Itō/Euler on log-price); oracle for AC-1 / AC-2 */
function gbmSpot(S0: number, mu: number, sigma: number, dt: number, z: number): number {
  return S0 * Math.exp((mu - (sigma * sigma) / 2) * dt + sigma * Math.sqrt(dt) * z);
}

type EngineSymbolState = {
  ticker: string;
  mu: number;
  sigma: number;
  spot: number;
  history: PricePoint[];
};

type EngineStepInput = {
  /** Wall-clock or simulation time for the new sample */
  now: number;
  /** Positive time step in the same units as μ / σ interpretation */
  dt: number;
  symbols: EngineSymbolState[];
  /** One standard-normal draw per symbol, in the same order as `symbols` */
  shocks?: number[];
};

type EngineStepOutput = MarketTickPayload & {
  /** Engine-managed FIFO-capped series per touched ticker */
  histories: Record<string, PricePoint[]>;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_SOURCE_PATH = join(__dirname, "marketEngine.ts");

async function loadStepMarketEngine(): Promise<(input: EngineStepInput) => EngineStepOutput> {
  const mod = await import("./marketEngine");
  const fn = (mod as Record<string, unknown>).stepMarketEngine;
  if (typeof fn !== "function") {
    throw new Error("stepMarketEngine must be exported from ./marketEngine.ts");
  }
  return fn as (input: EngineStepInput) => EngineStepOutput;
}

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

describe("market engine acceptance (GBM)", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Given valid state + parameters, when the engine steps once, then each active spot matches GBM under μ, σ, Δt and injected shocks", async () => {
    // covers AC-1
    const stepMarketEngine = await loadStepMarketEngine();
    const S0 = 100;
    const mu = 0.03;
    const sigma = 0.25;
    const dt = 1 / 252;
    const z = -0.42;
    const out = stepMarketEngine({
      now: 10,
      dt,
      shocks: [z],
      symbols: [{ ticker: "AAPL", mu, sigma, spot: S0, history: [] }],
    });

    const expected = gbmSpot(S0, mu, sigma, dt, z);
    expect(out.prices.AAPL).toBeCloseTo(expected, 10);
    expect(out.histories.AAPL).toHaveLength(1);
    expect(out.histories.AAPL![0]).toEqual({ t: 10, price: expected });
  });

  it("Given differing μ/σ, when multiple symbols share the same shock and baseline, then resulting prices are not all identical", async () => {
    // covers AC-2
    const stepMarketEngine = await loadStepMarketEngine();
    const S0 = 50;
    const dt = 0.01;
    const z = 0.15;
    const out = stepMarketEngine({
      now: 2,
      dt,
      shocks: [z, z, z],
      symbols: [
        { ticker: "AAPL", mu: 0.01, sigma: 0.1, spot: S0, history: [] },
        { ticker: "TSLA", mu: 0.02, sigma: 0.4, spot: S0, history: [] },
        { ticker: "AMZN", mu: 0.0, sigma: 0.2, spot: S0, history: [] },
      ],
    });

    const p0 = out.prices.AAPL!;
    const p1 = out.prices.TSLA!;
    const p2 = out.prices.AMZN!;
    expect(new Set([p0, p1, p2]).size).toBeGreaterThan(1);
    expect(p0).toBeCloseTo(gbmSpot(S0, 0.01, 0.1, dt, z), 10);
    expect(p1).toBeCloseTo(gbmSpot(S0, 0.02, 0.4, dt, z), 10);
    expect(p2).toBeCloseTo(gbmSpot(S0, 0.0, 0.2, dt, z), 10);
  });

  it("Given browser-only stepping, when the engine runs, then no HTTP fetch is used for the tick", async () => {
    // covers AC-3
    const stepMarketEngine = await loadStepMarketEngine();
    const fetchSpy = vi.fn(() => {
      throw new Error("fetch must not be used for programmatic GBM stepping");
    });
    vi.stubGlobal("fetch", fetchSpy);

    stepMarketEngine({
      now: 1,
      dt: 0.01,
      shocks: [0],
      symbols: [{ ticker: "AAPL", mu: 0, sigma: 0.1, spot: 100, history: [] }],
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("Given only AAPL is active, when the engine steps, then outputs are scoped to that ticker without requiring others", async () => {
    // covers AC-4
    const stepMarketEngine = await loadStepMarketEngine();
    const out = stepMarketEngine({
      now: 3,
      dt: 0.02,
      shocks: [0.05],
      symbols: [{ ticker: "AAPL", mu: 0.04, sigma: 0.3, spot: 120, history: [] }],
    });

    expect(Object.keys(out.prices)).toEqual(["AAPL"]);
    expect(out.histories).toHaveProperty("AAPL");
    expect(Object.keys(out.histories)).toEqual(["AAPL"]);
  });

  it("Given many ticks, when histories are read from engine output, then each series has at most 100 points (FIFO)", async () => {
    // covers AC-5
    const stepMarketEngine = await loadStepMarketEngine();

    const spot = 100;
    const history: PricePoint[] = [];
    for (let i = 0; i < 99; i++) {
      history.push({ t: i, price: spot });
    }

    const mid = stepMarketEngine({
      now: 99,
      dt: 0.01,
      shocks: [0],
      symbols: [{ ticker: "AAPL", mu: 0.01, sigma: 0.15, spot, history: [...history] }],
    });
    expect(mid.histories.AAPL!.length).toBeLessThanOrEqual(100);

    const longHist = mid.histories.AAPL!;
    const final = stepMarketEngine({
      now: 100,
      dt: 0.01,
      shocks: [0],
      symbols: [{ ticker: "AAPL", mu: 0.01, sigma: 0.15, spot: mid.prices.AAPL!, history: [...longHist] }],
    });

    expect(final.histories.AAPL!.length).toBeLessThanOrEqual(100);
    expect(final.histories.AAPL!.length).toBe(100);
    expect(final.histories.AAPL![0]!.t).toBe(1);
  });

  it("Given applyMarketTick, when fed mapped engine output, then finite numbers are applied to prices and history", async () => {
    // covers AC-6
    vi.resetModules();
    const stepMarketEngine = await loadStepMarketEngine();
    const mem = makeMemoryStorage();
    vi.stubGlobal("localStorage", mem);
    const { useMarketStore } = await import("../stores/market/marketStore");

    const out = stepMarketEngine({
      now: 5,
      dt: 0.01,
      shocks: [0.03],
      symbols: [{ ticker: "AAPL", mu: 0, sigma: 0.2, spot: 200, history: [{ t: 4, price: 199 }] }],
    });

    const payload: MarketTickPayload = {
      prices: out.prices,
      historySamples: Object.entries(out.histories).flatMap(([ticker, series]) => {
        const last = series[series.length - 1];
        return last ? [{ ticker, point: last }] : [];
      }),
    };

    useMarketStore.getState().applyMarketTick(payload);
    expect(useMarketStore.getState().prices.AAPL).toBe(out.prices.AAPL);
    expect(useMarketStore.getState().marketHistory.AAPL?.at(-1)?.price).toBe(
      out.histories.AAPL?.at(-1)?.price,
    );
  });

  it("Given the implementation is reviewed, then GBM stepping and imports stay confined to utils/marketEngine.ts", () => {
    // covers AC-7
    const src = readFileSync(ENGINE_SOURCE_PATH, "utf8");
    expect(src).toMatch(/Math\.exp|brownian|\bGBM\b/i);
    for (const bad of ["../components", "/dashboard", "recharts"]) {
      expect(src.includes(bad), `unexpected coupling token: ${bad}`).toBe(false);
    }
  });

  it("Given scheduler integration needs, then the engine module does not import visualization or dashboard layers", () => {
    // covers AC-8
    const src = readFileSync(ENGINE_SOURCE_PATH, "utf8");
    expect(src).not.toMatch(/from\s+["'][^"']*(chart|dashboard|ui\/)/i);
  });

  it("Given identical inputs including fixed shocks, when stepMarketEngine runs twice, then outputs are identical", async () => {
    // covers AC-9
    const stepMarketEngine = await loadStepMarketEngine();
    const input: EngineStepInput = {
      now: 7,
      dt: 1 / 52,
      shocks: [1.1, -0.3],
      symbols: [
        { ticker: "AAPL", mu: 0.02, sigma: 0.18, spot: 101, history: [{ t: 6, price: 100 }] },
        { ticker: "TSLA", mu: 0.0, sigma: 0.35, spot: 250, history: [] },
      ],
    };

    const a = stepMarketEngine(input);
    const b = stepMarketEngine(JSON.parse(JSON.stringify(input)) as EngineStepInput);
    expect(b).toEqual(a);
  });

  it("Given an offline-capable tick, when stepping, then implementation does not reach out to remote entropy services", () => {
    // covers AC-10
    const src = readFileSync(ENGINE_SOURCE_PATH, "utf8");
    expect(src).not.toMatch(/https?:\/\//);
    expect(src).not.toMatch(/random\.org|drand\.|entropy\.io/i);
  });

  it("Given three tracked symbols, when one tick is processed, then work completes synchronously without a Promise result", async () => {
    // covers AC-11
    const stepMarketEngine = await loadStepMarketEngine();
    const out = stepMarketEngine({
      now: 8,
      dt: 0.005,
      shocks: [0.01, -0.02, 0.03],
      symbols: [
        { ticker: "AAPL", mu: 0.01, sigma: 0.11, spot: 100, history: [] },
        { ticker: "TSLA", mu: 0.02, sigma: 0.22, spot: 100, history: [] },
        { ticker: "AMZN", mu: 0.03, sigma: 0.33, spot: 100, history: [] },
      ],
    });

    expect(out.prices).toMatchObject({
      AAPL: expect.any(Number),
      TSLA: expect.any(Number),
      AMZN: expect.any(Number),
    });
    expect(out).not.toBeInstanceOf(Promise);
  });
});
