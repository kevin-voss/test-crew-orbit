import initSqlJs from "sql.js";
import {
  normalizeResultRows,
  resultSetsEqual as compareResultSets,
} from "./exerciseEngine.js";

/**
 * Returns the first SQL statement, stopping at an unquoted semicolon.
 * @param {string} sql
 */
function extractFirstStatement(sql) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (c === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (c === ";" && !inSingle && !inDouble) {
      return sql.slice(0, i).trim();
    }
  }
  return sql.trim();
}

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
        if (!trimmed) {
          return { ok: false, error: "Nur SELECT-Abfragen sind erlaubt." };
        }
        const firstStatement = extractFirstStatement(trimmed);
        if (!/^select\b/i.test(firstStatement)) {
          return { ok: false, error: "Nur SELECT-Abfragen sind erlaubt." };
        }
        const result = db.exec(firstStatement);
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
      return compareResultSets(a, b);
    },
  };
}

export { normalizeResultRows };
