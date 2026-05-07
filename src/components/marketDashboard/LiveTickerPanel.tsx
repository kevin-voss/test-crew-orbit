import { useLayoutEffect, useRef, useState } from "react";

import { useMarketStore } from "../../stores/market";

function formatPrice(price: number): string {
  return price.toFixed(2);
}

function listSymbols(prices: Record<string, number>): string[] {
  return Object.keys(prices)
    .filter((k) => typeof prices[k] === "number" && Number.isFinite(prices[k]))
    .sort();
}

const FLASH_CLEAR_MS = 600;

export function LiveTickerPanel(): JSX.Element {
  const prices = useMarketStore((s) => s.prices);
  const prevPricesRef = useRef<Record<string, number>>({});
  const [flashBySymbol, setFlashBySymbol] = useState<
    Record<string, "up" | "down" | null>
  >({});

  useLayoutEffect(() => {
    const prev = prevPricesRef.current;
    const symbols = listSymbols(prices);
    const nextPrev: Record<string, number> = {};
    const nextFlash: Record<string, "up" | "down" | null> = {};

    for (const sym of symbols) {
      const p = prices[sym]!;
      nextPrev[sym] = p;
      const was = prev[sym];
      if (was !== undefined && p !== was) {
        nextFlash[sym] = p > was ? "up" : "down";
      } else {
        nextFlash[sym] = null;
      }
    }

    prevPricesRef.current = nextPrev;
    setFlashBySymbol(nextFlash);

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    for (const sym of symbols) {
      if (nextFlash[sym]) {
        const id = setTimeout(() => {
          setFlashBySymbol((f) => ({ ...f, [sym]: null }));
        }, FLASH_CLEAR_MS);
        timeouts.push(id);
      }
    }

    return () => {
      for (const id of timeouts) {
        clearTimeout(id);
      }
    };
  }, [prices]);

  const symbols = listSymbols(prices);

  return (
    <section
      data-testid="live-ticker-panel"
      {...(symbols.length === 0 ? { "aria-label": "Live ticker" } : {})}
      style={{ margin: 0, padding: 0 }}
    >
      {symbols.length === 0 ? (
        <p
          data-testid="live-ticker-empty"
          style={{
            margin: 0,
            padding: "12px 16px",
            fontSize: 14,
            color: "#78716c",
          }}
        >
          No quotes yet
        </p>
      ) : (
        <ul
          data-testid="ticker-prices"
          role="list"
          aria-label="Live ticker"
          style={{
            listStyle: "none",
            margin: 0,
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minWidth: 200,
          }}
        >
          {symbols.map((sym) => {
            const price = prices[sym]!;
            const flash = flashBySymbol[sym] ?? null;
            const gain = flash === "up";
            const loss = flash === "down";

            return (
              <li
                key={sym}
                role="listitem"
                data-testid={`live-ticker-row-${sym}`}
                data-live-flash={flash ?? undefined}
                className={
                  gain
                    ? "liveTickerRow liveTickerRowGain"
                    : loss
                      ? "liveTickerRow liveTickerRowLoss"
                      : "liveTickerRow"
                }
                style={{
                  display: "block",
                  boxSizing: "border-box",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #e7e5e4",
                  borderLeft: gain
                    ? "3px solid rgb(5, 150, 105)"
                    : loss
                      ? "3px solid rgb(225, 29, 72)"
                      : "3px solid transparent",
                  color: "#1c1917",
                  fontSize: 14,
                  fontVariantNumeric: "tabular-nums",
                  backgroundColor: gain
                    ? "rgba(16, 185, 129, 0.35)"
                    : loss
                      ? "rgba(244, 63, 94, 0.35)"
                      : "#fafaf9",
                  transition: "background-color 0.18s ease",
                }}
              >
                <span style={{ fontWeight: 600 }}>{sym}</span>
                <span style={{ marginLeft: 8 }}>{formatPrice(price)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
