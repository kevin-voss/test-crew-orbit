import { afterEach, describe, expect, it, vi } from "vitest";
import { createMarketController } from "@/lib/marketController";
import { useMarketStore } from "@/stores/useMarketStore";

describe("MarketController", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs on a 2-second interval and applies one coherent snapshot per tick", async () => {
    // covers AC-5
    vi.useFakeTimers();
    const tickSpy = vi.spyOn(useMarketStore.getState(), "applyMarketTick");
    const stop = createMarketController({ store: useMarketStore });
    await vi.advanceTimersByTimeAsync(1999);
    expect(tickSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(tickSpy).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(tickSpy).toHaveBeenCalledTimes(2);
    stop();
    tickSpy.mockRestore();
  });
});
