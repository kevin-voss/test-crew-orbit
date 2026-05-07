"use client";

import { useEffect } from "react";

import { useMarketStore } from "@/stores/useMarketStore";

/**
 * Client bootstrap after Zustand `persist` rehydrates.
 * Ensures price-history buffers exist before chart consumers render prolonged periods without ticks.
 */
export function useMarketRuntime(): boolean {
  const hydrated = useMarketStore((s) => s._hasHydrated);

  useEffect(() => {
    if (!hydrated) return;
    useMarketStore.getState().ensurePriceHistoriesSeeded();
  }, [hydrated]);

  return hydrated;
}
