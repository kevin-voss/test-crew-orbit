/** @vitest-environment happy-dom */
/**
 * Adversarial / edge-case coverage for LiveTickerPanel — does not repeat acceptance scenarios.
 * Maps loosely to AC resilience (store-driven UI); not duplicate AC-1–AC-13 acceptance tests.
 */
import { StrictMode } from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_INITIAL_CASH, useMarketStore } from "../../stores/market/marketStore";

import { LiveTickerPanel } from "./LiveTickerPanel";

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

function renderLiveTicker() {
  return render(
    <StrictMode>
      <LiveTickerPanel />
    </StrictMode>,
  );
}

describe("LiveTickerPanel QA (adversarial / boundaries)", () => {
  let mem: Storage;

  beforeEach(async () => {
    vi.unstubAllGlobals();
    vi.useFakeTimers();
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
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("omits rows for non-finite numeric entries when prices are polluted via setState (malformed store)", () => {
    // QA: malformed persistence edge — not covered by applyMarketTick validation alone
    useMarketStore.setState({
      prices: {
        GOOD: 10,
        BAD_NAN: Number.NaN,
        BAD_INF: Number.POSITIVE_INFINITY,
      } as Record<string, number>,
    });

    renderLiveTicker();
    const list = screen.getByRole("list", { name: /live ticker/i });
    const items = within(list).queryAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]!.textContent).toMatch(/GOOD/);
  });

  it("survives a large symbol cardinality without throwing (resource / layout stress)", () => {
    const n = 400;
    const prices: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      prices[`S${i.toString().padStart(4, "0")}`] = 100 + i * 0.01;
    }
    useMarketStore.setState({ prices });

    expect(() => renderLiveTicker()).not.toThrow();
    const list = screen.getByRole("list", { name: /live ticker/i });
    expect(within(list).getAllByRole("listitem")).toHaveLength(n);
  });

  it("renders negative finite prices without crashing (boundary numeric)", () => {
    useMarketStore.getState().applyMarketTick({ prices: { WEIRD: -0.01 } });
    renderLiveTicker();
    const list = screen.getByRole("list", { name: /live ticker/i });
    const row = within(list).getByRole("listitem");
    expect(row.textContent).toMatch(/WEIRD/);
    expect(row.textContent).toMatch(/-0\.01/);
  });

  it("after symbol churn in the store, a reintroduced symbol does not flash on its first tick back (prev-ref reset)", async () => {
    useMarketStore.getState().applyMarketTick({ prices: { CHURN: 50 } });
    renderLiveTicker();

    await act(async () => {
      useMarketStore.setState({ prices: {} });
    });
    await act(async () => {
      useMarketStore.getState().applyMarketTick({ prices: { CHURN: 99 } });
    });

    const list = screen.getByRole("list", { name: /live ticker/i });
    const row = within(list).getByRole("listitem");
    expect(row.textContent).toMatch(/99/);
    expect(row.getAttribute("data-live-flash")).toBeNull();
  });

  it("clears data-live-flash at the configured flash window boundary (timer precision)", async () => {
    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 10 } });
    renderLiveTicker();

    await act(async () => {
      useMarketStore.getState().applyMarketTick({ prices: { AAPL: 11 } });
    });

    const list = screen.getByRole("list", { name: /live ticker/i });
    const row = within(list).getByRole("listitem");
    expect(row.getAttribute("data-live-flash")).toBe("up");

    await act(async () => {
      vi.advanceTimersByTime(599);
    });
    expect(row.getAttribute("data-live-flash")).toBe("up");

    await act(async () => {
      vi.advanceTimersByTime(2);
    });
    expect(row.getAttribute("data-live-flash")).toBeNull();
  });

  it("cancels stale flash timers when a new opposing tick arrives before the flash window ends", async () => {
    useMarketStore.getState().applyMarketTick({ prices: { MSFT: 100 } });
    renderLiveTicker();

    await act(async () => {
      useMarketStore.getState().applyMarketTick({ prices: { MSFT: 110 } });
    });
    const list = screen.getByRole("list", { name: /live ticker/i });
    let row = within(list).getByRole("listitem");
    expect(row.getAttribute("data-live-flash")).toBe("up");

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    await act(async () => {
      useMarketStore.getState().applyMarketTick({ prices: { MSFT: 105 } });
    });

    row = within(list).getByRole("listitem");
    expect(row.getAttribute("data-live-flash")).toBe("down");

    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(row.getAttribute("data-live-flash")).toBe("down");

    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(row.getAttribute("data-live-flash")).toBeNull();
  });

  it("preserves stable alphabetical ordering when multiple symbols exist", () => {
    useMarketStore.getState().applyMarketTick({
      prices: { ZETA: 1, ALPHA: 2, MU: 3 },
    });
    renderLiveTicker();
    const list = screen.getByRole("list", { name: /live ticker/i });
    const labels = within(list).getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(labels[0]).toMatch(/^ALPHA/);
    expect(labels[1]).toMatch(/^MU/);
    expect(labels[2]).toMatch(/^ZETA/);
  });

  it("unmounting mid-flash does not throw when flash timers fire (cleanup vs stale timer)", async () => {
    useMarketStore.getState().applyMarketTick({ prices: { SAFE: 1 } });
    const { unmount } = renderLiveTicker();

    await act(async () => {
      useMarketStore.getState().applyMarketTick({ prices: { SAFE: 2 } });
    });

    const list = screen.getByRole("list", { name: /live ticker/i });
    expect(within(list).getByRole("listitem").getAttribute("data-live-flash")).toBe("up");

    expect(() => unmount()).not.toThrow();

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
  });

  it("renders empty-string symbol key without throwing when price is finite (malformed key boundary)", () => {
    useMarketStore.setState({
      prices: { "": 42.5 } as Record<string, number>,
    });
    expect(() => renderLiveTicker()).not.toThrow();
    const list = screen.getByRole("list", { name: /live ticker/i });
    const row = within(list).getByRole("listitem");
    expect(row.textContent).toMatch(/42\.50|42\.5/);
  });

  it("does not leave orphaned flash attributes when the price map becomes empty", async () => {
    useMarketStore.getState().applyMarketTick({ prices: { TMP: 1 } });
    renderLiveTicker();

    await act(async () => {
      useMarketStore.getState().applyMarketTick({ prices: { TMP: 2 } });
    });

    const list = screen.getByRole("list", { name: /live ticker/i });
    expect(within(list).getByRole("listitem").getAttribute("data-live-flash")).toBe("up");

    await act(async () => {
      useMarketStore.setState({ prices: {} });
    });

    const rowsAfterClear = within(list).getAllByRole("listitem");
    expect(rowsAfterClear).toHaveLength(1);
    expect(rowsAfterClear[0]!.textContent ?? "").toMatch(/No quotes yet/i);
  });
});
