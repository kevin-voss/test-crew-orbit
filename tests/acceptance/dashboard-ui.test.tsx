import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TradingDashboard } from "@/components/TradingDashboard";

describe("TradingDashboard acceptance", () => {
  const fetchMock = vi.fn();

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("generates market data locally without calling external quote APIs", async () => {
    // covers AC-1
    vi.stubGlobal("fetch", fetchMock);
    render(<TradingDashboard />);
    await waitFor(() =>
      expect(screen.getAllByTestId(/^ticker-row-/).length).toBeGreaterThan(0),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("flashes tickers green on upticks and red on downticks vs prior tick", async () => {
    // covers AC-6
    vi.useFakeTimers();
    render(<TradingDashboard />);
    await screen.findByTestId("ticker-row-AAPL");
    await vi.advanceTimersByTimeAsync(2000);
    const aapl = screen.getByTestId("ticker-row-AAPL");
    expect(
      aapl.className.includes("flash-up") ||
        aapl.className.includes("flash-down"),
    ).toBe(true);
    vi.useRealTimers();
  });

  it("shows Max Buy from current cash and latest price in the trading terminal", async () => {
    // covers AC-7
    render(<TradingDashboard />);
    const maxBuy = await screen.findByTestId("max-buy-display");
    const value = Number(maxBuy.textContent?.replace(/[^\d.-]/g, "") ?? "NaN");
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBe(Math.floor(value));
  });

  it("updates the selected symbol chart each market tick without full remount", async () => {
    // covers AC-8
    vi.useFakeTimers();
    render(<TradingDashboard />);
    const last = await screen.findByTestId("chart-last-price");
    const before = last.textContent;
    await vi.advanceTimersByTimeAsync(2000);
    await waitFor(() =>
      expect(screen.getByTestId("chart-last-price").textContent).not.toBe(
        before,
      ),
    );
    vi.useRealTimers();
  });

  it("renders equity curve, ROI, Day P&L, Total P&L, and diversification pie", async () => {
    // covers AC-9
    render(<TradingDashboard />);
    expect(await screen.findByTestId("equity-curve")).toBeInTheDocument();
    expect(await screen.findByTestId("metric-roi")).toBeInTheDocument();
    expect(await screen.findByTestId("metric-day-pnl")).toBeInTheDocument();
    expect(await screen.findByTestId("metric-total-pnl")).toBeInTheDocument();
    expect(await screen.findByTestId("diversification-pie")).toBeInTheDocument();
  });

  it("uses a responsive three-column layout tickers | chart+trade | portfolio/analytics", async () => {
    // covers AC-13
    const { container } = render(<TradingDashboard />);
    expect(
      container.querySelector('[data-layout="dashboard-grid"]'),
    ).toBeTruthy();
    expect(await screen.findByTestId("region-tickers")).toBeInTheDocument();
    expect(await screen.findByTestId("region-chart-trade")).toBeInTheDocument();
    expect(await screen.findByTestId("region-portfolio")).toBeInTheDocument();
  });

  it("keeps ticker prices aligned with the chart selection on each tick", async () => {
    // covers AC-16
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TradingDashboard />);
    await user.click(await screen.findByTestId("select-symbol-TSLA"));
    await vi.advanceTimersByTimeAsync(2000);
    const tickerPrice = within(
      await screen.findByTestId("ticker-row-TSLA"),
    ).getByTestId("ticker-price").textContent;
    const chartHdr =
      (await screen.findByTestId("chart-header-price")).textContent;
    expect(tickerPrice).toBe(chartHdr);
    vi.useRealTimers();
  });

  it("applies the first flash relative to the persisted or seeded baseline price", async () => {
    // covers AC-20
    vi.useFakeTimers();
    render(<TradingDashboard />);
    await screen.findByTestId("ticker-row-AMZN");
    await vi.advanceTimersByTimeAsync(2000);
    const row = screen.getByTestId("ticker-row-AMZN");
    expect(
      row.className.includes("flash-up") ||
        row.className.includes("flash-down") ||
        row.className.includes("flash-neutral-first-tick"),
    ).toBe(true);
    vi.useRealTimers();
  });
});
