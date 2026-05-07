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
 * @param {Record<string, string[]>} completions
 * @param {string} habitId
 * @param {string} dateKey
 */
export function isCompleted(completions, habitId, dateKey) {
  return (completions[habitId] ?? []).includes(dateKey);
}

/**
 * Toggle completion if the date is eligible (today or past within current review week).
 * Idempotent when `completed` is true and the date is already marked.
 *
 * @param {Record<string, string[]>} completions
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
  const set = new Set(comps[habitId] ?? []);
  if (completed) {
    set.add(dateKey);
  } else {
    set.delete(dateKey);
  }
  comps[habitId] = [...set].sort(compareISODate);
  return { ok: true, completions: comps };
}
