import { afterEach, describe, expect, it, vi } from "vitest";
import { createMarketController } from "@/lib/marketController";

import { useMarketStore } from "@/stores/useMarketStore";

describe("MarketController adversarial concurrency (non-AC duplicate)", () => {
  afterEach(() => {
    vi.useRealTimers();
    useMarketStore.getState().resetToFirstRun?.();
  });

  it("documents duplicate-interval hazard: stacked controllers multiply tick snapshots", async () => {
    // QA risk: AC-5 single-writer invariant; stacking intervals is multiplicative
    vi.useFakeTimers();
    const tickSpy = vi.spyOn(useMarketStore.getState(), "applyMarketTick");
    const stopA = createMarketController({ store: useMarketStore });
    const stopB = createMarketController({ store: useMarketStore });
    await vi.advanceTimersByTimeAsync(2000);
    expect(tickSpy).toHaveBeenCalledTimes(2);
    stopA();
    stopB();
    tickSpy.mockRestore();
    vi.useRealTimers();
  });

  it("does not leak interval handles when stop callbacks are invoked idempotently", async () => {
    // QA resilience: teardown called twice during StrictMode-style lifecycles
    vi.useFakeTimers();
    const spy = vi.spyOn(globalThis, "clearInterval");
    const stop = createMarketController({ store: useMarketStore });
    stop();
    stop();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    vi.useRealTimers();
    await Promise.resolve();
  });
});
