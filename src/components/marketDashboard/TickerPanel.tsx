import type { CSSProperties } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useMarketStore } from "../../stores/market";

/** Tickers eligible for listing: finite numeric prices only, lexicographic order. */
function finitePricedSymbols(prices: Record<string, number>): string[] {
  const keys = Object.entries(prices)
    .filter(([, p]) => typeof p === "number" && Number.isFinite(p))
    .map(([k]) => k);
  keys.sort((a, b) => a.localeCompare(b));
  return keys;
}

const FLASH_DURATION_MS = 400;

const rowLayoutStyle: CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  alignItems: "baseline",
  padding: "0.15rem 0",
};

export function TickerPanel(): JSX.Element {
  const prices = useMarketStore((s) => s.prices);
  const symbols = useMemo(() => finitePricedSymbols(prices), [prices]);
  const baselineRef = useRef<Record<string, number>>({});
  const [flashes, setFlashes] = useState<Partial<Record<string, "green" | "red">>>({});

  useLayoutEffect(() => {
    const symList = finitePricedSymbols(prices);
    const active = new Set(symList);
    const baseline = { ...baselineRef.current };

    for (const key of Object.keys(baseline)) {
      if (!active.has(key)) delete baseline[key];
    }

    const updates: Partial<Record<string, "green" | "red">> = {};

    for (const sym of symList) {
      const current = prices[sym]!;
      const prev = baseline[sym];

      if (prev === undefined) {
        baseline[sym] = current;
        continue;
      }

      if (current === prev) {
        baseline[sym] = current;
        continue;
      }

      updates[sym] = current > prev ? "green" : "red";
      baseline[sym] = current;
    }

    baselineRef.current = baseline;

    if (Object.keys(updates).length > 0) {
      setFlashes((f) => ({ ...f, ...updates }));
    }
  }, [prices]);

  useEffect(() => {
    const symList = Object.keys(flashes);
    if (symList.length === 0) return;

    const ids = symList.map((sym) =>
      setTimeout(() => {
        setFlashes((f) => {
          if (!(sym in f)) return f;
          const next = { ...f };
          delete next[sym];
          return next;
        });
      }, FLASH_DURATION_MS),
    );

    return () => {
      ids.forEach(clearTimeout);
    };
  }, [flashes]);

  return (
    <>
      <style>{`
        @keyframes live-ticker-flash-green-bg {
          0% {
            background-color: rgba(34, 197, 94, 0.28);
          }
          100% {
            background-color: transparent;
          }
        }
        @keyframes live-ticker-flash-red-bg {
          0% {
            background-color: rgba(239, 68, 68, 0.28);
          }
          100% {
            background-color: transparent;
          }
        }
        .live-ticker-row-flash-green {
          animation: live-ticker-flash-green-bg ${FLASH_DURATION_MS}ms ease-out forwards;
        }
        .live-ticker-row-flash-red {
          animation: live-ticker-flash-red-bg ${FLASH_DURATION_MS}ms ease-out forwards;
        }
      `}</style>
      <section data-testid="ticker-panel" aria-label="Live ticker">
        {symbols.length === 0 ? (
          <span data-testid="live-ticker-empty">No quote</span>
        ) : (
          <ul data-testid="live-ticker-list" role="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {symbols.map((sym) => {
              const flash = flashes[sym];
              const rowFlashClass =
                flash === "green"
                  ? "live-ticker-row-flash-green"
                  : flash === "red"
                    ? "live-ticker-row-flash-red"
                    : undefined;

              return (
                <li
                  key={sym}
                  data-testid={`live-ticker-row-${sym}`}
                  data-live-ticker-flash={flash ?? null}
                  className={rowFlashClass}
                  style={rowLayoutStyle}
                >
                  <span data-testid={`live-ticker-symbol-${sym}`}>{sym}</span>
                  <span data-testid={`live-ticker-price-${sym}`}>{prices[sym]}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
