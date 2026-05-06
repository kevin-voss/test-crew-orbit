import type { Holding, TradeExecutionResult, TradeRecord } from "../stores/market/types";

export type SpotTradeSnapshot = {
  cash: number;
  positions: Record<string, Holding>;
};

export type SimulateSpotTradeInput = {
  side: "buy" | "sell";
  ticker: string;
  qty: number;
  spotPricePerShare: number;
  snapshot: SpotTradeSnapshot;
  /** Injectable for tests; defaults to UUID when `crypto.randomUUID` exists. */
  generateId?: () => string;
  /** Injectable clock; defaults to `Date.now`. */
  now?: () => number;
};

export type SpotTradeErrorCode =
  | "INVALID_QTY"
  | "INVALID_PRICE"
  | "INSUFFICIENT_CASH"
  | "INSUFFICIENT_SHARES";

export type SpotTradeFailure = {
  ok: false;
  code: SpotTradeErrorCode;
  message?: string;
};

export type SpotTradeSuccess = { ok: true } & TradeExecutionResult;

export type SpotTradeResult = SpotTradeSuccess | SpotTradeFailure;

function defaultGenerateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Whole shares affordable at a finite positive price; otherwise 0 (no throw).
 */
export function maxBuyShares(cash: number, price: number): number {
  if (!Number.isFinite(cash) || !Number.isFinite(price) || cash <= 0 || price <= 0) {
    return 0;
  }
  return Math.floor(cash / price);
}

export function simulateSpotTrade(input: SimulateSpotTradeInput): SpotTradeResult {
  const { side, ticker, qty, spotPricePerShare, snapshot } = input;
  const generateId = input.generateId ?? defaultGenerateId;
  const now = input.now ?? (() => Date.now());

  if (!Number.isInteger(qty) || qty <= 0) {
    return { ok: false, code: "INVALID_QTY" };
  }

  if (!Number.isFinite(spotPricePerShare) || spotPricePerShare <= 0) {
    return { ok: false, code: "INVALID_PRICE" };
  }

  const { cash, positions } = snapshot;
  const proceeds = qty * spotPricePerShare;

  if (side === "buy") {
    if (proceeds > cash) {
      return { ok: false, code: "INSUFFICIENT_CASH" };
    }

    const prev = positions[ticker];
    const prevShares = prev?.shares ?? 0;
    const prevAvg = prev?.averageCost;
    const newShares = prevShares + qty;
    const averageCost =
      prevShares <= 0 || prevAvg === undefined
        ? spotPricePerShare
        : (prevShares * prevAvg + qty * spotPricePerShare) / newShares;

    const trade: TradeRecord = {
      id: generateId(),
      ticker,
      side: "buy",
      shares: qty,
      pricePerShare: spotPricePerShare,
      timestamp: now(),
    };

    return {
      ok: true,
      trade,
      nextCash: cash - proceeds,
      positions: { ...positions, [ticker]: { shares: newShares, averageCost } },
    };
  }

  const prev = positions[ticker];
  const held = prev?.shares ?? 0;
  if (qty > held) {
    return { ok: false, code: "INSUFFICIENT_SHARES" };
  }

  const newShares = held - qty;
  const nextPositions: Record<string, Holding> = { ...positions };
  if (newShares <= 0) {
    delete nextPositions[ticker];
  } else {
    nextPositions[ticker] = { shares: newShares, averageCost: prev?.averageCost };
  }

  const trade: TradeRecord = {
    id: generateId(),
    ticker,
    side: "sell",
    shares: qty,
    pricePerShare: spotPricePerShare,
    timestamp: now(),
  };

  return {
    ok: true,
    trade,
    nextCash: cash + proceeds,
    positions: nextPositions,
  };
}
