/** @vitest-environment happy-dom */
import { StrictMode } from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_INITIAL_CASH,
  MARKET_STORE_STORAGE_KEY,
  useMarketStore,
} from "../stores/market/marketStore";
import type { PricePoint } from "../stores/market/types";

const repoRoot = process.cwd();

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

function resolveNextDashboardPage(): string | null {
  const candidates = ["app/dashboard/page.tsx", "src/app/dashboard/page.tsx", "pages/dashboard.tsx"].map((rel) =>
    join(repoRoot, rel),
  );
  return candidates.find((p) => existsSync(p)) ?? null;
}

function setViewportWidth(width: number): void {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
}

describe("Responsive dashboard layout acceptance", () => {
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
      prices: {},
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

  it("charters a Next.js dashboard route whose markup composes layout with Tailwind utility classes", () => {
    // covers AC-1
    const pagePath = resolveNextDashboardPage();
    expect(pagePath, "Expected a Next.js dashboard page at app/dashboard/page.tsx (or equivalent)").not.toBeNull();

    const src = readFileSync(pagePath!, "utf8");
    const usesTailwindLayout =
      /\bclassName\s*=\s*(?:["'`{]|cn\(|\{[^\}]*["'])/.test(src) &&
      /\b(grid|flex|lg:|md:|sm:)\b/.test(src);
    expect(usesTailwindLayout).toBe(true);

    const mentionsNextSurface =
      src.includes("next/") || src.includes("Next") || src.includes('"use client"') || src.includes("'use client'");
    expect(mentionsNextSurface).toBe(true);
  });

  it("at a desktop viewport width, displays three adjacent columns in order Tickers then Chart/Trade then Portfolio", async () => {
    // covers AC-2 — structural/grid charter (happy-dom does not lay out CSS grid tracks geometrically).
    setViewportWidth(1280);
    const { MarketDashboard } = await import("./MarketDashboard");
    const { container } = render(
      <StrictMode>
        <MarketDashboard />
      </StrictMode>,
    );

    const shell = screen.getByTestId("responsive-dashboard-shell");
    Object.assign(shell.style, { width: "1280px", maxWidth: "1280px", boxSizing: "border-box" });
    container.dispatchEvent(new Event("resize"));

    const grid = screen.getByTestId("dashboard-layout-grid");
    expect(grid.className).toMatch(/\bgrid\b/);
    expect(grid.className).toMatch(/\bgrid-cols-1\b/);
    expect(grid.className).toMatch(/\blg:grid-cols-3\b/);

    const tickersCol = within(shell).getByTestId("dashboard-column-tickers");
    const chartTradeCol = within(shell).getByTestId("dashboard-column-chart-trade");
    const portfolioCol = within(shell).getByTestId("dashboard-column-portfolio");

    const order = Array.from(grid.children);
    expect(order.indexOf(tickersCol)).toBe(0);
    expect(order.indexOf(chartTradeCol)).toBe(1);
    expect(order.indexOf(portfolioCol)).toBe(2);
  });

  it("on a narrow viewport, reflows the three logical columns top-to-bottom without forcing horizontal scroll", async () => {
    // covers AC-3
    setViewportWidth(360);
    const { MarketDashboard } = await import("./MarketDashboard");
    const { container } = render(
      <StrictMode>
        <MarketDashboard />
      </StrictMode>,
    );

    const shell = screen.getByTestId("responsive-dashboard-shell");
    Object.assign(shell.style, { width: "360px", maxWidth: "360px", boxSizing: "border-box" });
    container.dispatchEvent(new Event("resize"));

    const tickersCol = within(shell).getByTestId("dashboard-column-tickers");
    const chartTradeCol = within(shell).getByTestId("dashboard-column-chart-trade");
    const portfolioCol = within(shell).getByTestId("dashboard-column-portfolio");

    const tTop = tickersCol.getBoundingClientRect().top;
    const mTop = chartTradeCol.getBoundingClientRect().top;
    const pTop = portfolioCol.getBoundingClientRect().top;

    expect(tTop).toBeLessThanOrEqual(mTop + 2);
    expect(mTop).toBeLessThanOrEqual(pTop + 2);

    expect(document.documentElement.scrollWidth - document.documentElement.clientWidth).toBeLessThanOrEqual(32);
  });

  it("maps Live Ticker, Trading Terminal + instrument charting, and portfolio analytics surfaces to the chartered columns", async () => {
    // covers AC-4
    const { MarketDashboard } = await import("./MarketDashboard");
    render(
      <StrictMode>
        <MarketDashboard />
      </StrictMode>,
    );

    const shell = screen.getByTestId("responsive-dashboard-shell");
    const tickersCol = within(shell).getByTestId("dashboard-column-tickers");
    const chartTradeCol = within(shell).getByTestId("dashboard-column-chart-trade");
    const portfolioCol = within(shell).getByTestId("dashboard-column-portfolio");

    expect(within(tickersCol).getByTestId("live-ticker-panel")).toBeTruthy();
    expect(within(tickersCol).queryByTestId("trading-terminal")).toBeNull();
    expect(within(tickersCol).queryByTestId("selected-ticker-price-chart")).toBeNull();

    expect(within(chartTradeCol).getByTestId("trading-terminal")).toBeTruthy();
    expect(within(chartTradeCol).getByTestId("selected-ticker-price-chart")).toBeTruthy();
    expect(within(chartTradeCol).getByTestId("chart-strip-panel")).toBeTruthy();

    expect(within(portfolioCol).getByTestId("analytics-panel")).toBeTruthy();
    expect(within(portfolioCol).getByTestId("holdings-diversification-chart")).toBeTruthy();
    expect(within(portfolioCol).getByTestId("equity-curve-chart")).toBeTruthy();
  });

  it("after rehydration, shows persisted portfolio and market fields before the first timed simulation tick advances prices", async () => {
    // covers AC-5
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });

    const snapshot = {
      state: {
        cash: 77_777.25,
        positions: { SEED: { shares: 3, averageCost: 20 } },
        tradeHistory: [],
        marketHistory: {
          SEED: [{ t: 1, price: 55.5 } as PricePoint],
        },
        selectedTicker: "SEED",
        prices: { SEED: 55.5 },
        referenceEquity: 77_777.25,
        equityHistory: [],
        equityDayKey: null,
        dayOpenEquity: 77_777.25,
      },
      version: 0,
    };
    mem.setItem(MARKET_STORE_STORAGE_KEY, JSON.stringify(snapshot));
    await useMarketStore.persist.rehydrate();

    const applySpy = vi.spyOn(useMarketStore.getState(), "applyMarketTick");

    const { MarketDashboard } = await import("./MarketDashboard");
    render(
      <StrictMode>
        <MarketDashboard />
      </StrictMode>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(applySpy.mock.calls.length).toBe(0);

    const refLine = screen.getByTestId("portfolio-analytics-reference-equity").textContent ?? "";
    expect(refLine.replace(/[^0-9.-]/g, "")).toContain("77777.25");
    expect(screen.getByTestId("live-ticker-row-SEED").textContent ?? "").toContain("55.50");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(applySpy.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("keeps ticker strip, chart/trade, and portfolio readouts aligned to the same store snapshot after ticks and trade paths", async () => {
    // covers AC-6
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });

    useMarketStore.setState({
      cash: 50_000,
      positions: {},
      tradeHistory: [],
      marketHistory: { ZZ: [{ t: 0, price: 200 }] },
      selectedTicker: "ZZ",
      prices: { ZZ: 200 },
      referenceEquity: 50_000,
      equityHistory: [],
      equityDayKey: null,
      dayOpenEquity: 50_000,
    });

    const { MarketDashboard } = await import("./MarketDashboard");
    render(
      <StrictMode>
        <MarketDashboard />
      </StrictMode>,
    );

    await act(async () => {
      useMarketStore.getState().applyMarketTick({
        prices: { ZZ: 210 },
        historySamples: [{ ticker: "ZZ", point: { t: 1, price: 210 } }],
      });
    });

    const px = useMarketStore.getState().prices.ZZ!;
    expect(screen.getByTestId("live-ticker-row-ZZ").textContent ?? "").toContain(px.toFixed(2));

    const chartLast = within(screen.getByTestId("selected-ticker-price-chart")).getByTestId(
      "selected-ticker-price-chart-last-price",
    );
    expect(chartLast.textContent).toMatch(new RegExp(String(px)));

    const reference = within(screen.getByTestId("portfolio-analytics-metrics")).getByTestId(
      "portfolio-analytics-reference-equity",
    );
    expect(reference.textContent).toMatch(/50[,\d]*/);
  });

  it("does not invoke fetch for financial data while the dashboard simulation is running", async () => {
    // covers AC-7
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    useMarketStore.setState({
      cash: DEFAULT_INITIAL_CASH,
      positions: {},
      tradeHistory: [],
      marketHistory: {},
      selectedTicker: "AAPL",
      prices: { AAPL: 100 },
    });

    const { MarketDashboard } = await import("./MarketDashboard");
    render(
      <StrictMode>
        <MarketDashboard />
      </StrictMode>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps trade execution, RNG stepping, and persistence serializers out of presentational dashboard JSX modules", () => {
    // covers AC-8
    const panelPaths = [
      join(repoRoot, "src/components/marketDashboard/LiveTickerPanel.tsx"),
      join(repoRoot, "src/components/marketDashboard/TradingTerminal.tsx"),
      join(repoRoot, "src/components/marketDashboard/SelectedTickerPriceChart.tsx"),
      join(repoRoot, "src/components/marketDashboard/AnalyticsPanel.tsx"),
    ];
    for (const p of panelPaths) {
      expect(existsSync(p), `Missing chartered UI module: ${p}`).toBe(true);
      const src = readFileSync(p, "utf8");
      expect(src.includes("Math.random"), `${p} must not embed tick RNG in JSX module`).toBe(false);
      expect(
        src.includes("simulateTradeExecution"),
        `${p} must route executions through store facades, not inlined calculators`,
      ).toBe(false);
    }
  });

  it("preserves responsive layout scaffolding (grid classes) while high-frequency store ticks update numeric readouts", async () => {
    // covers AC-9
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });

    useMarketStore.setState({
      cash: 20_000,
      positions: {},
      tradeHistory: [],
      marketHistory: { JIT: [{ t: 0, price: 10 }] },
      selectedTicker: "JIT",
      prices: { JIT: 10 },
    });

    const { MarketDashboard } = await import("./MarketDashboard");
    render(
      <StrictMode>
        <MarketDashboard />
      </StrictMode>,
    );

    const grid = screen.getByTestId("dashboard-layout-grid");
    const classBefore = grid.getAttribute("class") ?? "";

    for (let i = 0; i < 15; i++) {
      await act(async () => {
        useMarketStore.getState().applyMarketTick({
          prices: { JIT: 10 + i * 0.01 },
          historySamples: [{ ticker: "JIT", point: { t: i + 1, price: 10 + i * 0.01 } }],
        });
      });
    }

    expect(grid.getAttribute("class") ?? "").toBe(classBefore);
  });

  it("observes rehydration completion before the tick controller applies simulation updates (no premature ticks on mount)", async () => {
    // covers AC-10
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });

    mem.setItem(
      MARKET_STORE_STORAGE_KEY,
      JSON.stringify({
        state: {
          cash: 88_888,
          positions: {},
          tradeHistory: [],
          marketHistory: {},
          selectedTicker: null,
          prices: {},
        },
        version: 0,
      }),
    );

    await useMarketStore.persist.rehydrate();

    const applySpy = vi.spyOn(useMarketStore.getState(), "applyMarketTick");

    const { MarketDashboard } = await import("./MarketDashboard");
    render(
      <StrictMode>
        <MarketDashboard />
      </StrictMode>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(useMarketStore.persist.hasHydrated()).toBe(true);
    expect(applySpy.mock.calls.length).toBe(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(applySpy.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
