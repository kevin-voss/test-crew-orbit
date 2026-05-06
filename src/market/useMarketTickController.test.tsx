/** @vitest-environment happy-dom */
import { StrictMode } from "react";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { StorageValue } from "zustand/middleware";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MarketStoreData } from "../stores/market/types";
import { runMarketTick } from "../utils/marketEngine";

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

describe("useMarketTickController", () => {
  let mem: Storage;
  let useMarketStore: typeof import("../stores/market/marketStore").useMarketStore;
  let useMarketTickController: typeof import("./useMarketTickController").useMarketTickController;

  beforeEach(async () => {
    vi.unstubAllGlobals();
    vi.resetModules();
    mem = makeMemoryStorage();
    vi.stubGlobal("localStorage", mem);
    ({ useMarketStore } = await import("../stores/market/marketStore"));
    ({ useMarketTickController } = await import("./useMarketTickController"));
    await useMarketStore.persist.rehydrate();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("does not start ticking until persisted store hydration has finished", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });

    useMarketStore.getState().applyMarketTick({
      prices: { AAPL: 100 },
    });

    let releaseBarrier!: () => void;
    const barrier = new Promise<void>((resolve) => {
      releaseBarrier = resolve;
    });

    useMarketStore.persist.setOptions({
      storage: {
        getItem: async (name) => {
          await barrier;
          const raw = mem.getItem(name);
          if (raw == null) return null;
          return JSON.parse(raw) as StorageValue<Partial<MarketStoreData>>;
        },
        setItem: (name, value) => {
          mem.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          mem.removeItem(name);
        },
      },
    });

    const runTick = vi
      .fn()
      .mockImplementation((input: Parameters<typeof runMarketTick>[0]) =>
        runMarketTick({ ...input, rng: () => 0.500_001 }),
      );

    const hydrationDone = useMarketStore.persist.rehydrate();

    renderHook(
      () =>
        useMarketTickController({
          getStore: () => useMarketStore.getState(),
          intervalMs: 2000,
          nowMs: () => 10_000,
          runMarketTick: runTick,
        }),
    );

    await vi.advanceTimersByTimeAsync(5000);
    expect(runTick).toHaveBeenCalledTimes(0);

    releaseBarrier();
    await hydrationDone;

    await waitFor(() => {
      expect(useMarketStore.persist.hasHydrated()).toBe(true);
    });

    await vi.advanceTimersByTimeAsync(2000);
    expect(runTick).toHaveBeenCalledTimes(1);
  });

  it("does not call applyMarketTick after unmount when timers are advanced", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });

    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });

    const runTick = vi.fn((input: Parameters<typeof runMarketTick>[0]) =>
      runMarketTick({ ...input, rng: () => 0.500_001 }),
    );

    const { unmount } = renderHook(() =>
      useMarketTickController({
        getStore: () => useMarketStore.getState(),
        intervalMs: 2000,
        nowMs: () => 20_000,
        runMarketTick: runTick,
      }),
    );

    await vi.advanceTimersByTimeAsync(2000);
    expect(runTick).toHaveBeenCalledTimes(1);

    const applySpy = vi.spyOn(useMarketStore.getState(), "applyMarketTick");

    unmount();

    await vi.advanceTimersByTimeAsync(10_000);
    expect(runTick).toHaveBeenCalledTimes(1);
    expect(applySpy).not.toHaveBeenCalled();

    applySpy.mockRestore();
  });

  it("runs at most one tick stream under StrictMode double mount semantics", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });

    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });

    const runTick = vi.fn((input: Parameters<typeof runMarketTick>[0]) =>
      runMarketTick({ ...input, rng: () => 0.500_001 }),
    );

    renderHook(
      () =>
        useMarketTickController({
          getStore: () => useMarketStore.getState(),
          intervalMs: 2000,
          nowMs: () => 30_000,
          runMarketTick: runTick,
        }),
      { wrapper: StrictMode },
    );

    await vi.advanceTimersByTimeAsync(2000);
    expect(runTick).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000);
    expect(runTick).toHaveBeenCalledTimes(2);
  });
});
