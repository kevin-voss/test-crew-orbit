/** @vitest-environment happy-dom */
/**
 * Adversarial / edge-case coverage for the responsive dashboard shell.
 * Complements `responsiveDashboardLayout.acceptance.test.tsx` (no AC-ID duplication here).
 */
import { StrictMode } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_INITIAL_CASH,
  MARKET_STORE_STORAGE_KEY,
  useMarketStore,
} from "../stores/market/marketStore";

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

function setViewportWidth(width: number): void {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
}

describe("Responsive dashboard layout (QA / adversarial)", () => {
  let mem: Storage;

  beforeEach(async () => {
    vi.unstubAllGlobals();
    setViewportWidth(1024);
    mem = makeMemoryStorage();
    vi.stubGlobal("localStorage", mem);
    await useMarketStore.persist.rehydrate();
    useMarketStore.setState({
      cash: DEFAULT_INITIAL_CASH,
      positions: {},
      tradeHistory: [],
      marketHistory: {},
      selectedTicker: null,
      prices: { RDL: 10 },
      equityHistory: [],
      referenceEquity: DEFAULT_INITIAL_CASH,
      equityDayKey: null,
      dayOpenEquity: DEFAULT_INITIAL_CASH,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    setViewportWidth(1024);
  });

  it("QA-RDL-RM: rapid unmount/remount does not accumulate overlapping tick intervals", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const applySpy = vi.spyOn(useMarketStore.getState(), "applyMarketTick");

    const { MarketDashboard } = await import("./MarketDashboard");

    for (let cycle = 0; cycle < 6; cycle++) {
      const { unmount } = render(
        <StrictMode>
          <MarketDashboard />
        </StrictMode>,
      );
      await act(async () => {
        await Promise.resolve();
      });
      unmount();
      await act(async () => {
        await Promise.resolve();
      });
    }

    applySpy.mockClear();

    const { unmount: finalUnmount } = render(
      <StrictMode>
        <MarketDashboard />
      </StrictMode>,
    );
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(applySpy.mock.calls.length).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(applySpy.mock.calls.length).toBe(2);

    finalUnmount();
  });

  it("QA-RDL-BADJSON: malformed persistence payload does not prevent dashboard shell render", async () => {
    mem.setItem(MARKET_STORE_STORAGE_KEY, "{ not valid json");
    await useMarketStore.persist.rehydrate();

    const { MarketDashboard } = await import("./MarketDashboard");
    render(
      <StrictMode>
        <MarketDashboard />
      </StrictMode>,
    );

    expect(screen.getByTestId("responsive-dashboard-shell")).toBeTruthy();
    expect(screen.getByTestId("dashboard-layout-grid")).toBeTruthy();
  });

  it("QA-RDL-DUAL: mounting two dashboard roots drives two independent tick controllers (simulation footgun)", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const applySpy = vi.spyOn(useMarketStore.getState(), "applyMarketTick");

    const { MarketDashboard } = await import("./MarketDashboard");

    render(
      <StrictMode>
        <>
          <MarketDashboard />
          <MarketDashboard />
        </>
      </StrictMode>,
    );
    await act(async () => {
      await Promise.resolve();
    });

    applySpy.mockClear();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // Two shells => two intervals calling applyMarketTick once each per tick.
    expect(applySpy.mock.calls.length).toBe(2);
  });

  it("QA-RDL-VP: at one pixel wide viewport columns remain vertically ordered without runaway horizontal scroll", async () => {
    setViewportWidth(1);
    const { MarketDashboard } = await import("./MarketDashboard");
    const { container } = render(
      <StrictMode>
        <MarketDashboard />
      </StrictMode>,
    );

    const shell = screen.getByTestId("responsive-dashboard-shell");
    Object.assign(shell.style, { width: "1px", maxWidth: "1px", boxSizing: "border-box" });
    container.dispatchEvent(new Event("resize"));

    const tickersCol = screen.getByTestId("dashboard-column-tickers");
    const chartTradeCol = screen.getByTestId("dashboard-column-chart-trade");
    const portfolioCol = screen.getByTestId("dashboard-column-portfolio");

    expect(tickersCol.getBoundingClientRect().top).toBeLessThanOrEqual(chartTradeCol.getBoundingClientRect().top + 2);
    expect(chartTradeCol.getBoundingClientRect().top).toBeLessThanOrEqual(portfolioCol.getBoundingClientRect().top + 2);

    expect(document.documentElement.scrollWidth - document.documentElement.clientWidth).toBeLessThanOrEqual(64);
  });

  it("QA-RDL-WIDE: ultra-wide inner shell does not explode document scroll width beyond generous slack", async () => {
    setViewportWidth(4096);
    const { MarketDashboard } = await import("./MarketDashboard");
    const { container } = render(
      <StrictMode>
        <MarketDashboard />
      </StrictMode>,
    );

    const shell = screen.getByTestId("responsive-dashboard-shell");
    Object.assign(shell.style, { width: "4000px", maxWidth: "4000px", boxSizing: "border-box" });
    container.dispatchEvent(new Event("resize"));

    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(4500);
  });
});
