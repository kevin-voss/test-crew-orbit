/** @vitest-environment happy-dom */
import { StrictMode } from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_INITIAL_CASH,
  MARKET_STORE_STORAGE_KEY,
  useMarketStore,
} from "../../stores/market/marketStore";

/**
 * Component under test — implemented per live ticker panel acceptance criteria.
 */
import { LiveTickerPanel } from "./LiveTickerPanel";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIVE_TICKER_SOURCE = join(__dirname, "LiveTickerPanel.tsx");

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

function renderLiveTicker() {
  return render(
    <StrictMode>
      <LiveTickerPanel />
    </StrictMode>,
  );
}

describe("Live Ticker Panel acceptance", () => {
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

  it("when tracked stocks exist in the store, renders them as one vertical list (one row per symbol)", () => {
    // covers AC-1
    useMarketStore.getState().applyMarketTick({
      prices: { TSLA: 240, AAPL: 180 },
    });

    renderLiveTicker();

    const list = screen.getByRole("list", { name: /live ticker|ticker/i });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    const texts = items.map((li) => li.textContent ?? "");
    expect(texts.some((t) => t.includes("AAPL"))).toBe(true);
    expect(texts.some((t) => t.includes("TSLA"))).toBe(true);
    expect(texts.some((t) => t.includes("180"))).toBe(true);
    expect(texts.some((t) => t.includes("240"))).toBe(true);

    const rects = items.map((el) => el.getBoundingClientRect());
    expect(rects[1]!.top).toBeGreaterThanOrEqual(rects[0]!.top);
    expect(rects[1]!.top).toBeGreaterThanOrEqual(rects[0]!.bottom - 1);
  });

  it("in each row, shows the stock symbol and current price read from the market store", () => {
    // covers AC-2
    useMarketStore.getState().applyMarketTick({ prices: { MSFT: 415.5 } });
    renderLiveTicker();
    const list = screen.getByRole("list", { name: /live ticker|ticker/i });
    const row = within(list).getByRole("listitem");
    expect(row.textContent).toMatch(/MSFT/);
    expect(row.textContent).toMatch(/415\.50|415\.5/);
    expect(useMarketStore.getState().prices.MSFT).toBe(415.5);
  });

  it("when a row's price increases vs the prior store value, briefly flashes green on that row", async () => {
    // covers AC-3
    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });
    renderLiveTicker();
    await act(async () => {
      useMarketStore.getState().applyMarketTick({ prices: { AAPL: 102 } });
    });

    const list = screen.getByRole("list", { name: /live ticker|ticker/i });
    const row = within(list).getByRole("listitem");
    expect(row.getAttribute("data-live-flash")).toBe("up");
    expect(row.className.toLowerCase()).toMatch(/up|gain|green|emerald|success|positive/);
  });

  it("when a row's price decreases vs the prior store value, briefly flashes red on that row", async () => {
    // covers AC-4
    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });
    renderLiveTicker();
    await act(async () => {
      useMarketStore.getState().applyMarketTick({ prices: { AAPL: 98.5 } });
    });

    const list = screen.getByRole("list", { name: /live ticker|ticker/i });
    const row = within(list).getByRole("listitem");
    expect(row.getAttribute("data-live-flash")).toBe("down");
    expect(row.className.toLowerCase()).toMatch(/down|loss|red|rose|danger|negative/);
  });

  it("after rehydration, displayed prices match the persisted market store snapshot", async () => {
    // covers AC-5
    useMarketStore.getState().applyMarketTick({ prices: { AMZN: 188.25 } });
    expect(mem.getItem(MARKET_STORE_STORAGE_KEY)).toBeTruthy();

    // `setState` writes through persist and would clobber storage; keep the prior snapshot so
    // `rehydrate` simulates a JS reload reading the last persisted session.
    const persistedSnapshot = mem.getItem(MARKET_STORE_STORAGE_KEY);
    useMarketStore.setState({
      cash: DEFAULT_INITIAL_CASH,
      positions: {},
      tradeHistory: [],
      marketHistory: {},
      selectedTicker: null,
      prices: {},
    });
    mem.setItem(MARKET_STORE_STORAGE_KEY, persistedSnapshot!);
    await useMarketStore.persist.rehydrate();

    expect(useMarketStore.getState().prices.AMZN).toBe(188.25);

    renderLiveTicker();

    const list = screen.getByRole("list", { name: /live ticker|ticker/i });
    const row = within(list).getByRole("listitem");
    expect(row.textContent).toMatch(/AMZN/);
    expect(row.textContent).toMatch(/188\.25/);
    expect(useMarketStore.getState().prices.AMZN).toBe(188.25);
  });

  it("when applyMarketTick updates prices, the list reflects new values without any manual refresh gesture", async () => {
    // covers AC-6
    useMarketStore.getState().applyMarketTick({ prices: { NVDA: 900 } });
    renderLiveTicker();

    await act(async () => {
      useMarketStore.getState().applyMarketTick({ prices: { NVDA: 905 } });
    });

    const list = screen.getByRole("list", { name: /live ticker|ticker/i });
    const row = within(list).getByRole("listitem");
    expect(row.textContent).toMatch(/905/);
  });

  it("does not embed tick scheduling or market simulation logic in the panel source", () => {
    // covers AC-7
    expect(existsSync(LIVE_TICKER_SOURCE), "LiveTickerPanel.tsx must exist for AC-7 audit").toBe(true);
    const src = readFileSync(LIVE_TICKER_SOURCE, "utf8");
    for (const forbidden of [
      "setInterval",
      "clearInterval",
      "stepMarketEngine",
      "runMarketTick",
      "createMarketTickController",
      "useMarketTickController",
      "Math.random",
    ]) {
      expect(src.includes(forbidden), `unexpected market/tick control token: ${forbidden}`).toBe(false);
    }
  });

  it("exposes an accessible name for the list and keeps symbol/price text readable under the default theme", () => {
    // covers AC-8
    useMarketStore.getState().applyMarketTick({ prices: { IBM: 222 } });
    renderLiveTicker();
    const list = screen.getByRole("list", { name: /live ticker|ticker/i });
    expect(list.getClientRects().length).toBeGreaterThan(0);

    const row = within(list).getByRole("listitem");
    const sym = within(row).getByText("IBM");
    const price = within(row).getByText(/222/);
    expect(window.getComputedStyle(sym).color).not.toBe("rgba(0, 0, 0, 0)");
    expect(window.getComputedStyle(price).color).not.toBe("rgba(0, 0, 0, 0)");
  });

  it("clears transient flash styling without requiring user dismissal and without blocking the wider dashboard shell", async () => {
    // covers AC-9
    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 50 } });
    render(
      <StrictMode>
        <div data-testid="dashboard-shell">
          <button type="button">Outside control</button>
          <LiveTickerPanel />
        </div>
      </StrictMode>,
    );

    await act(async () => {
      useMarketStore.getState().applyMarketTick({ prices: { AAPL: 55 } });
    });

    const list = screen.getByRole("list", { name: /live ticker|ticker/i });
    const row = within(list).getByRole("listitem");
    expect(row.getAttribute("data-live-flash")).toBe("up");

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(row.getAttribute("data-live-flash")).toBeNull();
    const shell = screen.getByTestId("dashboard-shell");
    expect(window.getComputedStyle(shell).pointerEvents).not.toBe("none");
  });

  it("does not flash up or down on the first price observation for a symbol", async () => {
    // covers AC-10
    renderLiveTicker();
    await act(async () => {
      useMarketStore.getState().applyMarketTick({ prices: { COIN: 123.45 } });
    });
    const list = screen.getByRole("list", { name: /live ticker|ticker/i });
    const row = within(list).getByRole("listitem");
    expect(row.getAttribute("data-live-flash")).toBeNull();
  });

  it("does not flash when the store-applied price is unchanged for a symbol", async () => {
    // covers AC-11
    useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });
    renderLiveTicker();
    await act(async () => {
      useMarketStore.getState().applyMarketTick({ prices: { AAPL: 100 } });
    });
    const list = screen.getByRole("list", { name: /live ticker|ticker/i });
    const row = within(list).getByRole("listitem");
    expect(row.getAttribute("data-live-flash")).toBeNull();
  });

  it("applies independent flash direction per symbol when multiple rows tick together", async () => {
    // covers AC-12
    useMarketStore.getState().applyMarketTick({
      prices: { AAA: 10, ZZZ: 20 },
    });
    renderLiveTicker();

    await act(async () => {
      useMarketStore.getState().applyMarketTick({
        prices: { AAA: 11, ZZZ: 19 },
      });
    });

    const list = screen.getByRole("list", { name: /live ticker|ticker/i });
    const rows = within(list).getAllByRole("listitem");
    expect(rows[0]?.textContent).toMatch(/AAA/);
    expect(rows[1]?.textContent).toMatch(/ZZZ/);
    expect(rows[0]?.getAttribute("data-live-flash")).toBe("up");
    expect(rows[1]?.getAttribute("data-live-flash")).toBe("down");
  });

  it("after rapid successive store snapshots for one symbol, the row reflects the latest observed price", async () => {
    // covers AC-13
    useMarketStore.getState().applyMarketTick({ prices: { QQQ: 400 } });
    renderLiveTicker();

    await act(async () => {
      useMarketStore.getState().applyMarketTick({ prices: { QQQ: 401 } });
      useMarketStore.getState().applyMarketTick({ prices: { QQQ: 399 } });
    });

    const list = screen.getByRole("list", { name: /live ticker|ticker/i });
    const row = within(list).getByRole("listitem");
    expect(row.textContent).toMatch(/399/);
  });
});
