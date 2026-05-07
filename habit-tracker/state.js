/**
 * Central app state serialization hooks for the habit tracker UI bootstrap.
 *
 * Mirrors the persisted envelope in `storage.js` (same field names as the blob).
 */

import { emptyAppData } from "./storage.js";

/**
 * @returns {{ habits: never[], completions: Record<string, never> }}
 */
export function createInitialInMemoryEnvelope() {
  const { habits, completions } = emptyAppData();
  return { habits, completions };
}

/**
 * @param {{ habits: unknown[], completions: Record<string, string[]> }} envelope
 */
export function toPersistable(envelope) {
  return {
    version: 1,
    habits: envelope.habits,
    completions: envelope.completions,
  };
}
