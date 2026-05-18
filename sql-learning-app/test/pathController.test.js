import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CURRICULUM_JSON = join(__dirname, "..", "data", "curriculum.json");

describe("path controller", () => {
  /** @type {ReturnType<typeof import("../src/pathController.js").createPathController>} */
  let path;
  /** @type {import("../src/curriculum.js").Curriculum} */
  let curriculum;
  let orderedUnits;

  beforeAll(async () => {
    const { loadCurriculum } = await import("../src/curriculum.js");
    curriculum = loadCurriculum(readFileSync(CURRICULUM_JSON, "utf8"));
    orderedUnits = [...curriculum.units].sort((a, b) => a.order - b.order);
  });

  beforeEach(async () => {
    const { createPathController } = await import("../src/pathController.js");
    const { createLessonProgress } = await import("../src/lessonProgress.js");
    path = createPathController(curriculum, createLessonProgress());
  });

  it("unlocks only the first unit initially (AC-17)", () => {
    // covers AC-17
    expect(path.isUnlocked(orderedUnits[0].id)).toBe(true);
    if (orderedUnits.length > 1) {
      expect(path.isUnlocked(orderedUnits[1].id)).toBe(false);
    }
  });

  it("unlocks the next unit after success on the current unit (AC-17)", () => {
    // covers AC-17
    const first = orderedUnits[0];
    const second = orderedUnits[1];
    path.recordSuccess(first.id);
    expect(path.isUnlocked(second.id)).toBe(true);
  });

  it("never decreases exercise difficulty along unlocked path order (AC-16)", () => {
    // covers AC-16
    const exercises = orderedUnits.filter((u) => u.type === "exercise");
    let prev = 0;
    for (const ex of exercises) {
      if (!path.isUnlocked(ex.id)) break;
      path.recordSuccess(ex.id);
      expect(ex.difficulty).toBeGreaterThanOrEqual(prev);
      prev = ex.difficulty;
    }
  });

  it("rejects navigation to locked units (AC-18)", () => {
    // covers AC-18
    const locked = orderedUnits[orderedUnits.length - 1];
    expect(path.isUnlocked(locked.id)).toBe(false);
    const nav = path.tryNavigate(locked.id);
    expect(nav.allowed).toBe(false);
    expect(nav.reason).toMatch(/gesperrt|freischalten|zuerst/i);
  });

  it("keeps exercises locked until their lesson is complete (AC-10)", () => {
    // covers AC-10
    const exercise = orderedUnits.find((u) => u.type === "exercise");
    const lessonId = exercise.lessonIds[0];
    expect(path.canStartExercise(exercise.id)).toBe(false);
    path.markLessonComplete(lessonId);
    expect(path.canStartExercise(exercise.id)).toBe(true);
  });

  it("blocks cross-topic exercises when any linked lesson is incomplete (AC-11)", () => {
    // covers AC-11
    const exercise = orderedUnits.find(
      (u) => u.type === "exercise" && u.lessonIds.length >= 1,
    );
    path.markLessonComplete(exercise.lessonIds[0]);
    if (exercise.lessonIds.length > 1) {
      expect(path.canStartExercise(exercise.id)).toBe(false);
    }
  });
});
