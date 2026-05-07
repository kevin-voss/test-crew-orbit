/** @vitest-environment happy-dom */
import { StrictMode } from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EquityCurveChart } from "./EquityCurveChart";
import { DEFAULT_INITIAL_CASH, useMarketStore } from "../../stores/market/marketStore";

describe("EquityCurveChart store-driven rendering", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
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
  });

  it("shows the awaiting empty-state when equityHistory is empty", () => {
    render(
      <StrictMode>
        <EquityCurveChart />
      </StrictMode>,
    );
    expect(screen.getByTestId("equity-curve-chart-empty-state").textContent).toContain("Awaiting equity samples");
    expect(Number(screen.getByTestId("equity-curve-last-equity").textContent?.replace(/[^0-9.-]/g, ""))).toBeCloseTo(
      DEFAULT_INITIAL_CASH,
      3,
    );
  });

  it("shows intermediate empty-state with one buffered equity point until a second sample lands", async () => {
    render(
      <StrictMode>
        <EquityCurveChart />
      </StrictMode>,
    );

    await act(async () => {
      useMarketStore.getState().applyMarketTick({
        prices: { XYZ: 10 },
        historySamples: [{ ticker: "XYZ", point: { t: 900, price: 10 } }],
      });
    });

    expect(screen.getByTestId("equity-curve-chart-empty-state").textContent).toContain(
      "Add another equity sample for a curve",
    );

    await act(async () => {
      useMarketStore.getState().applyMarketTick({
        prices: { XYZ: 11 },
        historySamples: [{ ticker: "XYZ", point: { t: 901, price: 11 } }],
      });
    });

    expect(screen.queryByTestId("equity-curve-chart-empty-state")).toBeNull();
  });

  it("displays headline equity aligned with newest time-ordered equityHistory row after ticks", async () => {
    useMarketStore.setState({
      cash: 40_000,
      positions: { Z: { shares: 100, averageCost: 50 } },
      prices: { Z: 50 },
      equityHistory: [],
    });

    render(
      <StrictMode>
        <EquityCurveChart />
      </StrictMode>,
    );

    await act(async () => {
      useMarketStore.getState().applyMarketTick({
        prices: { Z: 52 },
        historySamples: [{ ticker: "Z", point: { t: 600, price: 52 } }],
      });
      useMarketStore.getState().applyMarketTick({
        prices: { Z: 53 },
        historySamples: [{ ticker: "Z", point: { t: 650, price: 53 } }],
      });
    });

    const expectedHeadline = 40_000 + 100 * 53;
    const region = screen.getByTestId("equity-curve-chart");
    const last = within(region).getByTestId("equity-curve-last-equity");
    expect(Number(last.textContent?.replace(/[^0-9.-]/g, ""))).toBeCloseTo(expectedHeadline, 5);
  });

  it("records trade equity snapshots using TradeRecord.timestamp as t", async () => {
    useMarketStore.setState({
      cash: 50_000,
      positions: {},
      tradeHistory: [],
      prices: {},
      equityHistory: [],
    });

    render(
      <StrictMode>
        <EquityCurveChart />
      </StrictMode>,
    );

    await act(async () => {
      useMarketStore.getState().applyTradeResult({
        nextCash: 48_000,
        positions: { Q: { shares: 40, averageCost: 50 } },
        trade: {
          id: "e1",
          ticker: "Q",
          side: "buy",
          shares: 40,
          pricePerShare: 50,
          timestamp: 777,
        },
      });
      useMarketStore.getState().applyMarketTick({
        prices: { Q: 60 },
        historySamples: [{ ticker: "Q", point: { t: 1000, price: 60 } }],
      });
    });

    const series = [...useMarketStore.getState().equityHistory].sort((a, b) => a.t - b.t);
    expect(series.some((row) => row.t === 777)).toBe(true);
    expect(series.at(-1)!.t).toBe(1000);
  });
});
