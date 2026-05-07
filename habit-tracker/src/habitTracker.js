import { newHabitId, validateName } from "../habits.js";

const STORAGE_KEYS = {
  habits: "habit-tracker:habits",
  completions: "habit-tracker:completions",
};

/** @param {string} dateISO */
function parseUTCDate(dateISO) {
  const [y, m, d] = dateISO.split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

/**
 * Monday = 0 .. Sunday = 6 for the UTC calendar date of `dateISO`.
 * @param {string} dateISO
 */
function mondayOffsetUTC(dateISO) {
  const t = parseUTCDate(dateISO);
  const dow = new Date(t).getUTCDay(); // Sun=0..Sat=6
  return dow === 0 ? 6 : dow - 1;
}

/** @param {string} dateISO */
function weekRangeContainingUTC(dateISO) {
  const off = mondayOffsetUTC(dateISO);
  const t = parseUTCDate(dateISO);
  const base = new Date(t);
  const monMs = Date.UTC(
    base.getUTCFullYear(),
    base.getUTCMonth(),
    base.getUTCDate() - off,
  );
  const mon = new Date(monMs);
  const sunMs = Date.UTC(
    mon.getUTCFullYear(),
    mon.getUTCMonth(),
    mon.getUTCDate() + 6,
  );
  const sun = new Date(sunMs);
  return {
    startISO: toISOUTC(mon),
    endISO: toISOUTC(sun),
  };
}

/** @param {Date} d */
function toISOUTC(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Lexicographic order matches chronological order for YYYY-MM-DD.
 * @param {string} a
 * @param {string} b
 */
function compareISODate(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * @param {{ storage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void }; clock?: { todayISO: () => string } }} options
 */
export function createHabitTracker({ storage, clock } = {}) {
  if (!storage) {
    throw new TypeError("createHabitTracker requires { storage }");
  }

  const todayISO = () =>
    clock?.todayISO?.() ??
    toISOUTC(new Date());

  function loadHabits() {
    const raw = storage.getItem(STORAGE_KEYS.habits);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveHabits(habits) {
    storage.setItem(STORAGE_KEYS.habits, JSON.stringify(habits));
  }

  function loadCompletions() {
    const raw = storage.getItem(STORAGE_KEYS.completions);
    if (!raw) return /** @type {Record<string, string[]>} */ ({});
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveCompletions(map) {
    storage.setItem(STORAGE_KEYS.completions, JSON.stringify(map));
  }

  function expandWeekDays(startISO) {
    const out = [];
    let t = parseUTCDate(startISO);
    for (let i = 0; i < 7; i++) {
      const dt = new Date(t);
      out.push(toISOUTC(dt));
      t = Date.UTC(
        dt.getUTCFullYear(),
        dt.getUTCMonth(),
        dt.getUTCDate() + 1,
      );
    }
    return out;
  }

  return {
    /**
     * @param {{ name: string }} input
     * @returns {{ ok: true, habit: { id: string, label: string } } | { ok: false, validationMessage: string }}
     */
    createHabit(input) {
      const check = validateName(input?.name ?? "");
      if (!check.ok) {
        return { ok: false, validationMessage: check.errorMessage };
      }

      const trimmed = String(input?.name ?? "").trim();
      const habits = loadHabits();
      const habit = { id: newHabitId(), label: trimmed };
      habits.push(habit);
      saveHabits(habits);
      return { ok: true, habit };
    },

    listHabits() {
      return [...loadHabits()];
    },

    /**
     * @param {string} habitId
     */
    removeHabit(habitId) {
      const habits = loadHabits().filter((h) => h.id !== habitId);
      saveHabits(habits);
      const comps = loadCompletions();
      if (comps[habitId]) {
        delete comps[habitId];
        saveCompletions(comps);
      }
    },

    /**
     * @param {string} habitId
     * @param {string} dateISO
     */
    isCompleted(habitId, dateISO) {
      const comps = loadCompletions();
      const dates = comps[habitId] ?? [];
      return dates.includes(dateISO);
    },

    /**
     * @param {string} habitId
     * @param {string} dateISO
     * @param {boolean} completed
     * @returns {{ ok: boolean }}
     */
    setCompletion(habitId, dateISO, completed) {
      const habits = loadHabits();
      if (!habits.some((h) => h.id === habitId)) {
        return { ok: false };
      }

      const today = todayISO();
      const range = weekRangeContainingUTC(today);

      if (compareISODate(dateISO, range.startISO) < 0 || compareISODate(dateISO, range.endISO) > 0) {
        return { ok: false };
      }
      if (compareISODate(dateISO, today) > 0) {
        return { ok: false };
      }

      const comps = { ...loadCompletions() };
      const set = new Set(comps[habitId] ?? []);
      if (completed) {
        set.add(dateISO);
      } else {
        set.delete(dateISO);
      }
      comps[habitId] = [...set].sort(compareISODate);
      saveCompletions(comps);
      return { ok: true };
    },

    getWeeklyProgress() {
      const today = todayISO();
      const weekRange = weekRangeContainingUTC(today);
      const weekDays = expandWeekDays(weekRange.startISO);
      const habits = loadHabits();
      const comps = loadCompletions();

      if (habits.length === 0) {
        return {
          weekRange,
          rows: [],
          emptyStateMessage: "Add a habit to start tracking your week.",
        };
      }

      const rows = habits.map((h) => ({
        habitId: h.id,
        habitLabel: h.label,
        byDay: weekDays.map((dateISO) => ({
          dateISO,
          completed: (comps[h.id] ?? []).includes(dateISO),
        })),
      }));

      return { weekRange, rows };
    },
  };
}
