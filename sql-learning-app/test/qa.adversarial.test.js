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

  it("throws on invalid JSON string input", () => {
    expect(() => loadCurriculum("{not-json")).toThrow();
  });
});

describe("QA — path controller bypass attempts", () => {
  /** @type {import("../src/curriculum.js").Curriculum} */
  let curriculum;
  let ordered;

  beforeAll(async () => {
    const { loadCurriculum } = await import("../src/curriculum.js");
    curriculum = loadCurriculum(readFileSync(CURRICULUM_JSON, "utf8"));
    ordered = [...curriculum.units].sort((a, b) => a.order - b.order);
  });

  beforeEach(async () => {
    const { createPathController } = await import("../src/pathController.js");
    const { createLessonProgress } = await import("../src/lessonProgress.js");
    path = createPathController(curriculum, createLessonProgress());
  });

  /** @type {ReturnType<typeof import("../src/pathController.js").createPathController>} */
  let path;

  it("recordSuccess on a locked unit does not unlock that unit or skip prerequisites", () => {
    const last = ordered.at(-1);
    expect(path.isUnlocked(last.id)).toBe(false);
    path.recordSuccess(last.id);
    expect(path.isUnlocked(last.id)).toBe(false);
    expect(path.tryNavigate(last.id).allowed).toBe(false);
  });

  it("hydratePassed ignores unknown unit ids without throwing", () => {
    expect(() => path.hydratePassed(["__no_such_unit__"])).not.toThrow();
    expect(path.isUnitPassed("__no_such_unit__")).toBe(false);
  });
});

describe("QA — progress store boundary values", () => {
  /** @type {typeof import("../src/progressStore.js").createProgressStore} */
  let createProgressStore;

  beforeAll(async () => {
    const mod = await import("../src/progressStore.js");
    createProgressStore = mod.createProgressStore;
  });

  it("rejects null or missing lastUnitId", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        completedUnits: [],
        lastUnitId: null,
      }),
    );
    expect(createProgressStore(storage).load()).toBeNull();
  });

  it("accepts empty-string unit ids in completedUnits (storage shape only)", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        completedUnits: [""],
        lastUnitId: "concept-intro",
      }),
    );
    const loaded = createProgressStore(storage).load();
    expect(loaded?.completedUnits).toEqual([""]);
  });

  it("handles very large completedUnits arrays without throwing on load", () => {
    const storage = createMemoryStorage();
    const huge = Array.from({ length: 5000 }, (_, i) => `phantom-${i}`);
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        completedUnits: huge,
        lastUnitId: "concept-intro",
      }),
    );
    expect(() => createProgressStore(storage).load()).not.toThrow();
  });
});

describe("QA — sql runner advanced injection patterns", () => {
  /** @type {typeof import("../src/sqlRunner.js").createSqlRunner} */
  let createSqlRunner;

  beforeAll(async () => {
    const mod = await import("../src/sqlRunner.js");
    createSqlRunner = mod.createSqlRunner;
  });

  it("allows UNION queries that start with SELECT", async () => {
    const runner = await createSqlRunner({
      seedSql: readFileSync(SEED_SQL, "utf8"),
    });
    const union = await runner.runQuery("SELECT 1 AS a UNION SELECT 2 AS a");
    expect(union.ok).toBe(true);
    expect(union.rows?.length).toBeGreaterThan(0);
  });

  it("rejects WITH/CTE queries even though they begin with WITH (sql.js exec path)", async () => {
    const runner = await createSqlRunner({
      seedSql: readFileSync(SEED_SQL, "utf8"),
    });
    const cte = await runner.runQuery(
      "WITH t AS (SELECT 1 AS x) SELECT x FROM t",
    );
    expect(cte.ok).toBe(false);
    expect(cte.error).toBeTruthy();
  });

  it("accepts UTF-8 BOM before SELECT (common paste from editors)", async () => {
    const runner = await createSqlRunner({
      seedSql: readFileSync(SEED_SQL, "utf8"),
    });
    const bom = await runner.runQuery("\uFEFFSELECT 1");
    expect(bom.ok).toBe(true);
  });

  it("does not execute a second destructive statement after semicolon", async () => {
    const runner = await createSqlRunner({
      seedSql: readFileSync(SEED_SQL, "utf8"),
    });
    const before = await runner.runQuery("SELECT COUNT(*) AS c FROM schueler");
    expect(before.ok).toBe(true);
    const chained = await runner.runQuery(
      "SELECT 1 AS ok; DELETE FROM schueler",
    );
    expect(chained.ok).toBe(true);
    const after = await runner.runQuery("SELECT COUNT(*) AS c FROM schueler");
    expect(after.ok).toBe(true);
    expect(after.rows?.[0]?.c).toBe(before.rows?.[0]?.c);
  });
});

describe("QA — exercise grading malformed answers", () => {
  /** @type {typeof import("../src/exerciseEngine.js").gradeExercise} */
  let gradeExercise;
  let mcExercise;

  beforeAll(async () => {
    const engine = await import("../src/exerciseEngine.js");
    const { loadCurriculum } = await import("../src/curriculum.js");
    gradeExercise = engine.gradeExercise;
    const curriculum = loadCurriculum(readFileSync(CURRICULUM_JSON, "utf8"));
    mcExercise = curriculum.units.find(
      (u) => u.type === "exercise" && u.format === "mc",
    );
  });

  it("fails closed on undefined, empty, or unknown optionId", () => {
    const ctx = { lessonsComplete: () => true };
    expect(gradeExercise(mcExercise, {}, ctx).ok).toBe(false);
    expect(gradeExercise(mcExercise, { optionId: "" }, ctx).ok).toBe(false);
    expect(
      gradeExercise(mcExercise, { optionId: "not-in-options" }, ctx).ok,
    ).toBe(false);
  });

  it("match-format exercises still grade via optionId only (no pairing validation)", async () => {
    const { loadCurriculum } = await import("../src/curriculum.js");
    const curriculum = loadCurriculum(readFileSync(CURRICULUM_JSON, "utf8"));
    const matchEx = curriculum.units.find(
      (u) => u.type === "exercise" && u.format === "match",
    );
    const ctx = { lessonsComplete: () => true };
    const wrong = gradeExercise(matchEx, { optionId: "b" }, ctx);
    expect(wrong.ok).toBe(false);
    const right = gradeExercise(
      matchEx,
      { optionId: matchEx.correctOptionId },
      ctx,
    );
    expect(right.ok).toBe(true);
  });
});

describe("QA — sql runner string-literal and churn", () => {
  /** @type {typeof import("../src/sqlRunner.js").createSqlRunner} */
  let createSqlRunner;

  beforeAll(async () => {
    const mod = await import("../src/sqlRunner.js");
    createSqlRunner = mod.createSqlRunner;
  });

  it("does not split on semicolons inside single-quoted string literals", async () => {
    const runner = await createSqlRunner({
      seedSql: readFileSync(SEED_SQL, "utf8"),
    });
    const before = await runner.runQuery("SELECT COUNT(*) AS c FROM schueler");
    const chained = await runner.runQuery(
      "SELECT * FROM schueler WHERE name = 'a;b'; DELETE FROM schueler",
    );
    const after = await runner.runQuery("SELECT COUNT(*) AS c FROM schueler");
    expect(chained.ok).toBe(true);
    expect(after.rows?.[0]?.c).toBe(before.rows?.[0]?.c);
  });

  it("does not treat SQL doubled-single-quote escapes as string terminators before semicolon", async () => {
    const runner = await createSqlRunner({
      seedSql: readFileSync(SEED_SQL, "utf8"),
    });
    const before = await runner.runQuery("SELECT COUNT(*) AS c FROM schueler");
    const chained = await runner.runQuery(
      "SELECT 'it''s; marker' AS x; DELETE FROM schueler",
    );
    const after = await runner.runQuery("SELECT COUNT(*) AS c FROM schueler");
    expect(chained.ok).toBe(true);
    expect(after.rows?.[0]?.c).toBe(before.rows?.[0]?.c);
  });

  it("does not split on semicolons inside double-quoted string literals", async () => {
    const runner = await createSqlRunner({
      seedSql: readFileSync(SEED_SQL, "utf8"),
    });
    const before = await runner.runQuery("SELECT COUNT(*) AS c FROM schueler");
    const chained = await runner.runQuery(
      'SELECT * FROM schueler WHERE name = "a;b"; DELETE FROM schueler',
    );
    const after = await runner.runQuery("SELECT COUNT(*) AS c FROM schueler");
    expect(chained.ok).toBe(true);
    expect(after.rows?.[0]?.c).toBe(before.rows?.[0]?.c);
  });

  it("does not execute DELETE when semicolon appears inside a block comment", async () => {
    const runner = await createSqlRunner({
      seedSql: readFileSync(SEED_SQL, "utf8"),
    });
    const before = await runner.runQuery("SELECT COUNT(*) AS c FROM schueler");
    const chained = await runner.runQuery(
      "SELECT 1 /* ; */ ; DELETE FROM schueler",
    );
    const after = await runner.runQuery("SELECT COUNT(*) AS c FROM schueler");
    expect(chained.ok).toBe(false);
    expect(after.rows?.[0]?.c).toBe(before.rows?.[0]?.c);
  });

  it("handles many sequential runQuery calls on one runner without throwing", async () => {
    const runner = await createSqlRunner({
      seedSql: readFileSync(SEED_SQL, "utf8"),
    });
    const results = await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        runner.runQuery(`SELECT ${i} AS n`),
      ),
    );
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it("returns a structured error for very long malformed SELECT without throwing", async () => {
    const runner = await createSqlRunner({
      seedSql: readFileSync(SEED_SQL, "utf8"),
    });
    const huge = `SELECT ${"x".repeat(120_000)}`;
    expect(() => runner.runQuery(huge)).not.toThrow();
    const result = await runner.runQuery(huge);
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("QA — progress store load hygiene", () => {
  /** @type {typeof import("../src/progressStore.js").createProgressStore} */
  let createProgressStore;

  beforeAll(async () => {
    const mod = await import("../src/progressStore.js");
    createProgressStore = mod.createProgressStore;
  });

  it("clears corrupt storage key after invalid JSON load", () => {
    const storage = createMemoryStorage();
    storage.setItem(STORAGE_KEY, "{not-json");
    expect(createProgressStore(storage).load()).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("rejects stringified version numbers in persisted JSON", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: "1",
        completedUnits: [],
        lastUnitId: "concept-intro",
      }),
    );
    expect(createProgressStore(storage).load()).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("QA — resume edge cases", () => {
  /** @type {import("../src/curriculum.js").Curriculum} */
  let curriculum;
  /** @type {typeof import("../app.js").resumeFromStorage} */
  let resumeFromStorage;
  /** @type {typeof import("../src/pathController.js").createPathController} */
  let createPathController;
  /** @type {typeof import("../src/lessonProgress.js").createLessonProgress} */
  let createLessonProgress;

  beforeAll(async () => {
    const { loadCurriculum } = await import("../src/curriculum.js");
    const appMod = await import("../app.js");
    const pathMod = await import("../src/pathController.js");
    const lessonMod = await import("../src/lessonProgress.js");
    curriculum = loadCurriculum(readFileSync(CURRICULUM_JSON, "utf8"));
    resumeFromStorage = appMod.resumeFromStorage;
    createPathController = pathMod.createPathController;
    createLessonProgress = lessonMod.createLessonProgress;
  });

  it("resumeFromStorage with whitespace-only lastUnitId falls back to first unlockable unit", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        completedUnits: [],
        lastUnitId: "   ",
      }),
    );
    const ordered = [...curriculum.units].sort((a, b) => a.order - b.order);
    const resume = resumeFromStorage(curriculum, storage);
    expect(resume.unitId).toBe(ordered[0].id);
  });

  it("resumeFromStorage does not unlock exercises when only exercise id is tampered into storage", () => {
    const sqlEx = curriculum.units.find(
      (u) => u.type === "exercise" && u.format === "sql",
    );
    expect(sqlEx).toBeTruthy();
    const storage = createMemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        completedUnits: [sqlEx.id],
        lastUnitId: sqlEx.id,
      }),
    );
    const resume = resumeFromStorage(curriculum, storage);
    const path = createPathController(curriculum, createLessonProgress());
    path.hydratePassed([sqlEx.id]);
    expect(path.isUnlocked(sqlEx.id)).toBe(false);
    expect(path.canStartExercise(sqlEx.id)).toBe(false);
    expect(resume.unitId).not.toBe(sqlEx.id);
  });
});

describe("QA — app path completion integrity", () => {
  /** @type {typeof import("../app.js").isPathComplete} */
  let isPathComplete;
  /** @type {import("../src/curriculum.js").Curriculum} */
  let curriculum;

  beforeAll(async () => {
    const appMod = await import("../app.js");
    const { loadCurriculum } = await import("../src/curriculum.js");
    isPathComplete = appMod.isPathComplete;
    curriculum = loadCurriculum(readFileSync(CURRICULUM_JSON, "utf8"));
  });

  it("isPathComplete is false when only concept id is marked complete", () => {
    const concept = curriculum.units.find((u) => u.type === "concept");
    expect(isPathComplete(curriculum, [concept.id])).toBe(false);
  });

  it("isPathComplete is false when storage lists unknown phantom ids only", () => {
    expect(isPathComplete(curriculum, ["phantom-unit-9999"])).toBe(false);
  });
});
