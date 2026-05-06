import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runMarketTick, type RunMarketTickInput, type RunMarketTickResult } from "../utils/marketEngine";

import { createMarketTickController } from "./marketTickController";

describe("market tick controller (QA / adversarial)", () => {
  let useMarketStore: typeof import("../stores/market/marketStore").useMarketStore;

  beforeEach(async () => {
    vi.unstubAllGlobals();
    vi.resetModules();
    ({ useMarketStore } = await import("../stores/market/marketStore"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calling stop() before start() does not throw and does not clear a non-existent interval", () => {
    // QA edge: cleanup / lifecycle (corroborates AC-11 without duplicating happy-path unmount test)
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, "clearInterval");

    const controller = createMarketTickController({
      getStore: () => useMarketStore.getState(),
      intervalMs: 2000,
      nowMs: () => 1,
    });

    expect(() => controller.stop()).not.toThrow();
    expect(clearSpy).not.toHaveBeenCalled();

    clearSpy.mockRestore();
  });

  it("stop() remains safe when invoked repeatedly after start", () => {
    // QA edge: idempotent teardown (corroborates AC-5)
    vi.useFakeTimers();

    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });

    const controller = createMarketTickController({
      getStore: () => useMarketStore.getState(),
      intervalMs: 2000,
      nowMs: () => 2,
      runMarketTick: (input) => runMarketTick({ ...input, rng: () => 0.500_001 }),
    });

    controller.start();
    expect(() => {
      controller.stop();
      controller.stop();
      controller.stop();
    }).not.toThrow();
  });

  it("after stop(), start() can schedule ticks again (restart semantics)", async () => {
    // QA edge: lifecycle / resource leak (related AC-5, AC-12)
    vi.useFakeTimers();

    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });

    const runTick = vi.fn((input: Parameters<typeof runMarketTick>[0]) =>
      runMarketTick({ ...input, rng: () => 0.500_001 }),
    );

    const controller = createMarketTickController({
      getStore: () => useMarketStore.getState(),
      intervalMs: 2000,
      nowMs: () => 3,
      runMarketTick: runTick,
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(2000);
    expect(runTick).toHaveBeenCalledTimes(1);

    controller.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(runTick).toHaveBeenCalledTimes(1);

    controller.start();
    await vi.advanceTimersByTimeAsync(2000);
    expect(runTick).toHaveBeenCalledTimes(2);
  });

  it("with a minimal positive intervalMs, deltaTSeconds reflects ms→seconds conversion and each tick commits once", async () => {
    // QA edge: boundary cadence (avoids setInterval(…, 0) fake-timer tight loops while still validating Δt wiring)
    vi.useFakeTimers();

    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });

    const runTick = vi.fn((): RunMarketTickResult => ({ payload: { prices: {} }, histories: {} }));
    const applySpy = vi.spyOn(useMarketStore.getState(), "applyMarketTick");

    const controller = createMarketTickController({
      getStore: () => useMarketStore.getState(),
      intervalMs: 1,
      nowMs: () => 4,
      runMarketTick: runTick,
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(1);

    expect(runTick).toHaveBeenCalledTimes(1);
    const firstCall = runTick.mock.calls[0] as unknown as [RunMarketTickInput] | undefined;
    expect(firstCall?.[0]?.deltaTSeconds).toBe(0.001);
    expect(applySpy).toHaveBeenCalledTimes(1);

    applySpy.mockRestore();
  });

  it("with a negative intervalMs, deltaTSeconds is negative and the loop does not advance prices but still calls applyMarketTick", async () => {
    // QA edge: malformed interval (corroborates single-store-write path under AC-3)
    vi.useFakeTimers();

    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 50 } });
    const before = useMarketStore.getState().prices.AAPL;

    const runTick = vi.fn((input: Parameters<typeof runMarketTick>[0]) => runMarketTick(input));
    const applySpy = vi.spyOn(useMarketStore.getState(), "applyMarketTick");

    const controller = createMarketTickController({
      getStore: () => useMarketStore.getState(),
      intervalMs: -1000,
      nowMs: () => 5,
      runMarketTick: runTick,
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(2000);

    const negCall = runTick.mock.calls[0] as unknown as [RunMarketTickInput] | undefined;
    expect(negCall?.[0]?.deltaTSeconds).toBeLessThan(0);
    expect(useMarketStore.getState().prices.AAPL).toBe(before);
    expect(applySpy).toHaveBeenCalled();

    applySpy.mockRestore();
  });

  it("does not schedule extra intervals when start/stop/start races on the same callback queue", async () => {
    // QA edge: concurrency-style ordering (related AC-12)
    vi.useFakeTimers();

    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });

    const setSpy = vi.spyOn(globalThis, "setInterval");
    const runTick = vi.fn((input: Parameters<typeof runMarketTick>[0]) =>
      runMarketTick({ ...input, rng: () => 0.500_001 }),
    );

    const controller = createMarketTickController({
      getStore: () => useMarketStore.getState(),
      intervalMs: 2000,
      nowMs: () => 6,
      runMarketTick: runTick,
    });

    controller.start();
    controller.stop();
    controller.start();

    expect(setSpy).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(2000);
    expect(runTick).toHaveBeenCalledTimes(1);

    setSpy.mockRestore();
  });

  it("when runMarketTick throws, a subsequent tick can still be scheduled (timer survives a single fault)", async () => {
    // QA edge: fault isolation (operational risk; not covered by acceptance happy path)
    vi.useFakeTimers();

    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });

    let calls = 0;
    const runTick = vi.fn((): RunMarketTickResult => {
      calls += 1;
      if (calls === 1) throw new Error("injected engine fault");
      return runMarketTick({
        prices: useMarketStore.getState().prices,
        paramsByTicker: { AAPL: { mu: 0, sigma: 0.01 } },
        histories: {},
        nowMs: 7,
        deltaTSeconds: 2,
        rng: () => 0.500_001,
      });
    });

    const controller = createMarketTickController({
      getStore: () => useMarketStore.getState(),
      intervalMs: 2000,
      nowMs: () => 7,
      runMarketTick: runTick,
    });

    controller.start();
    await expect(vi.advanceTimersByTimeAsync(2000)).rejects.toThrow("injected engine fault");

    await vi.advanceTimersByTimeAsync(2000);
    expect(runTick).toHaveBeenCalledTimes(2);
    controller.stop();
  });

  it("tracks symbols present only in marketHistory even when prices omit that ticker (engine input shape)", async () => {
    // QA edge: partial / malformed store snapshot (corroborates AC-8 hydration-style inputs)
    vi.useFakeTimers();

    useMarketStore.getState().applyMarketTick({
      prices: { AAPL: 100 },
      historySamples: [{ ticker: "AAPL", point: { t: 0, price: 100 } }],
    });
    useMarketStore.getState().applyMarketTick({
      prices: { TSLA: 200 },
      historySamples: [{ ticker: "TSLA", point: { t: 1, price: 200 } }],
    });

    const runTick = vi.fn((input: Parameters<typeof runMarketTick>[0]): RunMarketTickResult => ({
      payload: { prices: {} },
      histories: input.histories,
    }));

    const controller = createMarketTickController({
      getStore: () => useMarketStore.getState(),
      intervalMs: 2000,
      nowMs: () => 8,
      runMarketTick: runTick,
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(2000);

    const histCall = runTick.mock.calls[0] as unknown as [RunMarketTickInput] | undefined;
    expect(histCall).toBeDefined();
    const histKeys = Object.keys(histCall![0].histories).sort();
    expect(histKeys).toContain("AAPL");
    expect(histKeys).toContain("TSLA");

    controller.stop();
  });
});
