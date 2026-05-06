import { useCallback, useId, useMemo, useState, type CSSProperties } from "react";

import type { Holding, TradeExecutionResult } from "../../stores/market";
import { useMarketStore } from "../../stores/market";

function formatCash(n: number): string {
  return n.toLocaleString(undefined, { useGrouping: false, maximumFractionDigits: 2 });
}

function formatPrice(n: number): string {
  return n.toFixed(2);
}

function newTradeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function maxWholeBuyShares(cash: number, price: number): number {
  if (!Number.isFinite(cash) || !Number.isFinite(price) || price <= 0) return 0;
  return Math.floor(cash / price);
}

function parseWholeShares(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
  return n;
}

function executeBuyAtPrice(
  ticker: string,
  shares: number,
  pricePerShare: number,
  cash: number,
  positions: Record<string, Holding>,
): TradeExecutionResult {
  const prev = positions[ticker];
  const prevShares = prev?.shares ?? 0;
  const prevAvg = prev?.averageCost;
  const newShares = prevShares + shares;
  const averageCost =
    prevShares <= 0 || prevAvg === undefined
      ? pricePerShare
      : (prevShares * prevAvg + shares * pricePerShare) / newShares;

  return {
    trade: {
      id: newTradeId(),
      ticker,
      side: "buy",
      shares,
      pricePerShare,
      timestamp: Date.now(),
    },
    nextCash: cash - shares * pricePerShare,
    positions: { ...positions, [ticker]: { shares: newShares, averageCost } },
  };
}

function executeSellAtPrice(
  ticker: string,
  shares: number,
  pricePerShare: number,
  cash: number,
  positions: Record<string, Holding>,
): TradeExecutionResult {
  const prev = positions[ticker];
  const next: Record<string, Holding> = { ...positions };
  const newShares = (prev?.shares ?? 0) - shares;
  if (newShares <= 0) {
    delete next[ticker];
  } else {
    next[ticker] = { shares: newShares, averageCost: prev?.averageCost };
  }

  return {
    trade: {
      id: newTradeId(),
      ticker,
      side: "sell",
      shares,
      pricePerShare,
      timestamp: Date.now(),
    },
    nextCash: cash + shares * pricePerShare,
    positions: next,
  };
}

export function TradingTerminal(): JSX.Element {
  const cash = useMarketStore((s) => s.cash);
  const selectedTicker = useMarketStore((s) => s.selectedTicker);
  const prices = useMarketStore((s) => s.prices);
  const position = useMarketStore((s) =>
    s.selectedTicker != null ? s.positions[s.selectedTicker] : undefined,
  );
  const applyTradeResult = useMarketStore((s) => s.applyTradeResult);

  const uid = useId();
  const buyId = `${uid}-buy`;
  const sellId = `${uid}-sell`;
  const qtyId = `${uid}-qty`;

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qtyInput, setQtyInput] = useState("");
  const [feedback, setFeedback] = useState("");

  const price =
    selectedTicker != null && typeof prices[selectedTicker] === "number"
      ? prices[selectedTicker]!
      : null;

  const maxBuy = price != null ? maxWholeBuyShares(cash, price) : 0;
  const sharesHeld = position?.shares ?? 0;

  const maxBuyLabel = useMemo(() => {
    if (side !== "buy") return "";
    return `Max buy: ${maxBuy} shares`;
  }, [side, maxBuy]);

  const onSubmit = useCallback(() => {
    setFeedback("");
    const st = useMarketStore.getState();
    const ticker = st.selectedTicker;
    if (ticker == null) {
      setFeedback("Select a ticker from the market list before trading.");
      return;
    }
    const livePrice = st.prices[ticker];
    if (typeof livePrice !== "number" || !Number.isFinite(livePrice) || livePrice <= 0) {
      setFeedback("No simulated price is available for this symbol yet.");
      return;
    }

    const qty = parseWholeShares(qtyInput.trim());
    if (qty == null) {
      setFeedback("Enter a whole number of shares (at least 1).");
      return;
    }

    if (side === "buy") {
      const cap = maxWholeBuyShares(st.cash, livePrice);
      if (qty > cap) {
        setFeedback(`Buy quantity exceeds max buy (${cap} shares at the current price).`);
        return;
      }
      const result = executeBuyAtPrice(ticker, qty, livePrice, st.cash, st.positions);
      applyTradeResult(result);
      setQtyInput("");
      return;
    }

    const held = st.positions[ticker]?.shares ?? 0;
    if (held <= 0) {
      setFeedback("You have no shares to sell for this symbol.");
      return;
    }
    if (qty > held) {
      setFeedback(`Sell quantity cannot exceed your holdings (${held} shares).`);
      return;
    }
    const result = executeSellAtPrice(ticker, qty, livePrice, st.cash, st.positions);
    applyTradeResult(result);
    setQtyInput("");
  }, [applyTradeResult, qtyInput, side]);

  const canTradeSymbol = selectedTicker != null;
  const showPrice = price != null;

  const sectionStyle: CSSProperties = {
    margin: "16px 0",
    padding: "16px",
    borderRadius: 8,
    border: "1px solid #e7e5e4",
    background: "#fafaf9",
    fontSize: 14,
    maxWidth: 420,
  };

  return (
    <section data-testid="trading-terminal" aria-label="Trading terminal" style={sectionStyle}>
      {!canTradeSymbol ? (
        <p style={{ margin: "0 0 12px", color: "#57534e" }}>
          Select a stock symbol in the dashboard to use the trading terminal.
        </p>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <span style={{ color: "#44403c" }}>Cash: </span>
          <span>{formatCash(cash)}</span>
        </div>

        {canTradeSymbol ? (
          <div>
            <span style={{ color: "#44403c" }}>Symbol: </span>
            <span>{selectedTicker}</span>
          </div>
        ) : null}

        {showPrice ? (
          <div>
            <span style={{ color: "#44403c" }}>Price: </span>
            <span>{formatPrice(price)}</span>
          </div>
        ) : canTradeSymbol ? (
          <div style={{ color: "#78716c" }}>Price: —</div>
        ) : null}

        {side === "sell" && canTradeSymbol ? (
          <div>
            <span style={{ color: "#44403c" }}>Shares held: </span>
            <span>{sharesHeld}</span>
          </div>
        ) : null}

        <fieldset style={{ margin: 0, padding: 0, border: "none" }}>
          <legend style={{ fontWeight: 600, marginBottom: 8 }}>Action</legend>
          <div style={{ display: "flex", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                id={buyId}
                type="radio"
                name={`${uid}-side`}
                checked={side === "buy"}
                onChange={() => {
                  setSide("buy");
                  setFeedback("");
                }}
              />
              Buy
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                id={sellId}
                type="radio"
                name={`${uid}-side`}
                checked={side === "sell"}
                onChange={() => {
                  setSide("sell");
                  setFeedback("");
                }}
              />
              Sell
            </label>
          </div>
        </fieldset>

        {side === "buy" && canTradeSymbol && showPrice ? (
          <div aria-live="polite" style={{ color: "#44403c" }}>
            {maxBuyLabel}
          </div>
        ) : null}

        <div>
          <label htmlFor={qtyId} style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
            Quantity (whole shares)
          </label>
          <input
            id={qtyId}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={qtyInput}
            disabled={!canTradeSymbol}
            onChange={(e) => {
              setQtyInput(e.target.value);
              setFeedback("");
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid #d6d3d1",
            }}
          />
        </div>

        <button
          type="button"
          disabled={!canTradeSymbol}
          {...(!canTradeSymbol ? { "aria-disabled": true as const } : {})}
          onClick={onSubmit}
          style={{
            padding: "10px 14px",
            borderRadius: 6,
            border: "1px solid #292524",
            background: canTradeSymbol ? "#1c1917" : "#a8a29e",
            color: "#fafaf9",
            fontWeight: 600,
            cursor: canTradeSymbol ? "pointer" : "not-allowed",
          }}
        >
          {side === "buy" ? "Place buy" : "Place sell"}
        </button>
      </div>

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ marginTop: 12, minHeight: 20, color: "#b91c1c", fontSize: 13 }}
      >
        {feedback}
      </div>
    </section>
  );
}
