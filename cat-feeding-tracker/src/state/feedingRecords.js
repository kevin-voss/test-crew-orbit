/** Immutable append; preserves save order (oldest first). */
export function appendFeedingEntry(entries, entry) {
  return [...entries, entry];
}
