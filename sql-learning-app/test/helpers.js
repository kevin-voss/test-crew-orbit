/** @returns {{ getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void }} */
export function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

/** Canonical Schul-Curriculum topic ids (AC-5). */
export const CATALOG_TOPIC_IDS = [
  "tabellen-daten",
  "select",
  "where",
  "order-by",
  "count",
  "joins",
  "group-by",
  "having",
  "insert",
  "update",
];

/** German display labels for catalog topics (AC-5). */
export const CATALOG_TOPIC_LABELS = [
  "Tabellen und Daten",
  "SELECT",
  "WHERE",
  "ORDER BY",
  "COUNT",
  "JOINs",
  "GROUP BY",
  "HAVING",
  "INSERT",
  "UPDATE",
];

/** Jargon that must not appear without definition in beginner copy (AC-7). */
export const FORBIDDEN_UNEXPLAINED_JARGON = [
  /\bRDBMS\b/i,
  /\bnormalization\b/i,
  /\bNormalisierung\b/i,
  /\bACID\b/i,
  /\bNoSQL\b/i,
];
