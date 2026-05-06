import React, { StrictMode } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_INITIAL_CASH, useMarketStore } from "../stores/market/marketStore";
import { useMarketTickController } from "./useMarketTickController";

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

/** Three passive subscribers — oracle for one shared store snapshot (AC-7). */
function TickTriplet() {
  const a = useMarketStore((s) => s.prices.AAPL ?? null);
  const b = useMarketStore((s) => s.prices.AAPL ?? null);
  const c = useMarketStore((s) => s.prices.AAPL ?? null);
  return (
    <>
      <span data-testid="p1">{a ?? ""}</span>
      <span data-testid="p2">{b ?? ""}</span>
      <span data-testid="p3">{c ?? ""}</span>
    </>
  );
}

function DashboardHarness() {
  useMarketTickController();
  return <TickTriplet />;
}

let mem: Storage;

describe("useMarketTickController (dashboard lifecycle)", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.unstubAllGlobals();
    mem = makeMemoryStorage();
    vi.stubGlobal("localStorage", mem);
    await useMarketStore.persist.rehydrate();
    useMarketStore.setState({
      cash: DEFAULT_INITIAL_CASH,
      positions: {},
      tradeHistory: [],
      marketHistory: {},
      selectedTicker: null,
      prices: {},
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("clears the browser interval when the dashboard scope unmounts", async () => {
    // covers AC-6
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 150 } });

    const { unmount } = render(
      <StrictMode>
        <DashboardHarness />
      </StrictMode>,
    );

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();

    expect(clearSpy).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    clearSpy.mockRestore();
  });

  it("advances ticker-style consumers from the same store write on each tick", async () => {
    // covers AC-7
    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });

    render(
      <StrictMode>
        <DashboardHarness />
      </StrictMode>,
    );

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    const t1 = screen.getByTestId("p1").textContent;
    const t2 = screen.getByTestId("p2").textContent;
    const t3 = screen.getByTestId("p3").textContent;

    expect(t1).toBeTruthy();
    expect(t1).toBe(t2);
    expect(t2).toBe(t3);
  });

  it("does not stack multiple live loops across unmount and rapid remount", async () => {
    // covers AC-13
    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 120 } });
    const applySpy = vi.spyOn(useMarketStore.getState(), "applyMarketTick");

    const first = render(
      <StrictMode>
        <DashboardHarness />
      </StrictMode>,
    );

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    first.unmount();

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    render(
      <StrictMode>
        <DashboardHarness />
      </StrictMode>,
    );

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    applySpy.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(applySpy).toHaveBeenCalledTimes(1);

    applySpy.mockRestore();
  });

  it("still tears down cleanly if unmount happens just before the next tick (no orphaned timers)", async () => {
    // covers AC-12
    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 90 } });

    const { unmount } = render(
      <StrictMode>
        <DashboardHarness />
      </StrictMode>,
    );

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    await act(async () => {
      vi.advanceTimersByTime(1999);
    });

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
