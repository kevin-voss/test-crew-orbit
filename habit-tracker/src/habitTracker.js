import { newHabitId, validateName } from "../habits.js";
import { setToggle, isCompleted as isCompletedInMap } from "../completions.js";
import {
  expandWeekDaysFromMonday,
  getWeekRangeContainingDateKey,
  localDateKey,
} from "../week.js";

const STORAGE_KEYS = {
  habits: "habit-tracker:habits",
  completions: "habit-tracker:completions",
};

/**
 * @param {{ storage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void }; clock?: { todayISO: () => string } }} options
 */
export function createHabitTracker({ storage, clock } = {}) {
  if (!storage) {
    throw new TypeError("createHabitTracker requires { storage }");
  }

  const todayKey = () => clock?.todayISO?.() ?? localDateKey(new Date());

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
      return isCompletedInMap(loadCompletions(), habitId, dateISO);
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

      const { ok, completions: next } = setToggle(
        loadCompletions(),
        habitId,
        dateISO,
        completed,
        { todayKey: todayKey() },
      );
      if (!ok) return { ok: false };
      saveCompletions(next);
      return { ok: true };
    },

    getWeeklyProgress() {
      const today = todayKey();
      const weekRange = getWeekRangeContainingDateKey(today);
      const weekDays = expandWeekDaysFromMonday(weekRange.startISO);
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
          completed: isCompletedInMap(comps, h.id, dateISO),
        })),
      }));

      return { weekRange, rows };
    },
  };
}
