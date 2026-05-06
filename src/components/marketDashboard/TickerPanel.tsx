import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useMarketStore } from "../../stores/market";

/** Tickers eligible for listing: finite numeric prices only, lexicographic order. */
function finitePricedSymbols(prices: Record<string, number>): string[] {
  const keys = Object.entries(prices)
    .filter(([, p]) => typeof p === "number" && Number.isFinite(p))
    .map(([k]) => k);
  keys.sort((a, b) => a.localeCompare(b));
  return keys;
}

const FLASH_DURATION_MS = 380;

/** Row background keyed by directional flash tone (presentational only). */
function rowHighlightStyle(tone: "green" | "red" | undefined): CSSProperties {
  if (tone === "green") {
    return {
      transition: "background-color 220ms ease",
      backgroundColor: "rgba(34, 197, 94, 0.22)",
    };
  }
  if (tone === "red") {
    return {
      transition: "background-color 220ms ease",
      backgroundColor: "rgba(239, 68, 68, 0.22)",
    };
  }
  return {
    transition: "background-color 220ms ease",
    backgroundColor: "transparent",
  };
}

export function TickerPanel(): JSX.Element {
  const prices = useMarketStore((s) => s.prices);
  const symbols = useMemo(() => finitePricedSymbols(prices), [prices]);
  const baselineRef = useRef<Record<string, number>>({});
  const [flashes, setFlashes] = useState<Partial<Record<string, "green" | "red">>>({});

  useEffect(() => {
    const symList = finitePricedSymbols(prices);
    const active = new Set(symList);
    const baseline = { ...baselineRef.current };

    for (const key of Object.keys(baseline)) {
      if (!active.has(key)) delete baseline[key];
    }

    const updates: Partial<Record<string, "green" | "red">> = {};

    for (const sym of symList) {
      const next = prices[sym]!;
      const prev = baseline[sym];
      if (prev !== undefined && prev !== next) {
        updates[sym] = next > prev ? "green" : "red";
      }
      baseline[sym] = next;
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
    <section data-testid="ticker-panel" aria-label="Live ticker">
      {symbols.length === 0 ? (
        <span data-testid="live-ticker-empty">No quote</span>
      ) : (
        <ul data-testid="live-ticker-list" role="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {symbols.map((sym) => {
            const flash = flashes[sym];
            const tone = flash ?? null;
            return (
              <li
                key={sym}
                data-testid={`live-ticker-row-${sym}`}
                data-live-ticker-flash={tone}
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "baseline",
                  padding: "0.15rem 0",
                  ...rowHighlightStyle(flash),
                }}
              >
                <span data-testid={`live-ticker-symbol-${sym}`}>{sym}</span>
                <span data-testid={`live-ticker-price-${sym}`}>{prices[sym]}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
