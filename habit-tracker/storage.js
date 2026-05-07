/**
 * habit-tracker — persistence (localStorage).
 *
 * One versioned blob under STORAGE_KEY for atomic-ish replace when saving.
 *
 * Persisted JSON shape (habits match `habits.js` validation when created via the UI;
 * tracker persistence uses the same `id` / `label` fields):
 * {
 *   "version": 1,
 *   "habits": Array<{ "id": string, "label": string }>,
 *   "completions": {
 *      [habitId: string]: string[]  // YYYY-MM-DD keys (local calendar semantics from the app tracker)
 *   }
 * }
 *
 * When `version` is bumped later, migrate in load before returning `data`.
 */

export const STORAGE_KEY = "habitTracker.v1";

/** @deprecated Internal — legacy split keys consumed only for migration. */
const LEGACY_HABITS_KEY = "habit-tracker:habits";

/** @deprecated Internal — legacy split keys consumed only for migration. */
const LEGACY_COMPLETIONS_KEY = "habit-tracker:completions";

const CURRENT_VERSION = 1;

/** @returns {{ habits: unknown[], completions: Record<string, string[]> }} */
export function emptyAppData() {
  return { habits: [], completions: {} };
}

/** @param {unknown} value */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Try to normalize parsed JSON into `{ habits, completions, version }` or null if unusable.
 * @param {unknown} parsed
 */
function normalizeBlob(parsed) {
  if (!isRecord(parsed)) return null;
  const habits = parsed.habits;
  const completions = parsed.completions;
  const version =
    typeof parsed.version === "number" ? parsed.version : CURRENT_VERSION;
  if (!Array.isArray(habits)) return null;
  if (!isRecord(completions)) return null;

  /** @type {Array<{ id: string, label: string }>} */
  const outHabits = [];
  for (const h of habits) {
    if (!isRecord(h)) return null;
    const id = h.id;
    const label = h.label;
    if (typeof id !== "string" || typeof label !== "string") return null;
    outHabits.push({ id, label });
  }

  /** @type {Record<string, string[]>} */
  const outCompletions = {};
  for (const [habitId, dates] of Object.entries(completions)) {
    if (typeof habitId !== "string") return null;
    if (!Array.isArray(dates)) return null;
    const list = dates.filter((d) => typeof d === "string");
    if (list.length !== dates.length) return null;
    outCompletions[habitId] = list;
  }

  return { version, habits: outHabits, completions: outCompletions };
}

/**
 * @param {Storage} ls
 * @returns {{ version: number, habits: { id: string, label: string }[], completions: Record<string, string[]> } | null}
 */
function readLegacyIntoBlob(ls) {
  const rawH = ls.getItem(LEGACY_HABITS_KEY);
  const rawC = ls.getItem(LEGACY_COMPLETIONS_KEY);
  if (rawH === null && rawC === null) return null;

  /** @type {{ id: string, label: string }[]} */
  let habits = [];
  if (rawH) {
    try {
      const p = JSON.parse(rawH);
      habits = Array.isArray(p)
        ? p.filter(
            (h) =>
              isRecord(h) &&
              typeof h.id === "string" &&
              typeof h.label === "string",
          )
        : [];
    } catch {
      habits = [];
    }
  }

  /** @type {Record<string, string[]>} */
  let completions = {};
  if (rawC) {
    try {
      const p = JSON.parse(rawC);
      if (isRecord(p)) {
        completions = {};
        for (const [k, v] of Object.entries(p)) {
          if (Array.isArray(v)) {
            completions[k] = v.filter((d) => typeof d === "string");
          }
        }
      }
    } catch {
      completions = {};
    }
  }

  return {
    version: CURRENT_VERSION,
    habits,
    completions,
  };
}

/**
 * Reads app state from localStorage.
 * Corrupt payloads return `ok: false` with a non-technical `message`; callers should reset to empty and show `message`.
 * @param {Storage | null} ls
 * @returns {{ ok: true, data: { version: number, habits: { id: string, label: string }[], completions: Record<string, string[]> } } | { ok: false, reason: string, message: string }}
 */
export function loadAppState(ls = typeof localStorage !== "undefined" ? localStorage : null) {
  if (!ls) {
    return {
      ok: false,
      reason: "unavailable",
      message:
        "We couldn't access saved data on this device. Your tracker will work until you reload, but habits may not be saved.",
    };
  }

  let raw = ls.getItem(STORAGE_KEY);

  if (!raw) {
    const migrated = readLegacyIntoBlob(ls);
    if (migrated) {
      const saved = saveAppStateInternal(ls, migrated);
      if (!saved.ok) return saved;
      try {
        ls.removeItem(LEGACY_HABITS_KEY);
        ls.removeItem(LEGACY_COMPLETIONS_KEY);
      } catch {
        /* ignore cleanup failure */
      }
      return { ok: true, data: migrated };
    }
    const empty = { version: CURRENT_VERSION, habits: [], completions: {} };
    return { ok: true, data: empty };
  }

  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      reason: "corrupt",
      message:
        "Something went wrong loading your saved habits. We've started fresh so you can continue tracking safely.",
    };
  }

  const normalized = normalizeBlob(parsed);
  if (!normalized) {
    return {
      ok: false,
      reason: "corrupt",
      message:
        "Something went wrong loading your saved habits. We've started fresh so you can continue tracking safely.",
    };
  }

  return { ok: true, data: normalized };
}

/**
 * @param {Storage} ls
 * @param {{ version: number, habits: { id: string, label: string }[], completions: Record<string, string[]> }} state
 */
function saveAppStateInternal(ls, state) {
  try {
    const payload = {
      version: state.version ?? CURRENT_VERSION,
      habits: state.habits,
      completions: state.completions,
    };
    ls.setItem(STORAGE_KEY, JSON.stringify(payload));
    return /** @type {{ ok: true }} */ ({ ok: true });
  } catch (e) {
    const name = typeof e?.name === "string" ? e.name : "";
    if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
      return {
        ok: false,
        reason: "quota",
        message:
          "This device couldn't save any more data. Remove old items or free space, then try again.",
      };
    }
    return {
      ok: false,
      reason: "write",
      message:
        "We couldn't save your changes. Check that storage isn't blocked for this site and try again.",
    };
  }
}

/**
 * Persists full app state to localStorage.
 * @param {{ version?: number, habits: { id: string, label: string }[], completions: Record<string, string[]> }} state
 * @param {Storage | null} ls
 * @returns {{ ok: true } | { ok: false, reason: string, message: string }}
 */
export function saveAppState(state, ls = typeof localStorage !== "undefined" ? localStorage : null) {
  if (!ls) {
    return {
      ok: false,
      reason: "unavailable",
      message:
        "We couldn't access saved data on this device. Your tracker will work until you reload, but habits may not be saved.",
    };
  }
  const full = {
    version: state.version ?? CURRENT_VERSION,
    habits: state.habits,
    completions: state.completions,
  };
  return saveAppStateInternal(ls, full);
}
