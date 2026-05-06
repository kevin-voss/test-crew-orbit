import { describe, expect, it } from "vitest";

import { maxBuyShares, simulateSpotTrade } from "./simulateSpotTrade";

const id = () => "trade-id-fixed";
const ts = () => 9_000;

describe("maxBuyShares", () => {
  it("returns floor(cash / price) for finite cash and price both > 0", () => {
    expect(maxBuyShares(1_234.56, 100)).toBe(Math.floor(1_234.56 / 100));
    expect(maxBuyShares(99.99, 10)).toBe(9);
  });

  it("returns 0 when cash or price is non-finite, non-positive, or cash is 0", () => {
    expect(maxBuyShares(Number.NaN, 10)).toBe(0);
    expect(maxBuyShares(100, Number.POSITIVE_INFINITY)).toBe(0);
    expect(maxBuyShares(100, 0)).toBe(0);
    expect(maxBuyShares(100, -1)).toBe(0);
    expect(maxBuyShares(0, 50)).toBe(0);
    expect(maxBuyShares(-10, 5)).toBe(0);
  });
});

describe("simulateSpotTrade", () => {
  it("uses caller spot price for trade record and cash math on buy (AC-6, AC-7)", () => {
    const snapshot = { cash: 10_000, positions: {} as Record<string, { shares: number; averageCost?: number }> };
    const r = simulateSpotTrade({
      side: "buy",
      ticker: "GOOG",
      qty: 4,
      spotPricePerShare: 250,
      snapshot,
      generateId: id,
      now: ts,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextCash).toBe(10_000 - 4 * 250);
    expect(r.positions.GOOG).toEqual({ shares: 4, averageCost: 250 });
    expect(r.trade).toEqual({
      id: "trade-id-fixed",
      ticker: "GOOG",
      side: "buy",
      shares: 4,
      pricePerShare: 250,
      timestamp: 9_000,
    });
  });

  it("increases cash and removes zero-share holdings on full sell (AC-8)", () => {
    const snapshot = {
      cash: 5_000,
      positions: { AMD: { shares: 10, averageCost: 120 } },
    };
    const r = simulateSpotTrade({
      side: "sell",
      ticker: "AMD",
      qty: 10,
      spotPricePerShare: 130,
      snapshot,
      generateId: id,
      now: ts,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextCash).toBe(5_000 + 10 * 130);
    expect(r.positions.AMD).toBeUndefined();
    expect(r.trade.side).toBe("sell");
  });

  it("preserves averageCost on partial sell when present", () => {
    const snapshot = {
      cash: 0,
      positions: { AMD: { shares: 10, averageCost: 120 } },
    };
    const r = simulateSpotTrade({
      side: "sell",
      ticker: "AMD",
      qty: 3,
      spotPricePerShare: 130,
      snapshot,
      generateId: id,
      now: ts,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.positions.AMD).toEqual({ shares: 7, averageCost: 120 });
  });

  it("rejects invalid qty without ok result (AC-10)", () => {
    const snapshot = { cash: 1_000, positions: {} };
    expect(
      simulateSpotTrade({
        side: "buy",
        ticker: "X",
        qty: 1.5,
        spotPricePerShare: 10,
        snapshot,
      }).ok,
    ).toBe(false);
    expect(
      simulateSpotTrade({
        side: "buy",
        ticker: "X",
        qty: 0,
        spotPricePerShare: 10,
        snapshot,
      }),
    ).toEqual({ ok: false, code: "INVALID_QTY" });
  });

  it("rejects non-finite or non-positive spot price (AC-16)", () => {
    const snapshot = { cash: 100, positions: {} };
    expect(simulateSpotTrade({ side: "buy", ticker: "X", qty: 1, spotPricePerShare: Number.NaN, snapshot })).toEqual({
      ok: false,
      code: "INVALID_PRICE",
    });
    expect(
      simulateSpotTrade({ side: "buy", ticker: "X", qty: 1, spotPricePerShare: 0, snapshot }),
    ).toEqual({
      ok: false,
      code: "INVALID_PRICE",
    });
  });

  it("rejects insufficient cash on buy", () => {
    const before = { cash: 1_000, positions: {} as Record<string, { shares: number }> };
    const copy = JSON.parse(JSON.stringify(before)) as typeof before;
    const r = simulateSpotTrade({
      side: "buy",
      ticker: "QQQ",
      qty: 99,
      spotPricePerShare: 400,
      snapshot: before,
    });
    expect(r).toEqual({ ok: false, code: "INSUFFICIENT_CASH" });
    expect(before).toEqual(copy);
  });

  it("rejects insufficient shares on sell", () => {
    const r = simulateSpotTrade({
      side: "sell",
      ticker: "QQQ",
      qty: 10,
      spotPricePerShare: 10,
      snapshot: { cash: 0, positions: { QQQ: { shares: 5 } } },
    });
    expect(r).toEqual({ ok: false, code: "INSUFFICIENT_SHARES" });
  });

  it("computes VWAP averageCost when adding to an existing lot", () => {
    const snapshot = { cash: 50_000, positions: { X: { shares: 10, averageCost: 100 } } };
    const r = simulateSpotTrade({
      side: "buy",
      ticker: "X",
      qty: 10,
      spotPricePerShare: 120,
      snapshot,
      generateId: id,
      now: ts,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.positions.X?.shares).toBe(20);
    expect(r.positions.X?.averageCost).toBeCloseTo(110, 5);
  });
});
