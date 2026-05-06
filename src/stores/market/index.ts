import { useMarketStore } from "./marketStore";

export type {
  EquityPoint,
  Holding,
  MarketStoreActions,
  MarketStoreData,
  MarketStoreState,
  MarketTickPayload,
  PricePoint,
  TradeExecutionResult,
  TradeRecord,
} from "./types";

export {
  DEFAULT_INITIAL_CASH,
  MARKET_STORE_STORAGE_KEY,
  useMarketStore,
} from "./marketStore";

/**
 * Prefer this over reading `persist.hasHydrated` directly so dashboards can gate UX on session restore (AC-3).
 */
export function marketStoreHasHydrated(): boolean {
  return useMarketStore.persist.hasHydrated();
}

export function onMarketStoreHydrationComplete(callback: () => void): () => void {
  return useMarketStore.persist.onFinishHydration(callback);
}
