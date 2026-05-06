import { useCallback, useEffect, useId, useMemo, useState, type CSSProperties } from "react";

import { maxWholeSharesAffordable, simulateTradeExecution } from "../../market/simulateTradeExecution";
import { useMarketStore } from "../../stores/market";

function formatCash(n: number): string {
  return n.toLocaleString(undefined, { useGrouping: false, maximumFractionDigits: 2 });
}

function formatPrice(n: number): string {
  return n.toFixed(2);
}

function parseWholeShares(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
  return n;
}

export function TradingTerminal(): JSX.Element {
  const cash = useMarketStore((s) => s.cash);
  const selectedTicker = useMarketStore((s) => s.selectedTicker);
  const prices = useMarketStore((s) => s.prices);
  const position = useMarketStore((s) =>
    s.selectedTicker != null ? s.positions[s.selectedTicker] : undefined,
  );

  const uid = useId();
  const buyId = `${uid}-buy`;
  const sellId = `${uid}-sell`;
  const qtyId = `${uid}-qty`;

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qtyInput, setQtyInput] = useState("");
  const [feedback, setFeedback] = useState("");

  const rawPrice = selectedTicker != null ? prices[selectedTicker] : undefined;
  const price =
    typeof rawPrice === "number" && Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : null;

  /** Reactive max buy — deps match store inputs updated by ticks (cash, price). */
  const maxBuy = useMemo(() => {
    return price != null ? maxWholeSharesAffordable(cash, price) : 0;
  }, [cash, price]);

  const maxBuyLabel = useMemo(() => {
    if (side !== "buy") return "";
    return `Max buy: ${maxBuy} shares`;
  }, [side, maxBuy]);

  const sharesHeld = position?.shares ?? 0;

  useEffect(() => {
    setQtyInput("");
    setFeedback("");
  }, [selectedTicker, side]);

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

    const outcome = simulateTradeExecution({
      cash: st.cash,
      positions: st.positions,
      ticker,
      side,
      quantity: qty,
      pricePerShare: livePrice,
    });

    if (!outcome.ok) {
      setFeedback(outcome.error.message);
      return;
    }

    useMarketStore.getState().applyTradeResult(outcome.result);
    setQtyInput("");
  }, [qtyInput, side]);

  const canTradeSymbol = selectedTicker != null;
  const showPrice = price != null;
  const qtyPreview = parseWholeShares(qtyInput.trim());
  const submitDisabled =
    !canTradeSymbol || !showPrice || qtyPreview === null;

  const panelBorder = "#e7e5e4";
  const muted = "#78716c";
  const labelColor = "#44403c";

  const sectionStyle: CSSProperties = {
    margin: 0,
    padding: "12px 16px",
    borderRadius: 8,
    border: `1px solid ${panelBorder}`,
    background: "#fafaf9",
    fontSize: 14,
    maxWidth: 420,
    boxSizing: "border-box",
  };

  return (
    <section data-testid="trading-terminal" aria-label="Trading terminal" style={sectionStyle}>
      {!canTradeSymbol ? (
        <p style={{ margin: "0 0 10px", color: muted }}>
          Select a stock symbol in the dashboard to use the trading terminal.
        </p>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <span style={{ color: labelColor }}>Cash: </span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatCash(cash)}</span>
        </div>

        {canTradeSymbol ? (
          <div>
            <span style={{ color: labelColor }}>Symbol: </span>
            <span style={{ fontWeight: 600 }}>{selectedTicker}</span>
          </div>
        ) : null}

        {showPrice ? (
          <div>
            <span style={{ color: labelColor }}>Price: </span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatPrice(price)}</span>
          </div>
        ) : canTradeSymbol ? (
          <div style={{ color: muted }}>Price: —</div>
        ) : null}

        {side === "sell" && canTradeSymbol ? (
          <div>
            <span style={{ color: labelColor }}>Shares held: </span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{sharesHeld}</span>
          </div>
        ) : null}

        <fieldset style={{ margin: 0, padding: 0, border: "none" }}>
          <legend style={{ fontWeight: 600, marginBottom: 6, fontSize: 14, color: labelColor }}>
            Action
          </legend>
          <div
            role="presentation"
            style={{
              display: "flex",
              gap: 0,
              padding: 4,
              borderRadius: 8,
              border: `1px solid ${panelBorder}`,
              background: "#ffffff",
              boxSizing: "border-box",
            }}
          >
            <label
              data-testid="trade-side-buy"
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                cursor: "pointer",
                padding: "8px 12px",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 14,
                ...(side === "buy"
                  ? {
                      background: "#1c1917",
                      color: "#fafaf9",
                      boxShadow: "inset 0 0 0 1px #1c1917",
                    }
                  : { background: "transparent", color: muted }),
              }}
            >
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
            <label
              data-testid="trade-side-sell"
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                cursor: "pointer",
                padding: "8px 12px",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 14,
                ...(side === "sell"
                  ? {
                      background: "#b91c1c",
                      color: "#fafaf9",
                      boxShadow: "inset 0 0 0 1px #b91c1c",
                    }
                  : { background: "transparent", color: muted }),
              }}
            >
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
          <div aria-live="polite" style={{ color: labelColor }}>
            {maxBuyLabel}
          </div>
        ) : side === "buy" && canTradeSymbol && showPrice === false ? (
          <div aria-live="polite" style={{ color: muted }}>
            Max buy unavailable until the live ticker updates prices.
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
          data-testid="trade-submit"
          disabled={!canTradeSymbol}
          {...(!canTradeSymbol ? { "aria-disabled": true as const } : {})}
          onClick={onSubmit}
          style={{
            padding: "10px 14px",
            borderRadius: 6,
            border: "1px solid #292524",
            background: submitDisabled ? "#a8a29e" : "#1c1917",
            color: "#fafaf9",
            fontWeight: 600,
            cursor: submitDisabled ? "not-allowed" : "pointer",
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
