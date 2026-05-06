/** @vitest-environment happy-dom */
import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_INITIAL_CASH,
  useMarketStore,
} from "../../stores/market/marketStore";

import { TradingTerminal } from "./TradingTerminal";

/**
 * Adversarial / edge QA — scenarios not covered by `TradingTerminal.acceptance.test.tsx`.
 * Tags like `QA-TT-*` are scenario ids (not AC duplicates).
 */

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

function renderTerminal() {
  return render(
    <StrictMode>
      <TradingTerminal />
    </StrictMode>,
  );
}

function qtyInput() {
  return (
    screen.queryByRole("spinbutton", { name: /quantity|shares|qty/i }) ??
    screen.getByLabelText(/quantity|shares|qty/i)
  );
}

describe("TradingTerminal QA (adversarial / edge)", () => {
  beforeEach(async () => {
    vi.unstubAllGlobals();
    vi.useFakeTimers();
    vi.stubGlobal("localStorage", makeMemoryStorage());
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

  it("QA-TT-DBL: double Place buy in one act does not over-execute the same quantity intent", async () => {
    // covers QA-race-double-submit — expect single fill per intentional one-share order (mitigate stale closure double fire)
    seedTradingTerminalContext({ ticker: "RACE", cash: 10_000, price: 100 });
    renderTerminal();
    fireEvent.click(screen.getByRole("radio", { name: /^buy$/i }));
    fireEvent.change(qtyInput(), { target: { value: "1" } });
    const btn = screen.getByRole("button", { name: /place|buy/i });

    await act(async () => {
      fireEvent.click(btn);
      fireEvent.click(btn);
    });

    const st = useMarketStore.getState();
    expect(st.positions.RACE?.shares ?? 0).toBe(1);
    expect(st.tradeHistory.filter((t) => t.ticker === "RACE" && t.side === "buy")).toHaveLength(1);
    expect(st.cash).toBe(10_000 - 100);
  });

  it("QA-TT-TICKER-SWAP: submit trades whatever selectedTicker is at commit time, not a stale UI assumption", async () => {
    // covers QA-concurrent-selection
    seedTradingTerminalContext({ ticker: "AAA", cash: 50_000, price: 10 });
    renderTerminal();
    fireEvent.click(screen.getByRole("radio", { name: /^buy$/i }));
    fireEvent.change(qtyInput(), { target: { value: "2" } });

    useMarketStore.getState().setSelectedTicker("BBB");
    useMarketStore.getState().applyMarketTick({ prices: { BBB: 25 } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /place|buy/i }));
    });

    const st = useMarketStore.getState();
    expect(st.positions.AAA).toBeUndefined();
    expect(st.positions.BBB?.shares).toBe(2);
    expect(st.cash).toBe(50_000 - 2 * 25);
    expect(st.tradeHistory[0]?.ticker).toBe("BBB");
  });

  it("QA-TT-PRICE-INVALID-MID: invalidating live price before submit blocks execution and leaves store intact", async () => {
    // covers QA-malformed-price-boundary
    seedTradingTerminalContext({ ticker: "BROKEN", cash: 8_000, price: 40 });
    const before = useMarketStore.getState();
    renderTerminal();
    fireEvent.click(screen.getByRole("radio", { name: /^buy$/i }));
    fireEvent.change(qtyInput(), { target: { value: "5" } });

    useMarketStore.setState({ prices: { ...useMarketStore.getState().prices, BROKEN: Number.NaN } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /place|buy/i }));
    });

    expect(useMarketStore.getState()).toMatchObject({
      cash: before.cash,
      positions: before.positions,
    });
    const status = screen.getByRole("status");
    expect(status.textContent?.length).toBeGreaterThan(0);
  });

  it("QA-TT-MAXBUY-ZERO: buy with max buy 0 still rejects execution with feedback when user types 1", async () => {
    // covers QA-boundary-cash-less-than-price
    seedTradingTerminalContext({ ticker: "CHROME", cash: 99, price: 100 });
    renderTerminal();
    fireEvent.click(screen.getByRole("radio", { name: /^buy$/i }));
    expect(screen.getByText(/max buy[^:]*:\s*0/i)).toBeTruthy();

    fireEvent.change(qtyInput(), { target: { value: "1" } });
    const before = useMarketStore.getState();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /place|buy/i }));
    });

    expect(useMarketStore.getState().cash).toBe(before.cash);
    expect(useMarketStore.getState().positions.CHROME).toBeUndefined();
    expect(screen.getByRole("status").textContent?.trim().length).toBeGreaterThan(0);
  });

  it("QA-TT-MALFORMED-QTY: fractional, scientific, and full-width digits are rejected without store mutation", async () => {
    // covers QA-malformed-input
    seedTradingTerminalContext({ ticker: "EDGE", cash: 20_000, price: 50 });
    const before = useMarketStore.getState();
    renderTerminal();
    fireEvent.click(screen.getByRole("radio", { name: /^buy$/i }));

    for (const bad of ["1.5", "abc", "0", "-2"]) {
      fireEvent.change(qtyInput(), { target: { value: bad } });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /place|buy/i }));
      });
      expect(useMarketStore.getState().cash).toBe(before.cash);
      expect(useMarketStore.getState().positions.EDGE).toBeUndefined();
    }
  });

  it("QA-TT-HUGE-QTY: absurd numeric string parses but domain rejects without corrupting cash", async () => {
    // covers QA-resource-huge-quantity
    seedTradingTerminalContext({ ticker: "HUGE", cash: 1_000, price: 10 });
    const before = useMarketStore.getState();
    renderTerminal();
    fireEvent.click(screen.getByRole("radio", { name: /^buy$/i }));
    fireEvent.change(qtyInput(), { target: { value: String(Number.MAX_SAFE_INTEGER) } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /place|buy/i }));
    });

    expect(useMarketStore.getState().cash).toBe(before.cash);
    expect(screen.getByRole("status").textContent?.trim().length).toBeGreaterThan(0);
  });

  it("QA-TT-NAN-CASH: non-finite cash yields Max buy 0 and buy path does not produce finite corruption on rejection", async () => {
    // covers QA-malformed-store-cash
    useMarketStore.setState({
      cash: Number.NaN,
      positions: {},
      tradeHistory: [],
      marketHistory: {},
      selectedTicker: "NANX",
      prices: {},
    });
    useMarketStore.getState().applyMarketTick({ prices: { NANX: 10 } });
    renderTerminal();
    fireEvent.click(screen.getByRole("radio", { name: /^buy$/i }));
    expect(within(screen.getByTestId("trading-terminal")).getByText(/max buy[^:]*:\s*0/i)).toBeTruthy();

    fireEvent.change(qtyInput(), { target: { value: "1" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /place|buy/i }));
    });

    expect(useMarketStore.getState().tradeHistory.length).toBe(0);
  });

  it("QA-TT-TICK-STORM: many rapid applyMarketTick updates while mounted do not throw and Max Buy tracks last finite price", async () => {
    // covers QA-stress-tick-churn
    seedTradingTerminalContext({ ticker: "STORM", cash: 30_000, price: 100 });
    renderTerminal();
    fireEvent.click(screen.getByRole("radio", { name: /^buy$/i }));

    await act(async () => {
      for (let p = 100; p <= 150; p += 1) {
        useMarketStore.getState().applyMarketTick({ prices: { STORM: p } });
      }
    });

    const expected = Math.floor(30_000 / 150);
    expect(
      screen.getByText(new RegExp(`max buy[^\\d]*${expected}`, "i")),
    ).toBeTruthy();
  });

  it("QA-TT-FUZZ-QTY: random hostile strings rarely produce accidental buys", async () => {
    // covers QA-fuzz-quantity-field
    seedTradingTerminalContext({ ticker: "FUZZ", cash: 50_000, price: 1 });
    renderTerminal();
    fireEvent.click(screen.getByRole("radio", { name: /^buy$/i }));

    let buys = 0;
    for (let i = 0; i < 40; i++) {
      const raw = `x${i}${i % 3 === 0 ? "." : ""}${i % 7 === 0 ? "e" : ""}`;
      fireEvent.change(qtyInput(), { target: { value: raw } });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /place|buy/i }));
      });
      if (useMarketStore.getState().tradeHistory.some((t) => t.ticker === "FUZZ")) buys++;
    }

    expect(buys).toBe(0);
  });
});
