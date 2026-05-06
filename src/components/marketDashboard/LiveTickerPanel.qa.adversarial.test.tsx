/** @vitest-environment happy-dom */
import { StrictMode } from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_INITIAL_CASH,
  useMarketStore,
} from "../../stores/market/marketStore";
import { LiveTickerPanel } from "./LiveTickerPanel";

/**
 * QA / adversarial coverage — non-happy paths not duplicated in
 * `LiveTickerPanel.acceptance.test.tsx`. Trace tags are QA scenario ids, not AC ids.
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

function renderLiveTicker() {
  return render(
    <StrictMode>
      <LiveTickerPanel />
    </StrictMode>,
  );
}

describe("LiveTickerPanel QA (adversarial / edge)", () => {
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

  it("QA-BAD-PRICE: ignores non-finite coerced ticks and still lists finite symbols", () => {
    // covers QA-malformed-tick-payload
    useMarketStore.getState().applyMarketTick({
      prices: {
        OK: 10,
        NAN: Number.NaN,
        INF: Number.POSITIVE_INFINITY,
        NEG_INF: Number.NEGATIVE_INFINITY,
      },
    });

    renderLiveTicker();

    const list = screen.getByRole("list", { name: /live ticker|ticker/i });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]!.textContent).toMatch(/OK/);
    expect(items[0]!.textContent).toMatch(/10\.00/);
  });

  it("QA-REAPPEAR: after a symbol leaves prices entirely, a later tick treats it as a fresh row (no flash)", async () => {
    // covers QA-symbol-removal-readd-boundary
    useMarketStore.getState().applyMarketTick({ prices: { META: 300 } });
    useMarketStore.getState().applyMarketTick({ prices: { META: 310 } });
    useMarketStore.setState({ prices: {} });

    renderLiveTicker();
    expect(screen.getByTestId("live-ticker-empty")).toBeTruthy();

    await act(async () => {
      useMarketStore.getState().applyMarketTick({ prices: { META: 310 } });
    });

    const list = screen.getByRole("list", { name: /live ticker|ticker/i });
    const row = within(list).getByRole("listitem");
    expect(row.getAttribute("data-live-flash")).toBeNull();
  });

  it("QA-RAPID-FLIP: opposing tick before flash TTL ends leaves the row on the latest direction", async () => {
    // covers QA-mid-flash-direction-change
    useMarketStore.getState().applyMarketTick({ prices: { U: 100 } });
    renderLiveTicker();

    await act(async () => {
      useMarketStore.getState().applyMarketTick({ prices: { U: 110 } });
    });

    let list = screen.getByRole("list", { name: /live ticker|ticker/i });
    let row = within(list).getByRole("listitem");
    expect(row.getAttribute("data-live-flash")).toBe("up");

    await act(async () => {
      vi.advanceTimersByTime(200);
      useMarketStore.getState().applyMarketTick({ prices: { U: 105 } });
    });

    list = screen.getByRole("list", { name: /live ticker|ticker/i });
    row = within(list).getByRole("listitem");
    expect(row.getAttribute("data-live-flash")).toBe("down");
    expect(row.textContent).toMatch(/105\.00/);
  });

  it("QA-BULK: many concurrent symbols render without error", () => {
    // covers QA-large-symbol-set-stress
    const bulk: Record<string, number> = {};
    for (let i = 0; i < 180; i += 1) {
      bulk[`T${i.toString().padStart(3, "0")}`] = 50 + i * 0.01;
    }
    useMarketStore.getState().applyMarketTick({ prices: bulk });

    renderLiveTicker();

    const list = screen.getByRole("list", { name: /live ticker|ticker/i });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(180);
  });

  it("QA-FUZZ: sequence of random valid ticks keeps list aligned with store", () => {
    // covers QA-prices-fuzz-sequence
    let last: Record<string, number> = { QAFUZZ: 100 };
    useMarketStore.getState().applyMarketTick({ prices: last });
    renderLiveTicker();

    for (let n = 0; n < 40; n += 1) {
      const jitter = (Math.sin(n) * 9973) % 1;
      last = {
        QAFUZZ: Math.round((100 + n + jitter) * 100) / 100,
        AUX: Math.round(jitter * 1000) / 100,
      };
      act(() => {
        useMarketStore.getState().applyMarketTick({ prices: last });
      });
    }

    const list = screen.getByRole("list", { name: /live ticker|ticker/i });
    const rows = within(list).getAllByRole("listitem");
    for (const row of rows) {
      const testId = row.getAttribute("data-testid");
      expect(testId, "row exposes data-testid").toMatch(/^live-ticker-row-/);
      const sym = testId!.slice("live-ticker-row-".length);
      const m = (row.textContent ?? "").match(/(\d+\.\d{2})/);
      expect(m, "price formatted").toBeTruthy();
      const fromStore = useMarketStore.getState().prices[sym];
      expect(fromStore).toBeCloseTo(Number(m![1]), 5);
    }
  });

  it("QA-UNMOUNT: flash timeouts do not fire after unmount (no console error)", async () => {
    // covers QA-timer-leak-on-unmount
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    useMarketStore.getState().applyMarketTick({ prices: { ZZ: 1 } });
    const { unmount } = renderLiveTicker();

    await act(async () => {
      useMarketStore.getState().applyMarketTick({ prices: { ZZ: 2 } });
    });

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });

  it("QA-DUP-PANEL: two mounted panels stay consistent with the same store snapshot", () => {
    // covers QA-multi-subscriber-consistency
    useMarketStore.getState().applyMarketTick({ prices: { AAA: 1, ZZZ: 9.99 } });

    render(
      <StrictMode>
        <div>
          <LiveTickerPanel />
          <LiveTickerPanel />
        </div>
      </StrictMode>,
    );

    const lists = screen.getAllByRole("list", { name: /live ticker|ticker/i });
    expect(lists).toHaveLength(2);

    for (const list of lists) {
      const items = within(list).getAllByRole("listitem");
      expect(items).toHaveLength(2);
      expect(items[0]!.textContent).toMatch(/AAA/);
      expect(items[1]!.textContent).toMatch(/ZZZ/);
    }
  });

  it("QA-DIRECT-STATE: non-finite values injected via setState are not listed", () => {
    // covers QA-bypass-applyMarketTick / hostile persisted merge simulation
    useMarketStore.setState({
      prices: {
        CLEAN: 42,
        BAD: Number.NaN,
      } as Record<string, number>,
    });

    renderLiveTicker();

    const list = screen.getByRole("list", { name: /live ticker|ticker/i });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]!.textContent).toMatch(/CLEAN/);
  });
});
