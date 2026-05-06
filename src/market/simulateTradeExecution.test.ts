import { describe, expect, it } from "vitest";

import type { Holding } from "../stores/market/types";
import {
  maxWholeSharesAffordable,
  simulateTradeExecution,
  validateShareQuantity,
} from "./simulateTradeExecution";

describe("maxWholeSharesAffordable", () => {
  it.each([
    { cash: 100, price: 25, expected: 4 },
    { cash: 99, price: 25, expected: 3 },
    { cash: 100, price: 33.33, expected: 3 },
    { cash: 0, price: 10, expected: 0 },
    { cash: 100, price: 0, expected: 0 },
    { cash: 100, price: -1, expected: 0 },
    { cash: Number.NaN, price: 10, expected: 0 },
    { cash: 10, price: Number.NaN, expected: 0 },
    { cash: Number.POSITIVE_INFINITY, price: 10, expected: 0 },
  ])("floor(cash ÷ price) when valid; 0 otherwise (%j)", ({ cash, price, expected }) => {
    expect(maxWholeSharesAffordable(cash, price)).toBe(expected);
  });
});

describe("validateShareQuantity", () => {
  it.each([
    [1, true],
    [100, true],
    [0, false],
    [-1, false],
    [1.5, false],
    [Number.NaN, false],
    [Number.POSITIVE_INFINITY, false],
    ["1", false],
    [null, false],
  ] as const)("quantity %s → %s", (q, ok) => {
    expect(validateShareQuantity(q)).toBe(ok);
  });
});

describe("simulateTradeExecution", () => {
  const positionsAAPL: Record<string, Holding> = {
    AAPL: { shares: 10, averageCost: 50 },
  };

  describe("buy", () => {
    it("settles a fresh buy with averageCost = fill price", () => {
      const out = simulateTradeExecution({
        cash: 1000,
        positions: {},
        ticker: "MSFT",
        side: "buy",
        quantity: 5,
        pricePerShare: 100,
      });
      expect(out.ok).toBe(true);
      if (!out.ok) return;
      expect(out.result.nextCash).toBe(500);
      expect(out.result.positions.MSFT).toEqual({ shares: 5, averageCost: 100 });
      expect(out.result.trade).toMatchObject({
        ticker: "MSFT",
        side: "buy",
        shares: 5,
        pricePerShare: 100,
      });
      expect(out.result.trade.id).toMatch(/./);
      expect(typeof out.result.trade.timestamp).toBe("number");
    });

    it("weighted average cost when adding to a position", () => {
      const out = simulateTradeExecution({
        cash:10_000,
        positions: { MSFT: { shares: 10, averageCost: 100 } },
        ticker: "MSFT",
        side: "buy",
        quantity: 10,
        pricePerShare: 150,
      });
      expect(out.ok).toBe(true);
      if (!out.ok) return;
      // (10*100 + 10*150) / 20 = 125
      expect(out.result.positions.MSFT?.averageCost).toBe(125);
      expect(out.result.positions.MSFT?.shares).toBe(20);
      expect(out.result.nextCash).toBe(10_000 - 1500);
    });

    it.each([
      {
        name: "over max whole shares",
        cash: 100,
        qty: 5,
        price: 25,
        code: "INSUFFICIENT_CASH",
      },
      {
        name: "invalid quantity",
        cash: 1000,
        qty: 0,
        price: 10,
        code: "INVALID_QUANTITY",
      },
      {
        name: "invalid price",
        cash: 1000,
        qty: 1,
        price: 0,
        code: "INVALID_PRICE",
      },
    ])("rejects buy: $name", ({ cash, qty, price, code }) => {
      const out = simulateTradeExecution({
        cash,
        positions: {},
        ticker: "X",
        side: "buy",
        quantity: qty,
        pricePerShare: price,
      });
      expect(out.ok).toBe(false);
      if (out.ok) return;
      expect(out.error.code).toBe(code);
    });
  });

  describe("sell", () => {
    it("partial sell keeps averageCost on remainder", () => {
      const out = simulateTradeExecution({
        cash: 0,
        positions: positionsAAPL,
        ticker: "AAPL",
        side: "sell",
        quantity: 4,
        pricePerShare: 60,
      });
      expect(out.ok).toBe(true);
      if (!out.ok) return;
      expect(out.result.nextCash).toBe(240);
      expect(out.result.positions.AAPL).toEqual({ shares: 6, averageCost: 50 });
    });

    it("full sell strips ticker from positions", () => {
      const out = simulateTradeExecution({
        cash: 0,
        positions: positionsAAPL,
        ticker: "AAPL",
        side: "sell",
        quantity: 10,
        pricePerShare: 55,
      });
      expect(out.ok).toBe(true);
      if (!out.ok) return;
      expect(out.result.nextCash).toBe(550);
      expect(out.result.positions.AAPL).toBeUndefined();
    });

    it.each([
      {
        name: "no position",
        positions: {} as Record<string, Holding>,
        quantity: 1,
        code: "NO_POSITION",
      },
      {
        name: "zero shares recorded",
        positions: { AAPL: { shares: 0 } },
        quantity: 1,
        code: "NO_POSITION",
      },
      {
        name: "oversize",
        positions: positionsAAPL,
        quantity: 11,
        code: "INSUFFICIENT_SHARES",
      },
    ] as const)("rejects sell: $name", ({ positions, quantity, code }) => {
      const out = simulateTradeExecution({
        cash: 100,
        positions,
        ticker: "AAPL",
        side: "sell",
        quantity,
        pricePerShare: 10,
      });
      expect(out.ok).toBe(false);
      if (out.ok) return;
      expect(out.error.code).toBe(code);
    });
  });

  it("rejects empty ticker", () => {
    const out = simulateTradeExecution({
      cash: 100,
      positions: {},
      ticker: "",
      side: "buy",
      quantity: 1,
      pricePerShare: 10,
    });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error.code).toBe("INVALID_TICKER");
  });
});
