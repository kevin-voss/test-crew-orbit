import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_SQL = join(__dirname, "..", "data", "seed.sql");

describe("sql runner", () => {
  /** @type {typeof import("../src/sqlRunner.js")} */
  let createSqlRunner;

  beforeAll(async () => {
    const mod = await import("../src/sqlRunner.js");
    createSqlRunner = mod.createSqlRunner;
  });

  it("initializes the seeded Schule database from seed.sql (AC-8)", async () => {
    // covers AC-8
    const seed = readFileSync(SEED_SQL, "utf8");
    const runner = await createSqlRunner({ seedSql: seed });
    const tables = await runner.listTables();
    expect(tables.map((t) => t.toLowerCase())).toEqual(
      expect.arrayContaining(["schueler", "kurse", "noten"]),
    );
  });

  it("executes learner SELECT queries and returns row sets (AC-13)", async () => {
    // covers AC-13
    const seed = readFileSync(SEED_SQL, "utf8");
    const runner = await createSqlRunner({ seedSql: seed });
    const result = await runner.runQuery("SELECT name FROM schueler LIMIT 1");
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.rows)).toBe(true);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it("compares normalized result sets for SQL exercise grading (AC-13)", async () => {
    // covers AC-13
    const seed = readFileSync(SEED_SQL, "utf8");
    const runner = await createSqlRunner({ seedSql: seed });
    const actual = await runner.runQuery("SELECT COUNT(*) AS cnt FROM schueler");
    const expected = await runner.runQuery("SELECT COUNT(*) AS cnt FROM schueler");
    expect(runner.resultSetsEqual(actual.rows, expected.rows)).toBe(true);
  });
});
