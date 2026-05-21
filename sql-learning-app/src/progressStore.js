export const STORAGE_KEY = "sql-lern-app-progress-v1";

/**
 * @typedef {{ version: number; completedUnits: string[]; lastUnitId: string }} ProgressState
 */

/**
 * @param {ReturnType<import("./pathController.js").createPathController>} pathController
 * @param {import("./curriculum.js").Curriculum} curriculum
 * @param {string | undefined} lastUnitId
 */
export function getResumeUnit(pathController, curriculum, lastUnitId) {
  const ordered = [...curriculum.units].sort((a, b) => a.order - b.order);
  const targetId = lastUnitId ?? ordered[0]?.id ?? "";
  if (pathController.isUnlocked(targetId)) {
    return { unitId: targetId, locked: false };
  }
  const fallback = ordered.find((u) => pathController.isUnlocked(u.id));
  return {
    unitId: fallback?.id ?? ordered[0]?.id ?? "",
    locked: true,
  };
}

/**
 * @param {{ getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem?: (k: string) => void }} storage
 */
export function createProgressStore(storage) {
  function resetCorruptStorage() {
    try {
      storage.removeItem?.(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  return {
    /**
     * @param {ProgressState} state
     * @returns {{ ok: boolean }}
     */
    save(state) {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(state));
        return { ok: true };
      } catch {
        return { ok: false };
      }
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
          !parsed.completedUnits.every((id) => typeof id === "string") ||
          typeof parsed.lastUnitId !== "string"
        ) {
          resetCorruptStorage();
          return null;
        }
        return /** @type {ProgressState} */ (parsed);
      } catch {
        resetCorruptStorage();
        return null;
      }
    },
  };
}
