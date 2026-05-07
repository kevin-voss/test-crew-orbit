import { useMarketStore } from "@/stores/useMarketStore";
import { TICK_INTERVAL_MS } from "@/utils/marketEngine";

export function createMarketController({
  store,
}: {
  store: typeof useMarketStore;
}): () => void {
  const id = setInterval(() => {
    store.getState().applyMarketTick();
  }, TICK_INTERVAL_MS);
  return () => clearInterval(id);
}
