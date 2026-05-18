/**
 * QA adversarial tests — edge cases, malformed input, storage tampering, SQL safety.
 * Does not duplicate acceptance AC-* coverage in acceptance.test.js.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createMemoryStorage } from "./helpers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CURRICULUM_JSON = join(ROOT, "data", "curriculum.json");
const SEED_SQL = join(ROOT, "data", "seed.sql");
const STORAGE_KEY = "sql-lern-app-progress-v1";

describe("QA — progress store adversarial", () => {
  /** @type {typeof import("../src/progressStore.js").createProgressStore} */
  let createProgressStore;

  beforeAll(async () => {
    const mod = await import("../src/progressStore.js");
    createProgressStore = mod.createProgressStore;
  });

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  /** @type {ReturnType<typeof createMemoryStorage>} */
  let storage;

  it("rejects persisted state when completedUnits contains non-string ids", () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        completedUnits: [123, null, { id: "x" }],
        lastUnitId: "concept-intro",
      }),
    );
    const loaded = createProgressStore(storage).load();
    expect(loaded).toBeNull();
  });

  it("rejects version numbers other than 1", () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        completedUnits: [],
        lastUnitId: "concept-intro",
      }),
    );
    expect(createProgressStore(storage).load()).toBeNull();
  });

  it("round-trips save then load without validating shape on save (tamper via save API)", () => {
    const store = createProgressStore(storage);
    store.save({
      version: 1,
      completedUnits: ["not-a-real-unit-id"],
      lastUnitId: "also-fake",
    });
    const loaded = store.load();
    expect(loaded).not.toBeNull();
    expect(loaded.completedUnits).toContain("not-a-real-unit-id");
  });

  it("survives rapid concurrent save/load without throwing", async () => {
    const store = createProgressStore(storage);
    const state = {
      version: 1,
      completedUnits: ["concept-intro"],
      lastUnitId: "lesson-select-1",
    };
    await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        Promise.resolve().then(() => {
          store.save({
            ...state,
            completedUnits: [`unit-${i % 3}`],
          });
          store.load();
        }),
      ),
    );
    expect(() => store.load()).not.toThrow();
  });

  it("handles localStorage quota exhaustion on save", () => {
    const quotaStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("QuotaExceededError");
      },
    };
    const result = createProgressStore(quotaStorage).save({
      version: 1,
      completedUnits: [],
      lastUnitId: "x",
    });
    expect(result.ok).toBe(false);
  });
});

describe("QA — resume and path tampering", () => {
  /** @type {import("../src/curriculum.js").Curriculum} */
  let curriculum;
  /** @type {typeof import("../app.js").resumeFromStorage} */
  let resumeFromStorage;
  /** @type {ReturnType<typeof import("../src/pathController.js").createPathController>} */
  let path;
  let ordered;

  beforeAll(async () => {
    const { loadCurriculum } = await import("../src/curriculum.js");
    const appMod = await import("../app.js");
    const { createPathController } = await import("../src/pathController.js");
    const { createLessonProgress } = await import("../src/lessonProgress.js");
    curriculum = loadCurriculum(readFileSync(CURRICULUM_JSON, "utf8"));
    resumeFromStorage = appMod.resumeFromStorage;
    ordered = [...curriculum.units].sort((a, b) => a.order - b.order);
    path = createPathController(curriculum, createLessonProgress());
  });

  it("does not unlock units when storage lists a far-ahead unit without prerequisites", () => {
    const farLesson = ordered.filter((u) => u.type === "lesson").at(-1);
    expect(farLesson).toBeTruthy();
    const storage = createMemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        completedUnits: [farLesson.id],
        lastUnitId: farLesson.id,
      }),
    );
    const resume = resumeFromStorage(curriculum, storage);
    expect(path.isUnlocked(farLesson.id)).toBe(false);
    expect(resume.locked).toBe(true);
  });

  it("marks path-map complete for tampered lesson id even when lesson remains locked", async () => {
    const farLesson = ordered.filter((u) => u.type === "lesson").at(-1);
    const storage = createMemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        completedUnits: [farLesson.id],
        lastUnitId: ordered[0].id,
      }),
    );
    resumeFromStorage(curriculum, storage);
    const { createPathController } = await import("../src/pathController.js");
    const { createLessonProgress } = await import("../src/lessonProgress.js");
    const lp = createLessonProgress();
    const p = createPathController(curriculum, lp);
    p.hydratePassed([farLesson.id]);
    const complete = new Set([farLesson.id]);
    const isComplete = (id) => complete.has(id);
    const isLocked = (unit) => {
      if (!p.isUnlocked(unit.id)) return true;
      if (unit.type === "lesson") {
        return !lp.canAccessLesson(
          unit,
          ordered.filter((u) => u.type === "lesson"),
        );
      }
      return false;
    };
    expect(isComplete(farLesson.id)).toBe(true);
    expect(isLocked(farLesson)).toBe(true);
  });
});

describe("QA — sql runner safety and malformed queries", () => {
  /** @type {typeof import("../src/sqlRunner.js").createSqlRunner} */
  let createSqlRunner;

  beforeAll(async () => {
    const mod = await import("../src/sqlRunner.js");
    createSqlRunner = mod.createSqlRunner;
  });

  it("rejects non-SELECT statements", async () => {
    const runner = await createSqlRunner({
      seedSql: readFileSync(SEED_SQL, "utf8"),
    });
    const destructive = await runner.runQuery("DELETE FROM schueler");
    expect(destructive.ok).toBe(false);
    expect(destructive.error).toMatch(/SELECT/i);
  });

  it("rejects INSERT and DDL even when prefixed with whitespace", async () => {
    const runner = await createSqlRunner({
      seedSql: readFileSync(SEED_SQL, "utf8"),
    });
    const insert = await runner.runQuery("  INSERT INTO schueler (name) VALUES ('x')");
    expect(insert.ok).toBe(false);
    const ddl = await runner.runQuery("\nDROP TABLE schueler");
    expect(ddl.ok).toBe(false);
  });

  it("rejects empty and whitespace-only queries", async () => {
    const runner = await createSqlRunner({
      seedSql: readFileSync(SEED_SQL, "utf8"),
    });
    expect((await runner.runQuery("")).ok).toBe(false);
    expect((await runner.runQuery("   \n\t  ")).ok).toBe(false);
  });

  it("rejects queries whose trimmed text does not start with SELECT (including line comments)", async () => {
    const runner = await createSqlRunner({
      seedSql: readFileSync(SEED_SQL, "utf8"),
    });
    const commented = await runner.runQuery("-- Tipp\nSELECT 1");
    expect(commented.ok).toBe(false);
    expect(commented.error).toMatch(/SELECT/i);
    const onlyComment = await runner.runQuery("-- SELECT 1");
    expect(onlyComment.ok).toBe(false);
  });

  it("allows only the first statement when multiple SELECTs are chained with semicolons", async () => {
    const runner = await createSqlRunner({
      seedSql: readFileSync(SEED_SQL, "utf8"),
    });
    const multi = await runner.runQuery("SELECT 1 AS a; SELECT 2 AS b");
    expect(multi.ok).toBe(true);
    expect(multi.rows).toEqual([{ a: 1 }]);
  });

  it("returns syntax errors for malformed SELECT without throwing", async () => {
    const runner = await createSqlRunner({
      seedSql: readFileSync(SEED_SQL, "utf8"),
    });
    const bad = await runner.runQuery("SELECT FROM");
    expect(bad.ok).toBe(false);
    expect(bad.error).toBeTruthy();
  });
});

describe("QA — exercise engine edge cases", () => {
  /** @type {typeof import("../src/exerciseEngine.js").normalizeResultRows} */
  let normalizeResultRows;
  /** @type {typeof import("../src/exerciseEngine.js").resultSetsEqual} */
  let resultSetsEqual;
  /** @type {typeof import("../src/exerciseEngine.js").gradeSqlExerciseAsync} */
  let gradeSqlExerciseAsync;
  let sqlExercise;

  beforeAll(async () => {
    const engine = await import("../src/exerciseEngine.js");
    const { loadCurriculum } = await import("../src/curriculum.js");
    normalizeResultRows = engine.normalizeResultRows;
    resultSetsEqual = engine.resultSetsEqual;
    gradeSqlExerciseAsync = engine.gradeSqlExerciseAsync;
    const curriculum = loadCurriculum(readFileSync(CURRICULUM_JSON, "utf8"));
    sqlExercise = curriculum.units.find(
      (u) => u.type === "exercise" && u.format === "sql",
    );
  });

  it("normalizeResultRows handles nullish and non-object rows safely", () => {
    expect(normalizeResultRows(undefined)).toEqual([]);
    expect(normalizeResultRows([null, "x", [1, 2]])).toHaveLength(3);
  });

  it("resultSetsEqual treats column names case-insensitively", () => {
    const a = [{ Name: "Anna" }];
    const b = [{ name: "Anna" }];
    expect(resultSetsEqual(a, b)).toBe(true);
  });

  it("resultSetsEqual does not equate numeric and string forms of the same value", () => {
    const a = [{ cnt: 5 }];
    const b = [{ cnt: "5" }];
    expect(resultSetsEqual(a, b)).toBe(false);
  });

  it("gradeSqlExerciseAsync fails closed when runSql is missing", async () => {
    const result = await gradeSqlExerciseAsync(
      sqlExercise,
      { sql: "SELECT 1" },
      { lessonsComplete: () => true },
    );
    expect(result.ok).toBe(false);
  });

  it("gradeSqlExerciseAsync rejects semantically wrong SQL with correct-looking whitespace", async () => {
    const { createSqlRunner } = await import("../src/sqlRunner.js");
    const runner = await createSqlRunner({
      seedSql: readFileSync(SEED_SQL, "utf8"),
    });
    const wrong = await gradeSqlExerciseAsync(
      sqlExercise,
      { sql: "SELECT * FROM kurse" },
      {
        lessonsComplete: () => true,
        runSql: (q) => runner.runQuery(q),
      },
    );
    expect(wrong.ok).toBe(false);
  });
});

describe("QA — curriculum loader fuzz", () => {
  /** @type {typeof import("../src/curriculum.js").loadCurriculum} */
  let loadCurriculum;

  beforeAll(async () => {
    const mod = await import("../src/curriculum.js");
    loadCurriculum = mod.loadCurriculum;
  });

  it("throws on JSON with duplicate unit ids", () => {
    const base = loadCurriculum(readFileSync(CURRICULUM_JSON, "utf8"));
    const broken = structuredClone(base);
    const first = broken.units[0];
    broken.units.push({ ...first, order: 9999 });
    expect(() => loadCurriculum(broken)).toThrow(/duplicate/i);
  });

  it("throws when exercise difficulty decreases along order", () => {
    const base = loadCurriculum(readFileSync(CURRICULUM_JSON, "utf8"));
    const broken = structuredClone(base);
    const exercises = broken.units
      .filter((u) => u.type === "exercise")
      .sort((a, b) => b.order - a.order);
    if (exercises.length >= 2) {
      exercises[0].difficulty = 1;
      exercises[1].difficulty = 99;
    }
    expect(() => loadCurriculum(broken)).toThrow(/difficulty/i);
  });
});
