/** @vitest-environment happy-dom */
import { StrictMode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Dashboard integration", () => {
  let mem: Storage;
  let useMarketStore: typeof import("../stores/market/marketStore").useMarketStore;

  beforeEach(async () => {
    vi.unstubAllGlobals();
    vi.resetModules();
    mem = ((): Storage => {
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
    })();
    vi.stubGlobal("localStorage", mem);
    ({ useMarketStore } = await import("../stores/market/marketStore"));
    await useMarketStore.persist.rehydrate();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("updates ticker and analytics from the same store snapshot after each tick", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });

    useMarketStore.getState().applyMarketTick({
      prices: { AAPL: 100 },
    });
    useMarketStore.getState().setSelectedTicker("AAPL");

    const applySpy = vi.spyOn(useMarketStore.getState(), "applyMarketTick");

    const { Dashboard } = await import("./Dashboard");

    render(
      <StrictMode>
        <Dashboard />
      </StrictMode>,
    );

    await vi.advanceTimersByTimeAsync(2000);

    await waitFor(() => {
      expect(applySpy).toHaveBeenCalledTimes(1);
    });

    const px = useMarketStore.getState().prices.AAPL;
    expect(typeof px).toBe("number");
    expect(Number.isFinite(px)).toBe(true);

    expect(screen.getByTestId("ticker-prices").textContent ?? "").toContain(Number(px).toFixed(2));
    expect(screen.getByTestId("analytics-readout").textContent ?? "").toContain(
      useMarketStore.getState().cash.toFixed(2),
    );
  });

  it("does not apply further ticks after the dashboard unmounts", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });

    useMarketStore.getState().applyMarketTick({
      prices: { AAPL: 50 },
    });

    const applySpy = vi.spyOn(useMarketStore.getState(), "applyMarketTick");

    const { Dashboard } = await import("./Dashboard");

    const { unmount } = render(<Dashboard />);

    await vi.advanceTimersByTimeAsync(2000);
    await waitFor(() => expect(applySpy).toHaveBeenCalled());

    const afterFirst = applySpy.mock.calls.length;

    unmount();

    await vi.advanceTimersByTimeAsync(20_000);
    expect(applySpy.mock.calls.length).toBe(afterFirst);
  });
});
