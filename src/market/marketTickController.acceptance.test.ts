import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_MARKET_ENGINE_PARAMS, runMarketTick, type RunMarketTickResult } from "../utils/marketEngine";
import { MARKET_STORE_STORAGE_KEY } from "../stores/market/marketStore";

import { createMarketTickController } from "./marketTickController";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTROLLER_SOURCE_PATH = join(__dirname, "marketTickController.ts");
const REPO_SRC_ROOT = join(__dirname, "..");

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

function* walkFiles(dir: string): Generator<string> {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      yield* walkFiles(full);
    } else if (ent.isFile()) {
      yield full;
    }
  }
}

function isProductionTsPath(absPath: string): boolean {
  const rel = relative(REPO_SRC_ROOT, absPath);
  if (!rel.endsWith(".ts")) return false;
  if (rel.includes(".test.") || rel.includes(".qa.")) return false;
  return true;
}

describe("market tick controller acceptance", () => {
  let mem: Storage;
  let useMarketStore: typeof import("../stores/market/marketStore").useMarketStore;

  beforeEach(async () => {
    vi.unstubAllGlobals();
    vi.resetModules();
    mem = makeMemoryStorage();
    vi.stubGlobal("localStorage", mem);
    ({ useMarketStore } = await import("../stores/market/marketStore"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("Given the dashboard tick scope is active, when the controller runs, then market ticks recur on a ~2s cadence under fake timers", async () => {
    // covers AC-1
    vi.useFakeTimers();

    useMarketStore.getState().applyMarketTick({
      prices: { AAPL: 100, TSLA: 200 },
      historySamples: [],
    });

    const runTick = vi
      .fn()
      .mockImplementation((input: Parameters<typeof runMarketTick>[0]): ReturnType<typeof runMarketTick> =>
        runMarketTick({ ...input, rng: () => 0.500_001 }),
      );

    const controller = createMarketTickController({
      getStore: () => useMarketStore.getState(),
      intervalMs: 2000,
      nowMs: () => 10_000,
      runMarketTick: runTick,
    });

    controller.start();

    await vi.advanceTimersByTimeAsync(2000);
    expect(runTick).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000);
    expect(runTick).toHaveBeenCalledTimes(2);
  });

  it("Given tracked symbols exist, when a scheduler tick fires, then runMarketTick is invoked once for that tick before applyMarketTick runs", async () => {
    // covers AC-2
    vi.useFakeTimers();

    useMarketStore.getState().applyMarketTick({
      prices: { AAPL: 100, TSLA: 200, AMZN: 300 },
    });

    const order: string[] = [];
    const runTick = vi.fn((input: Parameters<typeof runMarketTick>[0]): RunMarketTickResult => {
      order.push("engine");
      return runMarketTick({ ...input, rng: () => 0.500_001 });
    });

    const storeSlice = useMarketStore.getState();
    const origApply = storeSlice.applyMarketTick.bind(storeSlice);
    const applySpy = vi.spyOn(storeSlice, "applyMarketTick").mockImplementation((payload) => {
      order.push("store");
      origApply(payload);
    });

    const controller = createMarketTickController({
      getStore: () => useMarketStore.getState(),
      intervalMs: 2000,
      nowMs: () => 20_000,
      runMarketTick: runTick,
    });

    const pricesBeforeTick = { ...useMarketStore.getState().prices };

    controller.start();
    await vi.advanceTimersByTimeAsync(2000);

    expect(runTick).toHaveBeenCalledTimes(1);
    const input = runTick.mock.calls[0]![0];
    expect(Object.keys(input.paramsByTicker).sort()).toEqual(Object.keys(DEFAULT_MARKET_ENGINE_PARAMS).sort());
    for (const ticker of Object.keys(DEFAULT_MARKET_ENGINE_PARAMS)) {
      expect(input.prices[ticker]).toBe(pricesBeforeTick[ticker]);
    }
    expect(order).toEqual(["engine", "store"]);
    applySpy.mockRestore();
  });

  it("Given a tick completes, when results are committed, then applyMarketTick runs exactly once with the latest payload for that tick", async () => {
    // covers AC-3
    vi.useFakeTimers();

    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });

    const applySpy = vi.spyOn(useMarketStore.getState(), "applyMarketTick");

    const payload = runMarketTick({
      prices: { AAPL: 100 },
      paramsByTicker: { AAPL: DEFAULT_MARKET_ENGINE_PARAMS.AAPL },
      histories: {},
      nowMs: 1,
      deltaTSeconds: 2,
      rng: () => 0.500_001,
    }).payload;

    const runTick = vi.fn((): RunMarketTickResult => ({ payload, histories: {} }));

    const controller = createMarketTickController({
      getStore: () => useMarketStore.getState(),
      intervalMs: 2000,
      nowMs: () => 30_000,
      runMarketTick: runTick,
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(2000);

    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(applySpy).toHaveBeenCalledWith(payload);

    applySpy.mockRestore();
  });

  it("Given the controller source is reviewed, then tick orchestration stays client-side without remote tick APIs", () => {
    // covers AC-4
    const src = readFileSync(CONTROLLER_SOURCE_PATH, "utf8");
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/https?:\/\//i);
    expect(src).not.toMatch(new RegExp("\\b(WebSocket|EventSource)\\b"));
  });

  it("Given the controller was started, when stop runs before further scheduled work, then clearInterval is used and no further ticks mutate the store", async () => {
    // covers AC-5
    vi.useFakeTimers();

    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });

    const runTick = vi.fn((input: Parameters<typeof runMarketTick>[0]) =>
      runMarketTick({ ...input, rng: () => 0.500_001 }),
    );

    const clearSpy = vi.spyOn(globalThis, "clearInterval");

    const controller = createMarketTickController({
      getStore: () => useMarketStore.getState(),
      intervalMs: 2000,
      nowMs: () => 40_000,
      runMarketTick: runTick,
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(2000);
    expect(runTick).toHaveBeenCalledTimes(1);

    controller.stop();
    expect(clearSpy).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(10_000);
    expect(runTick).toHaveBeenCalledTimes(1);

    clearSpy.mockRestore();
  });

  it("Given dashboard UI components exist, when they render market data, then they do not invoke the GBM engine directly", () => {
    // covers AC-6
    const offenders: string[] = [];
    for (const file of walkFiles(REPO_SRC_ROOT)) {
      if (!/\.(tsx|jsx)$/.test(file) || file.includes(".test.")) continue;
      if (/\brunMarketTick\b/.test(readFileSync(file, "utf8"))) {
        offenders.push(relative(REPO_SRC_ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("Given production TypeScript under src, when reviewed, then only the tick controller orchestrates runMarketTick outside the engine module", () => {
    // covers AC-7
    const allow = new Set<string>([
      join(REPO_SRC_ROOT, "utils/marketEngine.ts").replace(/\\/g, "/"),
      CONTROLLER_SOURCE_PATH.replace(/\\/g, "/"),
    ]);

    const offenders: string[] = [];
    for (const file of walkFiles(REPO_SRC_ROOT)) {
      if (!isProductionTsPath(file)) continue;
      const norm = file.replace(/\\/g, "/");
      if (allow.has(norm)) continue;
      const body = readFileSync(file, "utf8");
      if (/\brunMarketTick\b/.test(body)) offenders.push(relative(REPO_SRC_ROOT, file));
    }
    expect(offenders).toEqual([]);
  });

  it("Given persisted prices exist, when the store rehydrates and then the first tick runs, then runMarketTick reads the rehydrated snapshot as engine input", async () => {
    // covers AC-8
    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 123.45 } });
    expect(mem.getItem(MARKET_STORE_STORAGE_KEY)).toBeTruthy();

    vi.resetModules();
    vi.stubGlobal("localStorage", mem);
    ({ useMarketStore } = await import("../stores/market/marketStore"));
    await useMarketStore.persist.rehydrate();
    expect(useMarketStore.getState().prices.AAPL).toBe(123.45);

    vi.useFakeTimers();

    const runTick = vi.fn((input: Parameters<typeof runMarketTick>[0]) =>
      runMarketTick({ ...input, rng: () => 0.500_001 }),
    );

    const controller = createMarketTickController({
      getStore: () => useMarketStore.getState(),
      intervalMs: 2000,
      nowMs: () => 50_000,
      runMarketTick: runTick,
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(2000);

    expect(runTick).toHaveBeenCalled();
    expect(runTick.mock.calls[0]![0].prices.AAPL).toBe(123.45);
  });

  it("Given default configuration, when the scheduler is started, then the nominal interval is 2000ms", () => {
    // covers AC-9
    vi.useFakeTimers();
    const spy = vi.spyOn(globalThis, "setInterval");

    const controller = createMarketTickController({
      getStore: () => useMarketStore.getState(),
      nowMs: () => 60_000,
    });

    controller.start();

    expect(spy).toHaveBeenCalledWith(expect.any(Function), 2000);
    spy.mockRestore();
  });

  it("Given the controller source is reviewed, then tick writes target applyMarketTick rather than ad-hoc store mutation helpers", () => {
    // covers AC-10
    const src = readFileSync(CONTROLLER_SOURCE_PATH, "utf8");
    expect(src).toMatch(/applyMarketTick/);
    expect(src).not.toMatch(/useMarketStore\.setState\s*\(/);
  });

  it("Given a controller scope is torn down before work runs, when stop runs immediately after start, then timers are cleared and no engine ticks fire", async () => {
    // covers AC-11
    vi.useFakeTimers();

    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });

    const runTick = vi.fn((input: Parameters<typeof runMarketTick>[0]) =>
      runMarketTick({ ...input, rng: () => 0.500_001 }),
    );

    const clearSpy = vi.spyOn(globalThis, "clearInterval");

    const controller = createMarketTickController({
      getStore: () => useMarketStore.getState(),
      intervalMs: 2000,
      nowMs: () => 70_000,
      runMarketTick: runTick,
    });

    controller.start();
    controller.stop();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(runTick).toHaveBeenCalledTimes(0);
    expect(clearSpy).toHaveBeenCalled();

    clearSpy.mockRestore();
  });

  it("Given start is idempotent for a single scope, when start is called twice without an intervening stop, then only one 2s scheduler drives ticks", async () => {
    // covers AC-12
    vi.useFakeTimers();

    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });

    const setSpy = vi.spyOn(globalThis, "setInterval");
    const runTick = vi.fn((input: Parameters<typeof runMarketTick>[0]) =>
      runMarketTick({ ...input, rng: () => 0.500_001 }),
    );

    const controller = createMarketTickController({
      getStore: () => useMarketStore.getState(),
      intervalMs: 2000,
      nowMs: () => 80_000,
      runMarketTick: runTick,
    });

    controller.start();
    controller.start();

    expect(setSpy).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000);
    expect(runTick).toHaveBeenCalledTimes(1);

    setSpy.mockRestore();
  });

  it("Given browser timer semantics, when scheduling ticks, then the controller uses timer APIs rather than a tight synchronous loop for cadence", () => {
    // covers AC-13
    const src = readFileSync(CONTROLLER_SOURCE_PATH, "utf8");
    expect(src).toMatch(/setInterval|setTimeout/);
    expect(src).not.toMatch(/while\s*\(\s*true\s*\)/);
  });
});
