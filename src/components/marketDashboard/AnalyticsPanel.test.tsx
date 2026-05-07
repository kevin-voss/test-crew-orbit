/** @vitest-environment happy-dom */
import { StrictMode } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AnalyticsPanel } from "./AnalyticsPanel";
import { DEFAULT_INITIAL_CASH, useMarketStore } from "../../stores/market/marketStore";

function parseMoney(text: string | null | undefined): number {
  return Number(text?.replace(/[^0-9.-]/g, "") ?? "NaN");
}

describe("AnalyticsPanel", () => {
  beforeEach(() => {
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

  it("shows ROI, Day P&L, and Total P&L with stable test ids", () => {
    render(
      <StrictMode>
        <AnalyticsPanel />
      </StrictMode>,
    );
    expect(screen.getByTestId("analytics-panel")).toBeTruthy();
    expect(screen.getByTestId("portfolio-analytics-roi-value")).toBeTruthy();
    expect(screen.getByTestId("portfolio-analytics-day-pnl-value")).toBeTruthy();
    expect(screen.getByTestId("portfolio-analytics-total-pnl-value")).toBeTruthy();
  });

  it("updates metrics when marks and cost basis change (AC-4)", async () => {
    useMarketStore.setState({
      cash: 40_000,
      referenceEquity: 50_000,
      positions: { Z: { shares: 100, averageCost: 50 } },
      prices: { Z: 52 },
    });

    render(
      <StrictMode>
        <AnalyticsPanel />
      </StrictMode>,
    );

    const equity = 40_000 + 100 * 52;
    expect(parseMoney(screen.getByTestId("portfolio-analytics-total-pnl-value").textContent)).toBeCloseTo(
      equity - 50_000,
      2,
    );
    expect(parseMoney(screen.getByTestId("portfolio-analytics-day-pnl-value").textContent)).toBeCloseTo(
      100 * (52 - 50),
      2,
    );

    await act(async () => {
      useMarketStore.setState({ prices: { Z: 53 } });
    });

    const equity2 = 40_000 + 100 * 53;
    expect(parseMoney(screen.getByTestId("portfolio-analytics-total-pnl-value").textContent)).toBeCloseTo(
      equity2 - 50_000,
      2,
    );
    expect(parseMoney(screen.getByTestId("portfolio-analytics-day-pnl-value").textContent)).toBeCloseTo(
      100 * (53 - 50),
      2,
    );
  });

  it("keeps Total P&L and ROI consistent with reference equity R after rehydrated baseline (AC-11)", () => {
    const R = 88_000;
    useMarketStore.setState({
      cash: 80_000,
      referenceEquity: R,
      positions: { Q: { shares: 200, averageCost: 40 } },
      prices: { Q: 50 },
    });

    render(
      <StrictMode>
        <AnalyticsPanel />
      </StrictMode>,
    );

    const equity = 80_000 + 200 * 50;
    const totalPnl = equity - R;
    expect(parseMoney(screen.getByTestId("portfolio-analytics-total-pnl-value").textContent)).toBeCloseTo(totalPnl, 2);
    expect(screen.getByTestId("portfolio-analytics-reference-equity").textContent).toContain("88,000");
    const roiText = screen.getByTestId("portfolio-analytics-roi-value").textContent ?? "";
    const roi = Number(roiText.replace("%", ""));
    const expectedRoi = ((equity - R) / Math.max(Math.abs(R), 1e-9)) * 100;
    expect(roi).toBeCloseTo(Number(expectedRoi.toFixed(2)), 5);
  });

  it("does not fault when a position lacks a finite mark (AC-14)", () => {
    useMarketStore.setState({
      cash: 25_000,
      referenceEquity: 25_000,
      positions: { Orphan: { shares: 10, averageCost: 100 } },
      prices: {},
    });

    expect(() =>
      render(
        <StrictMode>
          <AnalyticsPanel />
        </StrictMode>,
      ),
    ).not.toThrow();

    expect(parseMoney(screen.getByTestId("portfolio-analytics-day-pnl-value").textContent)).toBeCloseTo(0, 5);
    expect(parseMoney(screen.getByTestId("portfolio-analytics-total-pnl-value").textContent)).toBeCloseTo(0, 5);
  });
});
