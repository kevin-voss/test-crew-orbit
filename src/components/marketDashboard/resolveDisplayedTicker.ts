/** Matches Ticker headline symbol precedence (selection with price, else first priced key). */
export function resolveDisplayedTicker(
  selectedTicker: string | null,
  prices: Record<string, number>,
): string | null {
  if (
    selectedTicker != null &&
    typeof prices[selectedTicker] === "number" &&
    Number.isFinite(prices[selectedTicker])
  ) {
    return selectedTicker;
  }
  for (const k of Object.keys(prices).sort()) {
    const p = prices[k];
    if (typeof p === "number" && Number.isFinite(p)) return k;
  }
  return null;
}

/** Selected symbol only — used when the UI must stay empty until the user picks a ticker. */
export function resolveSelectedChartTicker(
  selectedTicker: string | null,
  prices: Record<string, number>,
): string | null {
  if (selectedTicker == null) return null;
  const p = prices[selectedTicker];
  if (typeof p === "number" && Number.isFinite(p)) return selectedTicker;
  return null;
}
