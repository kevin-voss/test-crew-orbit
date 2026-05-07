"use client";

import { useCallback, useState } from "react";

import { useMarketStore } from "@/stores/useMarketStore";

export function TradingTerminal() {
  const selectedSymbol = useMarketStore((s) => s.selectedSymbol);
  const buy = useMarketStore((s) => s.buy);
  const sell = useMarketStore((s) => s.sell);
  const maxBuyFor = useMarketStore((s) => s.maxBuyFor);

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qtyRaw, setQtyRaw] = useState("1");
  const [tradeMessage, setTradeMessage] = useState<string | null>(null);

  const maxBuy = maxBuyFor(selectedSymbol);

  const submitTrade = useCallback(() => {
    setTradeMessage(null);
    const qtyNum = Number(qtyRaw);
    if (!Number.isInteger(qtyNum) || qtyNum <= 0) {
      setTradeMessage("Enter a whole number greater than zero.");
      return;
    }
    try {
      if (side === "buy") {
        buy({ symbol: selectedSymbol, quantity: qtyNum });
      } else {
        sell({ symbol: selectedSymbol, quantity: qtyNum });
      }
      setTradeMessage(null);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Trade could not be completed.";
      setTradeMessage(
        msg === "invalid quantity"
          ? "Enter a whole number greater than zero."
          : msg === "insufficient cash"
            ? "Not enough cash for this buy."
            : msg === "insufficient shares"
              ? "Not enough shares to sell."
              : msg === "unknown symbol"
                ? "Unknown symbol."
                : msg,
      );
    }
  }, [buy, sell, selectedSymbol, qtyRaw, side]);

  return (
    <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase text-slate-400">
        Trade
      </h3>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2" role="group" aria-label="Buy or sell">
          <button
            type="button"
            aria-pressed={side === "buy"}
            className={`flex-1 rounded px-3 py-2 text-sm font-medium ${
              side === "buy"
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            onClick={() => {
              setSide("buy");
              setTradeMessage(null);
            }}
          >
            Buy
          </button>
          <button
            type="button"
            aria-pressed={side === "sell"}
            className={`flex-1 rounded px-3 py-2 text-sm font-medium ${
              side === "sell"
                ? "bg-rose-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            onClick={() => {
              setSide("sell");
              setTradeMessage(null);
            }}
          >
            Sell
          </button>
        </div>
        <label className="text-xs text-slate-400" htmlFor="qty-input">
          Quantity (whole shares)
        </label>
        <input
          id="qty-input"
          type="number"
          min={1}
          step={1}
          value={qtyRaw}
          onChange={(e) => setQtyRaw(e.target.value)}
          className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
        />
        <p className="text-xs text-slate-400">
          Max buy:{" "}
          <span data-testid="max-buy-display" className="text-slate-100">
            {maxBuy}
          </span>
        </p>
        <div
          className="min-h-[1.25rem] text-xs text-rose-300"
          aria-live="polite"
          role="status"
        >
          {tradeMessage}
        </div>
        <button
          type="button"
          className={`w-full rounded px-3 py-2 text-sm font-medium ${
            side === "buy"
              ? "bg-emerald-600 hover:bg-emerald-500"
              : "bg-rose-600 hover:bg-rose-500"
          }`}
          onClick={submitTrade}
        >
          {side === "buy" ? "Submit buy" : "Submit sell"}
        </button>
      </div>
    </div>
  );
}
