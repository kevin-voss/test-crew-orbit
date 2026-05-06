import type { Holding, TradeExecutionResult, TradeRecord } from "../stores/market/types";

/** User-facing validation failure for submit handlers (no store mutation). */
export type TradeValidationError = {
  code: string;
  message: string;
};

export type SimTradeOutcome =
  | { ok: true; result: TradeExecutionResult }
  | { ok: false; error: TradeValidationError };

function newTradeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Whole shares affordable at `price` using the same floor rule as Max Buy (AC-4, AC-14). */
export function maxWholeSharesAffordable(cash: number, price: number): number {
  if (!Number.isFinite(cash) || !Number.isFinite(price) || price <= 0) return 0;
  return Math.floor(cash / price);
}

/** Positive finite integer share count. */
export function validateShareQuantity(quantity: unknown): quantity is number {
  return (
    typeof quantity === "number" &&
    Number.isFinite(quantity) &&
    Number.isInteger(quantity) &&
    quantity > 0
  );
}

function reject(code: string, message: string): SimTradeOutcome {
  return { ok: false, error: { code, message } };
}

function buildTradeRecord(
  ticker: string,
  side: "buy" | "sell",
  shares: number,
  pricePerShare: number,
): TradeRecord {
  return {
    id: newTradeId(),
    ticker,
    side,
    shares,
    pricePerShare,
    timestamp: Date.now(),
  };
}

/**
 * Pure simulated fill: either a {@link TradeExecutionResult} for {@link useMarketStore.applyTradeResult}
 * or a validation error. Caller supplies `pricePerShare` from the store at submit time (AC-15).
 */
export function simulateTradeExecution(input: {
  cash: number;
  positions: Record<string, Holding>;
  ticker: string;
  side: "buy" | "sell";
  quantity: number;
  pricePerShare: number;
}): SimTradeOutcome {
  const { cash, positions, ticker, side, quantity, pricePerShare } = input;

  if (typeof ticker !== "string" || ticker.length === 0) {
    return reject("INVALID_TICKER", "Ticker is required.");
  }

  if (!Number.isFinite(pricePerShare) || pricePerShare <= 0) {
    return reject("INVALID_PRICE", "Price per share must be a positive finite number.");
  }

  if (!validateShareQuantity(quantity)) {
    return reject("INVALID_QUANTITY", "Quantity must be a positive whole number of shares.");
  }

  if (side === "buy") {
    const cap = maxWholeSharesAffordable(cash, pricePerShare);
    if (quantity > cap) {
      return reject("INSUFFICIENT_CASH", `Buy quantity exceeds affordable shares (${cap} at this price).`);
    }

    const prev = positions[ticker];
    const prevShares = prev?.shares ?? 0;
    const prevAvg = prev?.averageCost;
    const newShares = prevShares + quantity;
    /**
     * Weighted average cost after buy:
     * `(existingAvg * existingShares + fillPrice * qty) / (existingShares + qty)`;
     * no prior position → `averageCost = fillPrice`.
     */
    const averageCost =
      prevShares <= 0 || prevAvg === undefined
        ? pricePerShare
        : (prevShares * prevAvg + quantity * pricePerShare) / newShares;

    const nextPositions: Record<string, Holding> = { ...positions };
    if (newShares <= 0) {
      delete nextPositions[ticker];
    } else {
      nextPositions[ticker] = { shares: newShares, averageCost };
    }

    return {
      ok: true,
      result: {
        trade: buildTradeRecord(ticker, "buy", quantity, pricePerShare),
        nextCash: cash - quantity * pricePerShare,
        positions: nextPositions,
      },
    };
  }

  const prev = positions[ticker];
  const held = prev?.shares ?? 0;
  if (!prev || held <= 0) {
    return reject("NO_POSITION", "No shares to sell for this symbol.");
  }
  if (quantity > held) {
    return reject("INSUFFICIENT_SHARES", `Sell quantity cannot exceed holdings (${held} shares).`);
  }

  const newShares = held - quantity;
  const nextPositions: Record<string, Holding> = { ...positions };
  if (newShares <= 0) {
    delete nextPositions[ticker];
  } else {
    nextPositions[ticker] = { shares: newShares, averageCost: prev.averageCost };
  }

  return {
    ok: true,
    result: {
      trade: buildTradeRecord(ticker, "sell", quantity, pricePerShare),
      nextCash: cash + quantity * pricePerShare,
      positions: nextPositions,
    },
  };
}
