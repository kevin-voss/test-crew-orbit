import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CURRICULUM_JSON = join(__dirname, "..", "data", "curriculum.json");

describe("exercise engine", () => {
  /** @type {typeof import("../src/exerciseEngine.js")} */
  let gradeExercise;
  /** @type {typeof import("../src/exerciseEngine.js")} */
  let getExerciseInputType;
  let curriculum;
  let mcExercise;
  let sqlExercise;

  beforeAll(async () => {
    const engine = await import("../src/exerciseEngine.js");
    const { loadCurriculum } = await import("../src/curriculum.js");
    gradeExercise = engine.gradeExercise;
    getExerciseInputType = engine.getExerciseInputType;
    curriculum = loadCurriculum(readFileSync(CURRICULUM_JSON, "utf8"));
    const exercises = curriculum.units
      .filter((u) => u.type === "exercise")
      .sort((a, b) => a.order - b.order);
    mcExercise = exercises.find((e) => e.format === "mc" || e.format === "match");
    sqlExercise = exercises.find((e) => e.format === "sql");
  });

  /** @type {{ lessonsComplete: (ids: string[]) => boolean }} */
  let ctx;

  beforeEach(() => {
    ctx = {
      lessonsComplete: (ids) => ids.every(() => true),
    };
  });

  it("blocks grading when linked lessons are incomplete (AC-11)", () => {
    // covers AC-11
    ctx.lessonsComplete = () => false;
    const result = gradeExercise(mcExercise, { optionId: mcExercise.correctOptionId }, ctx);
    expect(result.ok).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.message).toMatch(/Lektion|Schließe/i);
  });

  it("grades MC exercises only from unlocked lesson topics (AC-11)", () => {
    // covers AC-11
    ctx.lessonsComplete = (ids) => ids.length > 0;
    const wrong = gradeExercise(mcExercise, { optionId: "wrong-id" }, ctx);
    expect(wrong.ok).toBe(false);
    const right = gradeExercise(
      mcExercise,
      { optionId: mcExercise.correctOptionId },
      ctx,
    );
    expect(right.ok).toBe(true);
  });

  it("uses MC or matching input for difficulty tier at most 2 (AC-12)", () => {
    // covers AC-12
    const early = curriculum.units.filter(
      (u) => u.type === "exercise" && u.difficulty <= 2,
    );
    expect(early.length).toBeGreaterThan(0);
    for (const ex of early) {
      expect(getExerciseInputType(ex)).not.toBe("sql");
      expect(["mc", "match"]).toContain(getExerciseInputType(ex));
    }
  });

  it("allows SQL input for exercises at difficulty tier 3 or higher (AC-13)", () => {
    // covers AC-13
    expect(sqlExercise).toBeTruthy();
    expect(sqlExercise.difficulty).toBeGreaterThanOrEqual(3);
    expect(getExerciseInputType(sqlExercise)).toBe("sql");
  });

  it("shows constructive German feedback on incorrect MC answers (AC-14)", () => {
    // covers AC-14
    const result = gradeExercise(mcExercise, { optionId: "wrong-id" }, ctx);
    expect(result.ok).toBe(false);
    expect(result.feedback).toBe(mcExercise.feedbackWrong);
    expect(result.feedback).toMatch(/[äöüßÄÖÜ]|Schau|Versuche|Tipp|Lektion/i);
  });

  it("confirms success and enables progression on correct MC answers (AC-15)", () => {
    // covers AC-15
    const result = gradeExercise(
      mcExercise,
      { optionId: mcExercise.correctOptionId },
      ctx,
    );
    expect(result.ok).toBe(true);
    expect(result.feedback).toBe(mcExercise.feedbackCorrect);
    expect(result.canContinue).toBe(true);
  });
});
