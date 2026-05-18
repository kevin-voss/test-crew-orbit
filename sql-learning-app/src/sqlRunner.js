import initSqlJs from "sql.js";

/**
 * @param {{ seedSql: string }} options
 */
export async function createSqlRunner({ seedSql }) {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(seedSql);

  return {
    async listTables() {
      const result = db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      );
      if (!result.length) return [];
      return result[0].values.map((row) => String(row[0]));
    },

    /**
     * @param {string} sql
     */
    async runQuery(sql) {
      try {
        const trimmed = sql.trim();
        if (!/^select\b/i.test(trimmed)) {
          return { ok: false, error: "Nur SELECT-Abfragen sind erlaubt." };
        }
        const result = db.exec(trimmed);
        if (!result.length) {
          return { ok: true, rows: [] };
        }
        const { columns, values } = result[0];
        const rows = values.map((row) => {
          /** @type {Record<string, unknown>} */
          const obj = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
        return { ok: true, rows };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },

    /**
     * @param {unknown[] | undefined} a
     * @param {unknown[] | undefined} b
     */
    resultSetsEqual(a, b) {
      return (
        JSON.stringify(normalizeRows(a)) === JSON.stringify(normalizeRows(b))
      );
    },
  };
}

/** @param {unknown[] | undefined} rows */
function normalizeRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    if (row && typeof row === "object") {
      return Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]),
      );
    }
    return row;
  });
}
