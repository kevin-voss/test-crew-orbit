/** @vitest-environment happy-dom */
import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_INITIAL_CASH,
  MARKET_STORE_STORAGE_KEY,
  useMarketStore,
} from "../../stores/market/marketStore";

/**
 * Component under test — implementation per crew-orbit/feature-build-trading-terminal/spec/requirements.md
 */
import { TradingTerminal } from "./TradingTerminal";

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

/** Harness-only consumer to observe cross-panel store consistency (not production UI). */
function PortfolioCashProbe() {
  const cash = useMarketStore((s) => s.cash);
  const shares = useMarketStore((s) => {
    const t = s.selectedTicker;
    return t != null ? (s.positions[t]?.shares ?? 0) : 0;
  });
  return (
    <div data-testid="portfolio-probe">
      <span data-testid="probe-cash">{cash}</span>
      <span data-testid="probe-shares">{shares}</span>
    </div>
  );
}

function renderTradingTerminalTree() {
  return render(
    <StrictMode>
      <PortfolioCashProbe />
      <TradingTerminal />
    </StrictMode>,
  );
}

function seedTradingTerminalContext(opts: {
  ticker: string | null;
  cash?: number;
  positions?: Record<string, { shares: number; averageCost?: number }>;
  price?: number;
}) {
  useMarketStore.setState({
    cash: opts.cash ?? DEFAULT_INITIAL_CASH,
    positions: opts.positions ?? {},
    tradeHistory: [],
    marketHistory: {},
    selectedTicker: opts.ticker,
    prices: {},
  });
  if (opts.price != null && opts.ticker) {
    useMarketStore.getState().applyMarketTick({
      prices: { [opts.ticker]: opts.price },
    });
  }
}

describe("Trading Terminal acceptance", () => {
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

  it("exposes explicit Buy and Sell selection controls before the quantity field in document order", () => {
    // covers AC-1
    seedTradingTerminalContext({ ticker: "AAPL", price: 50 });
    renderTradingTerminalTree();

    const buy = screen.getByRole("radio", { name: /^buy$/i });
    const sell = screen.getByRole("radio", { name: /^sell$/i });
    const qty =
      screen.queryByRole("spinbutton", { name: /quantity|shares|qty/i }) ??
      screen.getByLabelText(/quantity|shares|qty/i);

    expect(buy.compareDocumentPosition(qty) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(sell.compareDocumentPosition(qty) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("displays cash, current price, and holdings for the store-selected symbol context", () => {
    // covers AC-2
    seedTradingTerminalContext({
      ticker: "MSFT",
      cash: 88_888,
      positions: { MSFT: { shares: 12, averageCost: 400 } },
      price: 415.5,
    });
    renderTradingTerminalTree();

    const terminal = screen.getByTestId("trading-terminal");
    expect(within(terminal).getByText(/88888|88,?888/)).toBeTruthy();
    expect(within(terminal).getByText(/415\.50|415\.5/)).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: /^sell$/i }));
    expect(within(terminal).getByText(/\b12\b/)).toBeTruthy();
  });

  it("shows available cash and the symbol's current simulated price on render", () => {
    // covers AC-3
    seedTradingTerminalContext({ ticker: "IBM", cash: 25_000, price: 222 });
    renderTradingTerminalTree();

    const terminal = screen.getByTestId("trading-terminal");
    expect(within(terminal).getByText(/25,?000|25000/)).toBeTruthy();
    expect(within(terminal).getByText(/222/)).toBeTruthy();
  });

  it("shows Max Buy as floor(cash ÷ price) whole shares when Buy mode is active", () => {
    // covers AC-4
    // covers AC-14
    seedTradingTerminalContext({ ticker: "COIN", cash: 1_234.56, price: 100 });
    renderTradingTerminalTree();

    fireEvent.click(screen.getByRole("radio", { name: /^buy$/i }));
    const expectedMax = Math.floor(1_234.56 / 100);
    expect(screen.getByText(new RegExp(`max buy[^\\d]*${expectedMax}`, "i"))).toBeTruthy();
  });

  it("shows the user's whole-share balance for the symbol when Sell mode is active", () => {
    // covers AC-5
    seedTradingTerminalContext({
      ticker: "NVDA",
      positions: { NVDA: { shares: 42 } },
      price: 900,
    });
    renderTradingTerminalTree();

    fireEvent.click(screen.getByRole("radio", { name: /^sell$/i }));
    expect(within(screen.getByTestId("trading-terminal")).getByText(/\b42\b/)).toBeTruthy();
  });

  it("after a valid Buy submit, decreases cash and increases holdings per simulated fill price", async () => {
    // covers AC-6
    seedTradingTerminalContext({ ticker: "GOOG", cash: 10_000, price: 250 });
    renderTradingTerminalTree();

    fireEvent.click(screen.getByRole("radio", { name: /^buy$/i }));
    const qty =
      screen.queryByRole("spinbutton", { name: /quantity|shares|qty/i }) ??
      screen.getByLabelText(/quantity|shares|qty/i);
    fireEvent.change(qty, { target: { value: "4" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /submit|place|trade|buy/i }));
    });

    const st = useMarketStore.getState();
    expect(st.cash).toBe(10_000 - 4 * 250);
    expect(st.positions.GOOG?.shares).toBe(4);
    expect(st.tradeHistory.length).toBeGreaterThanOrEqual(1);
    expect(st.tradeHistory[0]?.pricePerShare).toBe(250);
  });

  it("after a valid Sell submit, increases cash, decreases holdings, and removes zero-share positions", async () => {
    // covers AC-7
    seedTradingTerminalContext({
      ticker: "AMD",
      cash: 5_000,
      positions: { AMD: { shares: 10, averageCost: 120 } },
      price: 130,
    });
    renderTradingTerminalTree();

    fireEvent.click(screen.getByRole("radio", { name: /^sell$/i }));
    const qty =
      screen.queryByRole("spinbutton", { name: /quantity|shares|qty/i }) ??
      screen.getByLabelText(/quantity|shares|qty/i);
    fireEvent.change(qty, { target: { value: "10" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /submit|place|trade|sell/i }));
    });

    const st = useMarketStore.getState();
    expect(st.cash).toBeCloseTo(5_000 + 10 * 130, 5);
    expect(st.positions.AMD).toBeUndefined();
    expect(st.tradeHistory[0]?.side).toBe("sell");
  });

  it("rejects invalid submissions without mutating cash or positions and surfaces feedback", async () => {
    // covers AC-8
    seedTradingTerminalContext({
      ticker: "QQQ",
      cash: 1_000,
      positions: { QQQ: { shares: 5 } },
      price: 400,
    });
    const before = useMarketStore.getState();

    renderTradingTerminalTree();
    fireEvent.click(screen.getByRole("radio", { name: /^buy$/i }));
    const qty =
      screen.queryByRole("spinbutton", { name: /quantity|shares|qty/i }) ??
      screen.getByLabelText(/quantity|shares|qty/i);
    fireEvent.change(qty, { target: { value: "99" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /submit|place|trade/i }));
    });

    const after = useMarketStore.getState();
    expect(after.cash).toBe(before.cash);
    expect(after.positions).toEqual(before.positions);

    const liveRegion =
      screen.queryByRole("status") ??
      screen.queryByRole("alert") ??
      document.querySelector("[aria-live]");
    expect(liveRegion?.textContent?.trim().length).toBeGreaterThan(0);
  });

  it("updates another dashboard consumer from the same store immediately after a successful trade", async () => {
    // covers AC-9
    seedTradingTerminalContext({ ticker: "META", cash: 50_000, price: 300 });
    renderTradingTerminalTree();

    fireEvent.click(screen.getByRole("radio", { name: /^buy$/i }));
    const qty =
      screen.queryByRole("spinbutton", { name: /quantity|shares|qty/i }) ??
      screen.getByLabelText(/quantity|shares|qty/i);
    fireEvent.change(qty, { target: { value: "2" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /submit|place|trade/i }));
    });

    expect(screen.getByTestId("probe-cash").textContent).toBe(`${useMarketStore.getState().cash}`);
    expect(screen.getByTestId("probe-shares").textContent).toBe(
      `${useMarketStore.getState().positions.META?.shares ?? 0}`,
    );
  });

  it("after reload simulation via persistence rehydration, cash and holdings match the last successful trade", async () => {
    // covers AC-10
    seedTradingTerminalContext({ ticker: "AMZN", cash: 20_000, price: 100 });
    renderTradingTerminalTree();

    fireEvent.click(screen.getByRole("radio", { name: /^buy$/i }));
    const qty =
      screen.queryByRole("spinbutton", { name: /quantity|shares|qty/i }) ??
      screen.getByLabelText(/quantity|shares|qty/i);
    fireEvent.change(qty, { target: { value: "3" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /submit|place|trade/i }));
    });

    expect(mem.getItem(MARKET_STORE_STORAGE_KEY)).toBeTruthy();
    const persistedSnapshot = mem.getItem(MARKET_STORE_STORAGE_KEY)!;

    useMarketStore.setState({
      cash: DEFAULT_INITIAL_CASH,
      positions: {},
      tradeHistory: [],
      marketHistory: {},
      selectedTicker: null,
      prices: {},
    });
    mem.setItem(MARKET_STORE_STORAGE_KEY, persistedSnapshot);
    await useMarketStore.persist.rehydrate();

    const st = useMarketStore.getState();
    expect(st.cash).toBe(20_000 - 300);
    expect(st.positions.AMZN?.shares).toBe(3);
  });

  it("does not invoke fetch for pricing or execution during terminal interactions", async () => {
    // covers AC-11
    const fetchSpy =
      typeof globalThis.fetch === "function"
        ? vi.spyOn(globalThis, "fetch")
        : (vi.stubGlobal("fetch", vi.fn()), vi.spyOn(globalThis, "fetch"));

    seedTradingTerminalContext({ ticker: "XOM", cash: 15_000, price: 60 });
    renderTradingTerminalTree();

    fireEvent.click(screen.getByRole("radio", { name: /^buy$/i }));
    const qty =
      screen.queryByRole("spinbutton", { name: /quantity|shares|qty/i }) ??
      screen.getByLabelText(/quantity|shares|qty/i);
    fireEvent.change(qty, { target: { value: "1" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /submit|place|trade/i }));
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("updates displayed price and Max Buy when applyMarketTick changes the store price", async () => {
    // covers AC-12
    seedTradingTerminalContext({ ticker: "TSLA", cash: 10_000, price: 200 });
    renderTradingTerminalTree();

    fireEvent.click(screen.getByRole("radio", { name: /^buy$/i }));
    expect(
      screen.getByText(new RegExp(`max buy[^\\d]*${Math.floor(10_000 / 200)}`, "i")),
    ).toBeTruthy();

    await act(async () => {
      useMarketStore.getState().applyMarketTick({ prices: { TSLA: 250 } });
    });

    expect(screen.getByText(/250/)).toBeTruthy();
    expect(
      screen.getByText(new RegExp(`max buy[^\\d]*${Math.floor(10_000 / 250)}`, "i")),
    ).toBeTruthy();
  });

  it("blocks Sell when holdings are zero and leaves the store unchanged", async () => {
    // covers AC-13
    seedTradingTerminalContext({ ticker: "INTC", cash: 8_000, price: 45 });
    const before = useMarketStore.getState();

    renderTradingTerminalTree();
    fireEvent.click(screen.getByRole("radio", { name: /^sell$/i }));
    const qty =
      screen.queryByRole("spinbutton", { name: /quantity|shares|qty/i }) ??
      screen.getByLabelText(/quantity|shares|qty/i);
    fireEvent.change(qty, { target: { value: "1" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /submit|place|trade/i }));
    });

    expect(useMarketStore.getState().cash).toBe(before.cash);
    expect(useMarketStore.getState().positions).toEqual(before.positions);

    const liveRegion =
      screen.queryByRole("status") ??
      screen.queryByRole("alert") ??
      document.querySelector("[aria-live]");
    expect(liveRegion?.textContent?.trim().length).toBeGreaterThan(0);
  });

  it("executes at the store price active at submit time after a mid-session tick", async () => {
    // covers AC-15
    seedTradingTerminalContext({ ticker: "PLTR", cash: 5_000, price: 100 });
    renderTradingTerminalTree();

    fireEvent.click(screen.getByRole("radio", { name: /^buy$/i }));
    const qty =
      screen.queryByRole("spinbutton", { name: /quantity|shares|qty/i }) ??
      screen.getByLabelText(/quantity|shares|qty/i);
    fireEvent.change(qty, { target: { value: "2" } });

    await act(async () => {
      useMarketStore.getState().applyMarketTick({ prices: { PLTR: 125 } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /submit|place|trade/i }));
    });

    expect(useMarketStore.getState().cash).toBe(5_000 - 2 * 125);
    expect(useMarketStore.getState().tradeHistory[0]?.pricePerShare).toBe(125);
  });

  it("prevents execution without a selected symbol and guides or disables trading controls", () => {
    // covers AC-16
    seedTradingTerminalContext({ ticker: null });
    renderTradingTerminalTree();

    const submit = screen.queryByRole("button", { name: /submit|place|trade/i });
    const submitBlocked =
      !submit ||
      submit.hasAttribute("disabled") ||
      submit.getAttribute("aria-disabled") === "true";
    const guidance = screen.queryByText(/select|pick|choose|symbol|ticker/i);
    expect(submitBlocked || guidance).toBeTruthy();
  });
});
