/** @vitest-environment happy-dom */
import { StrictMode } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HoldingsDiversificationChart } from "./HoldingsDiversificationChart";
import { DEFAULT_INITIAL_CASH, useMarketStore } from "../../stores/market";

describe("HoldingsDiversificationChart weights and store updates", () => {
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

  it("shows empty copy when nothing is markable (AC-10)", () => {
    render(
      <StrictMode>
        <HoldingsDiversificationChart />
      </StrictMode>,
    );
    expect(screen.getByTestId("holdings-diversification-chart").textContent).toContain("No valued holdings");
  });

  it("omits positions without finite marks without crashing (AC-14)", () => {
    useMarketStore.setState({
      positions: {
        BAD: { shares: 10, averageCost: 5 },
        OK: { shares: 10, averageCost: 5 },
      },
      prices: { BAD: NaN, OK: 20 },
    });

    render(
      <StrictMode>
        <HoldingsDiversificationChart />
      </StrictMode>,
    );

    expect(screen.queryByTestId("holdings-diversification-slice-pct-BAD")).toBeNull();
    expect(screen.getByTestId("holdings-diversification-slice-pct-OK").textContent).toMatch(/^100\.0%/);
  });

  it("legend percentages sum to ~100% for weighted slices (shares × price)", () => {
    useMarketStore.setState({
      positions: {
        AAA: { shares: 40, averageCost: 50 },
        BBB: { shares: 10, averageCost: 100 },
      },
      prices: { AAA: 10, BBB: 200 },
    });

    render(
      <StrictMode>
        <HoldingsDiversificationChart />
      </StrictMode>,
    );

    const pAa = Number.parseFloat(screen.getByTestId("holdings-diversification-slice-pct-AAA").textContent!);
    const pBb = Number.parseFloat(screen.getByTestId("holdings-diversification-slice-pct-BBB").textContent!);
    expect(pAa + pBb).toBeCloseTo(100, 4);
    // Legend rounds to one decimal (component uses `toFixed(1)`).
    expect(pAa).toBeCloseTo(Number(((400 / 2400) * 100).toFixed(1)), 5);
    expect(pBb).toBeCloseTo(Number(((2000 / 2400) * 100).toFixed(1)), 5);
  });

  it("reflects holdings after applyTradeResult without reload (AC-5)", async () => {
    useMarketStore.setState({
      cash: DEFAULT_INITIAL_CASH,
      positions: {},
      prices: { Q: 52 },
    });

    render(
      <StrictMode>
        <HoldingsDiversificationChart />
      </StrictMode>,
    );

    expect(screen.getByTestId("holdings-diversification-chart").textContent).toContain("No valued holdings");

    await act(async () => {
      useMarketStore.getState().applyTradeResult({
        nextCash: DEFAULT_INITIAL_CASH - 4000,
        positions: { Q: { shares: 80, averageCost: 50 } },
        trade: {
          id: "e1",
          ticker: "Q",
          side: "buy",
          shares: 80,
          pricePerShare: 50,
          timestamp: 100,
        },
      });
    });

    expect(screen.getByTestId("holdings-diversification-slice-pct-Q").textContent).toMatch(/^100\.0%/);
  });
});
