/** @vitest-environment happy-dom */
import { StrictMode } from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MarketDashboard } from "../MarketDashboard";
import {
  DEFAULT_INITIAL_CASH,
  MARKET_STORE_STORAGE_KEY,
  useMarketStore,
} from "../../stores/market/marketStore";
import type { PricePoint } from "../../stores/market/types";

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

function buildPriceSeries(count: number, startT = 0): PricePoint[] {
  return Array.from({ length: count }, (_, i) => ({
    t: startT + i,
    price: 100 + i * 0.05,
  }));
}

function renderMarketDashboard() {
  return render(
    <StrictMode>
      <MarketDashboard />
    </StrictMode>,
  );
}

describe("Dynamic charts and analytics acceptance", () => {
  let mem: Storage;

  beforeEach(async () => {
    vi.unstubAllGlobals();
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
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

  it("initializes the selected ticker price chart from at most the newest 100 buffered points", () => {
    // covers AC-1
    const series = buildPriceSeries(150, 1_000);
    useMarketStore.setState({
      selectedTicker: "AAPL",
      marketHistory: { AAPL: series },
      prices: { AAPL: series.at(-1)!.price },
    });

    renderMarketDashboard();

    const chart = screen.getByTestId("selected-ticker-price-chart");
    const countEl = within(chart).getByTestId("selected-ticker-price-chart-rendered-count");
    expect(countEl.textContent?.trim()).toBe("100");
  });

  it("updates the selected price chart within the same store-driven render after applyMarketTick adds history", async () => {
    // covers AC-2
    useMarketStore.setState({
      selectedTicker: "AAPL",
      marketHistory: {
        AAPL: [
          { t: 1, price: 10 },
          { t: 2, price: 11 },
        ],
      },
      prices: { AAPL: 11 },
    });

    renderMarketDashboard();

    const chartBefore = screen.getByTestId("selected-ticker-price-chart");
    const lastBefore = within(chartBefore).getByTestId("selected-ticker-price-chart-last-price").textContent;

    await act(async () => {
      useMarketStore.getState().applyMarketTick({
        prices: { AAPL: 12 },
        historySamples: [{ ticker: "AAPL", point: { t: 3, price: 12 } }],
      });
    });

    const chartAfter = screen.getByTestId("selected-ticker-price-chart");
    const lastAfter = within(chartAfter).getByTestId("selected-ticker-price-chart-last-price").textContent;

    expect(lastAfter).not.toBe(lastBefore);
    expect(lastAfter).toMatch(/12(\.0+)?/);
  });

  it("plots equity curve values that match cash plus finite mark-to-market holdings at recorded samples", async () => {
    // covers AC-3
    useMarketStore.setState({
      cash: 50_000,
      positions: { AAPL: { shares: 10, averageCost: 100 } },
      tradeHistory: [],
      marketHistory: {},
      selectedTicker: "AAPL",
      prices: { AAPL: 125 },
    });

    renderMarketDashboard();

    await act(async () => {
      useMarketStore.getState().applyMarketTick({
        prices: { AAPL: 130 },
        historySamples: [{ ticker: "AAPL", point: { t: 500, price: 130 } }],
      });
    });

    const expectedEquity = 50_000 + 10 * 130;
    const region = screen.getByTestId("equity-curve-chart");
    const lastEquity = within(region).getByTestId("equity-curve-last-equity");
    expect(Number(lastEquity.textContent?.replace(/[^0-9.-]/g, ""))).toBeCloseTo(expectedEquity, 5);
  });

  it("shows ROI (%), Day P&L, and Total P&L readouts from the analytics surface", () => {
    // covers AC-4
    useMarketStore.setState({
      cash: 80_000,
      positions: { XOM: { shares: 5, averageCost: 50 } },
      tradeHistory: [],
      marketHistory: {},
      selectedTicker: "XOM",
      prices: { XOM: 60 },
    });

    renderMarketDashboard();

    const panel = screen.getByTestId("portfolio-analytics-metrics");
    expect(panel.textContent).toMatch(/ROI\s*\(%\)/i);
    expect(panel.textContent).toMatch(/Day\s*P&L/i);
    expect(panel.textContent).toMatch(/Total\s*P&L/i);

    const roi = within(panel).getByTestId("portfolio-analytics-roi-value");
    const dayPnl = within(panel).getByTestId("portfolio-analytics-day-pnl-value");
    const totalPnl = within(panel).getByTestId("portfolio-analytics-total-pnl-value");

    expect(roi.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    expect(dayPnl.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    expect(totalPnl.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });

  it("renders diversification slice labels proportional to each holding’s mark using issued equity only (no cash slice)", async () => {
    // covers AC-5
    useMarketStore.setState({
      cash: 100_000,
      positions: {
        AAA: { shares: 10, averageCost: 10 },
        BBB: { shares: 10, averageCost: 10 },
      },
      tradeHistory: [],
      marketHistory: {},
      selectedTicker: "AAA",
      prices: { AAA: 100, BBB: 50 },
    });

    renderMarketDashboard();

    const pie = screen.getByTestId("holdings-diversification-chart");
    const initialAaaPct = within(pie).getByTestId("holdings-diversification-slice-pct-AAA").textContent;
    const initialBbbPct = within(pie).getByTestId("holdings-diversification-slice-pct-BBB").textContent;
    expect(initialAaaPct).toMatch(/66/);
    expect(initialBbbPct).toMatch(/33/);

    await act(async () => {
      const { simulateTradeExecution } = await import("../../market/simulateTradeExecution");
      const outcome = simulateTradeExecution({
        cash: useMarketStore.getState().cash,
        positions: useMarketStore.getState().positions,
        ticker: "AAA",
        side: "sell",
        quantity: 5,
        pricePerShare: 100,
      });
      expect(outcome.ok).toBe(true);
      if (outcome.ok) {
        useMarketStore.getState().applyTradeResult(outcome.result);
      }
    });

    const pieAfter = screen.getByTestId("holdings-diversification-chart");
    const aaaAfter = within(pieAfter).getByTestId("holdings-diversification-slice-pct-AAA").textContent;
    const bbbAfter = within(pieAfter).getByTestId("holdings-diversification-slice-pct-BBB").textContent;
    expect(aaaAfter).not.toBe(initialAaaPct);
    expect(bbbAfter).not.toBe(initialBbbPct);
  });

  it("refreshes every visualization after mutations made only through existing store actions (no extra fetch hooks in chart modules)", async () => {
    // covers AC-6
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    useMarketStore.setState({
      selectedTicker: "MSFT",
      marketHistory: { MSFT: [{ t: 1, price: 200 }] },
      prices: { MSFT: 200 },
      positions: { MSFT: { shares: 1, averageCost: 180 } },
    });

    renderMarketDashboard();

    await act(async () => {
      useMarketStore.getState().applyMarketTick({
        prices: { MSFT: 205 },
        historySamples: [{ ticker: "MSFT", point: { t: 2, price: 205 } }],
      });
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("selected-ticker-price-chart")).toBeTruthy();
    expect(screen.getByTestId("equity-curve-chart")).toBeTruthy();
    expect(screen.getByTestId("portfolio-analytics-metrics")).toBeTruthy();
    expect(screen.getByTestId("holdings-diversification-chart")).toBeTruthy();
  });

  it("keeps chart regions legible when the dashboard root is narrowed and widened", () => {
    // covers AC-9
    useMarketStore.setState({
      selectedTicker: "IBM",
      marketHistory: { IBM: buildPriceSeries(20) },
      prices: { IBM: 200 },
    });

    const { container } = renderMarketDashboard();
    const root = screen.getByTestId("market-dashboard");
    const priceChart = screen.getByTestId("selected-ticker-price-chart");
    const equityChart = screen.getByTestId("equity-curve-chart");

    root.style.width = "320px";
    root.getBoundingClientRect();
    expect(priceChart.getBoundingClientRect().width).toBeGreaterThan(0);
    expect(equityChart.getBoundingClientRect().width).toBeGreaterThan(0);
    expect(window.getComputedStyle(priceChart).visibility).not.toBe("hidden");

    root.style.width = "960px";
    container.dispatchEvent(new Event("resize"));
    expect(priceChart.getBoundingClientRect().width).toBeGreaterThan(0);
    expect(equityChart.getBoundingClientRect().width).toBeGreaterThan(0);
  });

  it("shows graceful empty or partial states for missing selection, empty history, and long buffers without deadlocking", () => {
    // covers AC-10
    useMarketStore.setState({
      cash: DEFAULT_INITIAL_CASH,
      positions: {},
      tradeHistory: [],
      marketHistory: { NVDA: buildPriceSeries(5_000, 1) },
      selectedTicker: null,
      prices: { NVDA: 900 },
    });

    const { rerender } = renderMarketDashboard();
    expect(screen.getByTestId("selected-ticker-price-chart-empty-state")).toBeTruthy();

    act(() => {
      useMarketStore.setState({
        selectedTicker: "NVDA",
        marketHistory: { NVDA: [] },
        prices: { NVDA: 900 },
      });
    });
    rerender(
      <StrictMode>
        <MarketDashboard />
      </StrictMode>,
    );
    expect(screen.getByTestId("selected-ticker-price-chart-empty-state")).toBeTruthy();

    act(() => {
      useMarketStore.setState({
        marketHistory: { NVDA: buildPriceSeries(120, 1) },
      });
    });
    rerender(
      <StrictMode>
        <MarketDashboard />
      </StrictMode>,
    );
    const chart = screen.getByTestId("selected-ticker-price-chart");
    expect(within(chart).getByTestId("selected-ticker-price-chart-rendered-count").textContent?.trim()).toBe(
      "100",
    );
  });

  it("keeps ROI, Day P&L, and Total P&L numerics coherent with a single reference equity baseline after rehydration", async () => {
    // covers AC-11
    const snapshot = {
      state: {
        cash: 75_000,
        positions: {} as Record<string, { shares: number; averageCost?: number }>,
        tradeHistory: [] as [],
        marketHistory: {} as Record<string, PricePoint[]>,
        selectedTicker: "COKE",
        prices: { COKE: 40 },
      },
      version: 0,
    };
    mem.setItem(MARKET_STORE_STORAGE_KEY, JSON.stringify(snapshot));
    await useMarketStore.persist.rehydrate();

    renderMarketDashboard();

    const panel = screen.getByTestId("portfolio-analytics-metrics");
    const reference = Number(
      within(panel).getByTestId("portfolio-analytics-reference-equity").textContent?.replace(/[^0-9.-]/g, "") ??
        "",
    );
    const totalAbs = Math.abs(
      Number(within(panel).getByTestId("portfolio-analytics-total-pnl-value").textContent?.replace(/[^0-9.-]/g, "")),
    );
    const roi = Number(
      within(panel).getByTestId("portfolio-analytics-roi-value").textContent?.replace(/[^0-9.-]/g, "") ?? "",
    );

    expect(reference).toBeCloseTo(75_000, 5);
    expect(totalAbs).toBeLessThan(1e-6);
    expect(Math.abs(roi)).toBeLessThan(1e-3);

    await act(async () => {
      useMarketStore.getState().applyMarketTick({
        prices: { COKE: 45 },
        historySamples: [{ ticker: "COKE", point: { t: 700, price: 45 } }],
      });
    });

    const totalAfter = Number(
      within(panel).getByTestId("portfolio-analytics-total-pnl-value").textContent?.replace(/[^0-9.-]/g, ""),
    );
    expect(totalAfter).toBeCloseTo(0, 3);
  });

  it("renders selected price samples with non-decreasing time order after successive ticks", async () => {
    // covers AC-12
    useMarketStore.setState({
      selectedTicker: "QQQ",
      marketHistory: { QQQ: [{ t: 10, price: 100 }] },
      prices: { QQQ: 100 },
    });

    renderMarketDashboard();

    await act(async () => {
      for (const t of [11, 12, 13, 14]) {
        useMarketStore.getState().applyMarketTick({
          prices: { QQQ: 100 + t * 0.1 },
          historySamples: [{ ticker: "QQQ", point: { t, price: 100 + t * 0.1 } }],
        });
      }
    });

    const chart = screen.getByTestId("selected-ticker-price-chart");
    const nodes = chart.querySelectorAll('[data-testid^="price-chart-series-point-t-"]');
    const ts = Array.from(nodes).map((n) => Number(n.getAttribute("data-t")));
    const sorted = [...ts].sort((a, b) => a - b);
    expect(ts).toEqual(sorted);
    expect(ts.at(-1)).toBe(14);
  });

  it("replaces the price trace when selectedTicker changes so prior symbols do not leak into the chart", () => {
    // covers AC-13
    useMarketStore.setState({
      selectedTicker: "AAA",
      marketHistory: {
        AAA: buildPriceSeries(30, 1),
        BBB: buildPriceSeries(12, 200),
      },
      prices: { AAA: 200, BBB: 300 },
    });

    renderMarketDashboard();
    expect(
      within(screen.getByTestId("selected-ticker-price-chart")).getByTestId(
        "selected-ticker-price-chart-active-symbol",
      ).textContent,
    ).toBe("AAA");

    act(() => {
      useMarketStore.getState().setSelectedTicker("BBB");
    });

    const chart = screen.getByTestId("selected-ticker-price-chart");
    expect(within(chart).getByTestId("selected-ticker-price-chart-active-symbol").textContent).toBe("BBB");
    expect(within(chart).getByTestId("selected-ticker-price-chart-rendered-count").textContent?.trim()).toBe(
      "12",
    );
    expect(within(chart).queryByTestId("price-chart-series-point-t-5")).toBeNull();
  });

  it("omits positions lacking finite marks from diversification without throwing and keeps other analytics mounted", () => {
    // covers AC-14
    useMarketStore.setState({
      cash: 40_000,
      positions: {
        OK: { shares: 2, averageCost: 10 },
        BAD: { shares: 3, averageCost: 10 },
      },
      tradeHistory: [],
      marketHistory: {},
      selectedTicker: "OK",
      prices: { OK: 55 },
    });

    expect(() => renderMarketDashboard()).not.toThrow();
    expect(screen.getByTestId("holdings-diversification-chart")).toBeTruthy();
    expect(screen.queryByTestId("holdings-diversification-slice-pct-BAD")).toBeNull();
  });
});
