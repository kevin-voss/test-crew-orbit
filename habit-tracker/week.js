/**
 * Local timezone week helpers (Monday–Sunday, civil calendar).
 * Per spec: use `localDateKey` for all YYYY-MM-DD keys to avoid UTC off-by-one.
 */

/**
 * @param {Date} d
 * @returns {string} YYYY-MM-DD in the local calendar
 */
export function localDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Lexicographic order matches chronological order for YYYY-MM-DD.
 * @param {string} a
 * @param {string} b
 */
export function compareISODate(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Monday = 0 .. Sunday = 6 for the local calendar date of `dateKey`.
 * @param {string} dateKey YYYY-MM-DD
 */
export function mondayOffsetLocalDateKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dow = new Date(y, (m ?? 1) - 1, d ?? 1).getDay(); // Sun=0..Sat=6
  return dow === 0 ? 6 : dow - 1;
}

/**
 * Monday–Sunday range (inclusive) containing `dateKey`, using local civil dates.
 * @param {string} dateKey YYYY-MM-DD
 * @returns {{ startISO: string, endISO: string }}
 */
export function getWeekRangeContainingDateKey(dateKey) {
  const off = mondayOffsetLocalDateKey(dateKey);
  const [y, m, d] = dateKey.split("-").map(Number);
  const ref = new Date(y, (m ?? 1) - 1, d ?? 1);
  const mon = new Date(ref);
  mon.setDate(mon.getDate() - off);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  return { startISO: localDateKey(mon), endISO: localDateKey(sun) };
}

/** @alias getWeekRangeContainingDateKey — name from spec/step 04 */
export function getWeekRange(referenceDateKey) {
  return getWeekRangeContainingDateKey(referenceDateKey);
}

/**
 * @param {string} startISO Monday YYYY-MM-DD
 * @returns {string[]} seven local calendar keys Mon..Sun
 */
export function expandWeekDaysFromMonday(startISO) {
  const [y, m, d] = startISO.split("-").map(Number);
  /** @type {string[]} */
  const out = [];
  let cur = new Date(y, (m ?? 1) - 1, d ?? 1);
  for (let i = 0; i < 7; i++) {
    out.push(localDateKey(cur));
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
  }
  return out;
}

/**
 * @param {string} dateKey
 * @param {{ startISO: string, endISO: string }} weekRange
 */
export function isDateInWeek(dateKey, weekRange) {
  return (
    compareISODate(dateKey, weekRange.startISO) >= 0 &&
    compareISODate(dateKey, weekRange.endISO) <= 0
  );
}

/**
 * User may toggle only today and earlier days within the Monday–Sunday week that contains today.
 * @param {string} dateKey candidate day
 * @param {string} todayKey reviewer "today" (injected clock in tests / localDateKey(new Date()) in UI)
 */
export function isEligibleForToggle(dateKey, todayKey) {
  const range = getWeekRangeContainingDateKey(todayKey);
  if (
    compareISODate(dateKey, range.startISO) < 0 ||
    compareISODate(dateKey, range.endISO) > 0
  ) {
    return false;
  }
  return compareISODate(dateKey, todayKey) <= 0;
}
