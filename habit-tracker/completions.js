/**
 * Completion map helpers: idempotent completes, eligibility, toggle off.
 *
 * Shape: `{ [habitId]: string[] }` sorted unique YYYY-MM-DD keys (`localDateKey` from week.js).
 */

import {
  compareISODate,
  getWeekRangeContainingDateKey,
} from "./week.js";

/**
 * Normalize persisted completion values to a list of date strings.
 * Arrays are filtered to strings only; a bare string is one calendar key (exact match in `isCompleted`).
 *
 * @param {Record<string, unknown>} completions
 * @param {string} habitId
 * @returns {string[]}
 */
function datesListForHabit(completions, habitId) {
  const raw = completions[habitId];
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((d) => typeof d === "string");
  }
  if (typeof raw === "string") {
    return raw === "" ? [] : [raw];
  }
  return [];
}

/**
 * @param {Record<string, unknown>} completions
 * @param {string} habitId
 * @param {string} dateKey
 */
export function isCompleted(completions, habitId, dateKey) {
  return datesListForHabit(completions, habitId).includes(dateKey);
}

/**
 * Toggle completion if the date is eligible (today or past within current review week).
 * Idempotent when `completed` is true and the date is already marked.
 *
 * @param {Record<string, unknown>} completions
 * @param {string} habitId
 * @param {string} dateKey YYYY-MM-DD (local calendar)
 * @param {boolean} completed
 * @param {{ todayKey: string }} ctx
 * @returns {{ ok: boolean, completions: Record<string, string[]> }}
 */
export function setToggle(completions, habitId, dateKey, completed, ctx) {
  const todayKey = ctx.todayKey;
  const range = getWeekRangeContainingDateKey(todayKey);

  if (
    compareISODate(dateKey, range.startISO) < 0 ||
    compareISODate(dateKey, range.endISO) > 0
  ) {
    return { ok: false, completions };
  }
  if (compareISODate(dateKey, todayKey) > 0) {
    return { ok: false, completions };
  }

  const comps = { ...completions };
  const set = new Set(datesListForHabit(comps, habitId));
  if (completed) {
    set.add(dateKey);
  } else {
    set.delete(dateKey);
  }
  comps[habitId] = [...set].sort(compareISODate);
  return { ok: true, completions: comps };
}
