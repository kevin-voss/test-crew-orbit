export const STORAGE_KEY = "sql-lern-app-progress-v1";

/**
 * @typedef {{ version: number; completedUnits: string[]; lastUnitId: string }} ProgressState
 */

/**
 * @param {{ getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem?: (k: string) => void }} storage
 */
export function createProgressStore(storage) {
  return {
    /**
     * @param {ProgressState} state
     */
    save(state) {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    },

    /**
     * @returns {ProgressState | null}
     */
    load() {
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (
          !parsed ||
          parsed.version !== 1 ||
          !Array.isArray(parsed.completedUnits) ||
          typeof parsed.lastUnitId !== "string"
        ) {
          return null;
        }
        return /** @type {ProgressState} */ (parsed);
      } catch {
        return null;
      }
    },
  };
}
