import { createJSONStorage } from "zustand/middleware";

type SyncEngine = {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
};

const memoryFallback = new Map<string, string>();

function getEngineStorage(): SyncEngine {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return {
    getItem: (name) => memoryFallback.get(name) ?? null,
    setItem: (name, value) => {
      memoryFallback.set(name, value);
    },
    removeItem: (name) => {
      memoryFallback.delete(name);
    },
  };
}

/**
 * localStorage-backed JSON storage with parse failure recovery (AC-21).
 */
export const simTradingPersistStorage = createJSONStorage(() => {
  const engine = getEngineStorage();
  return {
    getItem: (name): string | null => {
      try {
        const raw = engine.getItem(name);
        if (raw == null) return null;
        JSON.parse(raw);
        return raw;
      } catch {
        engine.removeItem(name);
        return null;
      }
    },
    setItem: (name, value) => engine.setItem(name, value),
    removeItem: (name) => engine.removeItem(name),
  };
});
