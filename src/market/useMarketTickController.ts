import { useEffect, useRef } from "react";

import {
  createMarketTickController,
  type CreateMarketTickControllerOptions,
} from "./marketTickController";

export type UseMarketTickControllerOptions = CreateMarketTickControllerOptions;

/**
 * Starts the GBM-backed market tick loop on mount (e.g. dashboard load) and stops on unmount.
 * All price and history updates go through `useMarketStore` via `applyMarketTick`.
 */
export function useMarketTickController(options?: CreateMarketTickControllerOptions): void {
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    const controller = createMarketTickController(optsRef.current);
    controller.start();
    return () => {
      controller.stop();
    };
  }, []);
}
