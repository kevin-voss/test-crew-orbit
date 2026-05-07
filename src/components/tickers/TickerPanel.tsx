"use client";

/**
 * AC-20 (first flash baseline): Flash direction compares each symbol’s current
 * `lastPriceBySymbol` to `priorTickPriceBySymbol` from the prior tick. On the first
 * market tick after load/rehydration, `priorTickPriceBySymbol` matches the seeded or
 * persisted snapshot (same baseline as last persisted prices), so unchanged prices show
 * `flash-neutral-first-tick` rather than a misleading green/red flash.
 */
import { useMarketStore } from "@/stores/useMarketStore";
import { defaultInstruments } from "@/utils/marketEngine";

function tickerFlash(
  sym: string,
  last: Record<string, number>,
  prior: Record<string, number>,
): string {
  const a = last[sym];
  const b = prior[sym];
  if (a == null || b == null) return "";
  if (a === b) return "flash-neutral-first-tick";
  return a > b ? "flash-up" : "flash-down";
}

export function TickerPanel() {
  const symbols = defaultInstruments().map((i) => i.symbol);
  const selectedSymbol = useMarketStore((s) => s.selectedSymbol);
  const setSelectedSymbol = useMarketStore((s) => s.setSelectedSymbol);
  const lastPriceBySymbol = useMarketStore((s) => s.lastPriceBySymbol);
  const priorTickPriceBySymbol = useMarketStore(
    (s) => s.priorTickPriceBySymbol,
  );

  function fmtMoney(n: number) {
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return (
    <aside
      data-testid="region-tickers"
      className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Tickers
      </h2>
      <ul className="flex flex-col gap-1">
        {symbols.map((sym) => {
          const px = lastPriceBySymbol[sym] ?? 0;
          const flash = tickerFlash(
            sym,
            lastPriceBySymbol,
            priorTickPriceBySymbol,
          );
          return (
            <li
              key={sym}
              data-testid={`ticker-row-${sym}`}
              className={`rounded-md border border-slate-800 ${flash} ${
                selectedSymbol === sym ? "border-emerald-600/60 bg-slate-800" : ""
              }`}
            >
              <button
                type="button"
                data-testid={`select-symbol-${sym}`}
                onClick={() => setSelectedSymbol(sym)}
                className="flex w-full items-center justify-between px-2 py-2 text-left transition-colors hover:bg-slate-800/80"
              >
                <span className="font-medium">{sym}</span>
                <span data-testid="ticker-price" className="tabular-nums">
                  {fmtMoney(px)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
