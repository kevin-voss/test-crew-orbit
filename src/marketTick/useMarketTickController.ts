import { useEffect } from "react";

import {
  marketStoreHasHydrated,
  onMarketStoreHydrationComplete,
  useMarketStore,
} from "../stores/market";
import { runMarketTick } from "../utils/marketEngine";
import { startMarketTickLoop } from "./marketTickLoop";

const DEFAULT_INTERVAL_MS = 2000;

/**
 * Starts the periodic market simulation when the dashboard mounts and tears it down on unmount.
 * Tick scheduling lives in `startMarketTickLoop`; this hook only bridges React lifecycle and store hydration.
 */
export function useMarketTickController(): void {
  useEffect(() => {
    let handle: ReturnType<typeof startMarketTickLoop> | null = null;
    let hydrationUnsub: (() => void) | null = null;

    const start = (): void => {
      handle?.stop();
      handle = startMarketTickLoop({
        intervalMs: DEFAULT_INTERVAL_MS,
        getState: () => useMarketStore.getState(),
        applyMarketTick: (payload) => {
          useMarketStore.getState().applyMarketTick(payload);
        },
        runMarketTick,
        nowMs: () => Date.now(),
      });
    };

    if (marketStoreHasHydrated()) {
      start();
    } else {
      hydrationUnsub = onMarketStoreHydrationComplete(() => {
        start();
      });
    }

    return () => {
      hydrationUnsub?.();
      handle?.stop();
    };
  }, []);
}
