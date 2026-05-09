/**
 * Session-only feeding record (persisted only in React state).
 *
 * Shape:
 * - `id`: stable list key / insertion ordinal for this session
 * - `fedAt`: feeding time as ISO UTC string (from validated datetime-local input)
 * - `foodGiven`, `foodReceived`: trimmed strings from the form
 * - `likedAmount`: rating 1–5
 *
 * @typedef {{ id: number, fedAt: string, foodGiven: string, foodReceived: string, likedAmount: number }} FeedingRecord
 */

/**
 * Builds fields to persist from validated form values (pure, deterministic for a given payload).
 *
 * @param {{ fedAt: string, foodGiven: string, foodReceived: string, likedAmount: string }} values
 * @returns {Omit<FeedingRecord, 'id'>}
 */
export function createFeedingRecord(values) {
  return {
    fedAt: new Date(values.fedAt).toISOString(),
    foodGiven: values.foodGiven,
    foodReceived: values.foodReceived,
    likedAmount: Number(values.likedAmount),
  };
}

/** Immutable append; assigns id by insertion index; preserves save order (oldest first). */
export function appendFeedingEntry(entries, entry) {
  const id = entries.length;
  return [...entries, { ...entry, id }];
}
