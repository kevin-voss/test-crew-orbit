import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { StrictMode } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_INITIAL_CASH,
  useMarketStore,
} from "../../stores/market/marketStore";
import { TickerPanel } from "./TickerPanel";

const panelSrcPath = join(dirname(fileURLToPath(import.meta.url)), "TickerPanel.tsx");

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

function resetMarketStorePrices(): void {
  useMarketStore.setState({
    cash: DEFAULT_INITIAL_CASH,
    positions: {},
    tradeHistory: [],
    marketHistory: {},
    selectedTicker: null,
    prices: {},
  });
}

/** Flash state surfaced on a row so tests stay stable without `@testing-library/jest-dom`. */
function flashTone(row: HTMLElement): string | null {
  return row.getAttribute("data-live-ticker-flash");
}

function symbolsInDomListOrder(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-testid^="live-ticker-row-"]')).map((el) => {
    const id = el.getAttribute("data-testid")!;
    return id.slice("live-ticker-row-".length);
  });
}

let mem: Storage;

describe("TickerPanel live ticker acceptance", () => {
  beforeEach(async () => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    mem = makeMemoryStorage();
    vi.stubGlobal("localStorage", mem);
    await useMarketStore.persist.rehydrate();
    resetMarketStorePrices();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // ---------------------------------------------------------------------------
  // AC-7 — Presentational boundary (static source oracle)
  // ---------------------------------------------------------------------------

  it("TickerPanel.tsx does not embed tick orchestration or market-engine math", () => {
    // covers AC-7
    const src = readFileSync(panelSrcPath, "utf8");

    expect(src).not.toMatch(/\bsetInterval\s*\(/);
    expect(src).not.toMatch(/marketEngine/);
    expect(src).not.toMatch(/\bstepMarketEngine\b/);
    expect(src).not.toMatch(/\bcreateMarketTickController\b/);
    expect(src).not.toMatch(/\buseMarketTickController\b/);
  });

  // ---------------------------------------------------------------------------
  // AC-9 — Empty priced set UX
  // ---------------------------------------------------------------------------

  it("renders only the agreed empty state when no finite priced symbols exist", () => {
    // covers AC-9
    useMarketStore.setState({ prices: {} });

    render(
      <StrictMode>
        <TickerPanel />
      </StrictMode>,
    );

    expect(screen.queryByTestId("live-ticker-row-AAPL")).toBeNull();
    expect(screen.getByTestId("live-ticker-empty")).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // AC-1, AC-2, AC-5, AC-6, AC-14 — List layout, symbols, store truth, freshness
  // ---------------------------------------------------------------------------

  it("lists every finite-priced symbol lexicographically in a single vertical column list shell", async () => {
    // covers AC-1
    // covers AC-6
    useMarketStore.getState().applyMarketTick({
      prices: {
        MSFT: 302.05,
        AAPL: 189.52,
      },
    });

    const { rerender } = render(
      <StrictMode>
        <TickerPanel />
      </StrictMode>,
    );

    const list = screen.getByTestId("live-ticker-list");
    expect(list.getAttribute("role")).toBe("list");

    await waitFor(() => {
      expect(symbolsInDomListOrder(list)).toEqual(["AAPL", "MSFT"]);
    });

    // covers AC-6 — reactive store subscription without rerender hacks
    useMarketStore.getState().applyMarketTick({ prices: { ZED: 1 } });

    rerender(
      <StrictMode>
        <TickerPanel />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(symbolsInDomListOrder(screen.getByTestId("live-ticker-list"))).toEqual([
        "AAPL",
        "MSFT",
        "ZED",
      ]);
    });
  });

  it("shows matching symbol strings and formatted prices sourced from persisted store snapshots", async () => {
    // covers AC-2, AC-5
    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 150.375 } });

    render(
      <StrictMode>
        <TickerPanel />
      </StrictMode>,
    );

    await waitFor(() => {
      const live = screen.getByTestId("live-ticker-price-AAPL").textContent;
      const persisted = `${useMarketStore.getState().prices.AAPL}`;
      expect(live).toContain(persisted);
      expect(screen.getByTestId("live-ticker-symbol-AAPL").textContent).toBe("AAPL");
    });
  });

  it("omits priced rows for symbols lacking finite numeric store prices", () => {
    // covers AC-14
    act(() =>
      useMarketStore.setState({
        prices: {
          AAPL: Number.NaN,
          MSFT: Number.POSITIVE_INFINITY,
          OK: 42,
        },
      }),
    );

    render(
      <StrictMode>
        <TickerPanel />
      </StrictMode>,
    );

    expect(screen.queryByTestId("live-ticker-row-AAPL")).toBeNull();
    expect(screen.queryByTestId("live-ticker-row-MSFT")).toBeNull();
    expect(screen.getByTestId("live-ticker-row-OK")).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // AC-3 — Upward flash
  // ---------------------------------------------------------------------------

  describe("directional flashes (requires fake timers)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("applies a green flash token to only the rising row after prices increase", () => {
      // covers AC-3
      act(() => {
        useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });
      });

      render(
        <StrictMode>
          <TickerPanel />
        </StrictMode>,
      );

      act(() => {
        useMarketStore.getState().applyMarketTick({ prices: { AAPL: 105 } });
      });

      const row = screen.getByTestId("live-ticker-row-AAPL");
      expect(flashTone(row)).toBe("green");
    });

    // -------------------------------------------------------------------------
    // AC-4 — Downward flash
    // -------------------------------------------------------------------------

    it("applies a red flash token to only the declining row after prices decrease", () => {
      // covers AC-4
      act(() => {
        useMarketStore.getState().applyMarketTick({ prices: { AAPL: 200 } });
      });

      render(
        <StrictMode>
          <TickerPanel />
        </StrictMode>,
      );

      act(() => {
        useMarketStore.getState().applyMarketTick({ prices: { AAPL: 198 } });
      });

      const row = screen.getByTestId("live-ticker-row-AAPL");
      expect(flashTone(row)).toBe("red");
    });

    // -------------------------------------------------------------------------
    // AC-8 — Transient flashes stay per-row
    // -------------------------------------------------------------------------

    it("clears flash tokens promptly and never tints unaffected rows during a neighbour move", () => {
      // covers AC-8
      act(() => {
        useMarketStore.getState().applyMarketTick({
          prices: { AAPL: 120, MSFT: 411 },
        });
      });

      render(
        <StrictMode>
          <TickerPanel />
        </StrictMode>,
      );

      act(() => {
        useMarketStore.getState().applyMarketTick({ prices: { AAPL: 125 } });
      });

      expect(flashTone(screen.getByTestId("live-ticker-row-AAPL"))).toBe("green");
      expect(flashTone(screen.getByTestId("live-ticker-row-MSFT"))).toBeNull();

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(flashTone(screen.getByTestId("live-ticker-row-AAPL"))).toBeNull();
      expect(screen.getByTestId("live-ticker-row-MSFT").getAttribute("data-live-ticker-flash")).toBeNull();
    });

    // -------------------------------------------------------------------------
    // AC-10 — No flash on first observation
    // -------------------------------------------------------------------------

    it("does not emit directional flashes on the first finite price observation for a symbol", () => {
      // covers AC-10
      act(() => {
        useMarketStore.getState().applyMarketTick({ prices: { AAPL: 77 } });
      });

      render(
        <StrictMode>
          <TickerPanel />
        </StrictMode>,
      );

      const row = screen.getByTestId("live-ticker-row-AAPL");
      expect(flashTone(row)).toBeNull();
    });

    // -------------------------------------------------------------------------
    // AC-11 — Strict equality means no flash
    // -------------------------------------------------------------------------

    it("does not flash when the store replays the same numeric price", () => {
      // covers AC-11
      const stable = 88.5;

      act(() => {
        useMarketStore.getState().applyMarketTick({ prices: { AAPL: stable } });
      });

      render(
        <StrictMode>
          <TickerPanel />
        </StrictMode>,
      );

      act(() => {
        useMarketStore.getState().applyMarketTick({ prices: { AAPL: stable } });
      });

      expect(flashTone(screen.getByTestId("live-ticker-row-AAPL"))).toBeNull();
    });

    // -------------------------------------------------------------------------
    // AC-12 — Concurrent opposite moves independent per row
    // -------------------------------------------------------------------------

    it("shows green and red flash tokens independently when two symbols move opposite ways on one tick", () => {
      // covers AC-12
      act(() => {
        useMarketStore.getState().applyMarketTick({
          prices: { AAPL: 120, MSFT: 305 },
        });
      });

      render(
        <StrictMode>
          <TickerPanel />
        </StrictMode>,
      );

      act(() => {
        useMarketStore.getState().applyMarketTick({
          prices: { AAPL: 121, MSFT: 304 },
        });
      });

      expect(flashTone(screen.getByTestId("live-ticker-row-AAPL"))).toBe("green");
      expect(flashTone(screen.getByTestId("live-ticker-row-MSFT"))).toBe("red");
    });

    // -------------------------------------------------------------------------
    // AC-13 — List churn preserves automatic updates and baseline rules
    // -------------------------------------------------------------------------

    it("updates list membership without manual refresh and suppresses flashes for newly introduced baselines", () => {
      // covers AC-13
      act(() => {
        useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });
      });

      const { rerender } = render(
        <StrictMode>
          <TickerPanel />
        </StrictMode>,
      );

      act(() => {
        useMarketStore.setState({ prices: {} });
      });
      rerender(
        <StrictMode>
          <TickerPanel />
        </StrictMode>,
      );
      expect(screen.queryByTestId("live-ticker-row-AAPL")).toBeNull();

      act(() => {
        useMarketStore.getState().applyMarketTick({ prices: { AAPL: 110 } });
      });
      rerender(
        <StrictMode>
          <TickerPanel />
        </StrictMode>,
      );

      const rowAfterReintroduction = screen.getByTestId("live-ticker-row-AAPL");
      expect(flashTone(rowAfterReintroduction)).toBeNull();
    });
  });
});
