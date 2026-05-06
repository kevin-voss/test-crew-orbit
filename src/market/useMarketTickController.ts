import { useEffect, useRef } from "react";

import {
  marketStoreHasHydrated,
  onMarketStoreHydrationComplete,
} from "../stores/market/index";
import {
  createMarketTickController,
  type CreateMarketTickControllerOptions,
} from "./marketTickController";

export type UseMarketTickControllerOptions = CreateMarketTickControllerOptions;

/**
 * Starts the GBM-backed market tick loop after the persisted market store has rehydrated,
 * and stops on unmount. Updates flow through `useMarketStore` via `applyMarketTick`.
 */
export function useMarketTickController(options?: CreateMarketTickControllerOptions): void {
  const optsRef = useRef(options);
  optsRef.current = options;

  const generationRef = useRef(0);

  useEffect(() => {
    const mountGeneration = ++generationRef.current;
    const controller = createMarketTickController(optsRef.current);

    const startIfActive = (): void => {
      if (mountGeneration !== generationRef.current) return;
      controller.start();
    };

    const unsubscribeHydration = onMarketStoreHydrationComplete(() => {
      startIfActive();
    });

    if (marketStoreHasHydrated()) {
      startIfActive();
    }

    return () => {
      generationRef.current += 1;
      unsubscribeHydration();
      controller.stop();
    };
  }, []);
}
