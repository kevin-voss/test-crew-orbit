/**
 * Habit domain: validation and pure list helpers.
 *
 * IDs: `crypto.randomUUID()` when available; otherwise a time-random string.
 */

/** @returns {string} */
export function newHabitId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return /* fallback */ `hb-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * @param {unknown} name
 * @returns {{ ok: true } | { ok: false, errorMessage: string }}
 */
export function validateName(name) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) {
    return { ok: false, errorMessage: "Enter a habit name." };
  }
  const codePointCount = [...trimmed].length;
  if (codePointCount > 120) {
    return {
      ok: false,
      errorMessage: "Habit name must be at most 120 characters.",
    };
  }
  return { ok: true };
}

/**
 * @param {Array<{ id: string, label: string }>} currentHabits
 * @param {unknown} rawName
 * @returns {{ ok: true, habit: { id: string, label: string }, habits: typeof currentHabits } | { ok: false, errorMessage: string }}
 */
export function createHabit(currentHabits, rawName) {
  const check = validateName(rawName);
  if (!check.ok) {
    return { ok: false, errorMessage: check.errorMessage };
  }
  const trimmed = String(rawName ?? "").trim();
  const habit = { id: newHabitId(), label: trimmed };
  const habits = [...currentHabits, habit];
  return { ok: true, habit, habits };
}

/**
 * @param {Array<{ id: string, label: string }>} habits
 * @param {string} habitId
 */
export function removeHabit(habits, habitId) {
  return habits.filter((h) => h.id !== habitId);
}

/**
 * @param {Array<{ id: string, label: string }>} habits
 */
export function listHabits(habits) {
  return [...habits];
}
