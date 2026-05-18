import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createMemoryStorage, CATALOG_TOPIC_IDS } from "./helpers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CURRICULUM_JSON = join(ROOT, "data", "curriculum.json");

describe("SQL learning app acceptance", () => {
  /** @type {import("../src/curriculum.js").Curriculum} */
  let curriculum;
  /** @type {ReturnType<typeof import("../src/pathController.js").createPathController>} */
  let path;
  /** @type {typeof import("../src/exerciseEngine.js").gradeExercise} */
  let gradeExercise;
  /** @type {typeof import("../app.js")} */
  let appFlow;
  /** @type {typeof import("../src/progressStore.js").createProgressStore} */
  let createProgressStore;
  let storage;

  beforeAll(async () => {
    const { loadCurriculum } = await import("../src/curriculum.js");
    const { createPathController } = await import("../src/pathController.js");
    const { createLessonProgress } = await import("../src/lessonProgress.js");
    const { gradeExercise: grade } = await import("../src/exerciseEngine.js");
    const appMod = await import("../app.js");
    const progressMod = await import("../src/progressStore.js");
    curriculum = loadCurriculum(readFileSync(CURRICULUM_JSON, "utf8"));
    gradeExercise = grade;
    appFlow = appMod;
    createProgressStore = progressMod.createProgressStore;
    path = createPathController(curriculum, createLessonProgress());
  });

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  describe("E2E-1 first visit concept", () => {
    it("presents SQL concept before deeper basics when learning starts (AC-1, AC-4)", () => {
      // covers AC-1
      // covers AC-4
      const start = appFlow.getFirstLearningView(curriculum, { completedUnits: [] });
      expect(start.view).toBe("concept");
      const overview = appFlow.renderStartView();
      expect(overview).toMatch(/Konzept/i);
    });
  });

  describe("E2E-2 complete one topic path", () => {
    it("covers the full Schul-Curriculum basics catalog (AC-5)", () => {
      // covers AC-5
      const topicIds = new Set(
        curriculum.units
          .filter((u) => u.topicId)
          .map((u) => u.topicId),
      );
      for (const id of CATALOG_TOPIC_IDS) {
        expect(topicIds.has(id)).toBe(true);
      }
    });

    it("assesses only content from completed lessons in exercises (AC-11)", () => {
      // covers AC-11
      const exercise = curriculum.units.find((u) => u.type === "exercise");
      const incomplete = gradeExercise(
        exercise,
        { optionId: exercise.correctOptionId },
        { lessonsComplete: () => false },
      );
      expect(incomplete.blocked).toBe(true);
      const complete = gradeExercise(
        exercise,
        { optionId: exercise.correctOptionId },
        { lessonsComplete: (ids) => ids.length === exercise.lessonIds.length },
      );
      expect(complete.ok).toBe(true);
    });
  });

  describe("E2E-3 progression difficulty", () => {
    it("increases exercise difficulty as the learner advances (AC-16, AC-17)", () => {
      // covers AC-16
      // covers AC-17
      const ordered = [...curriculum.units].sort((a, b) => a.order - b.order);
      const exercises = ordered.filter((u) => u.type === "exercise");
      expect(exercises.length).toBeGreaterThanOrEqual(2);

      const first = exercises[0];
      const second = exercises[1];
      expect(second.difficulty).toBeGreaterThanOrEqual(first.difficulty);

      path.recordSuccess(ordered[0].id);
      for (const unit of ordered) {
        if (unit.id === first.id) path.recordSuccess(unit.id);
      }
      expect(path.isUnlocked(second.id)).toBe(true);
    });
  });

  describe("E2E-4 resume session", () => {
    it("restores progress and resumes after a simulated reload (AC-19, AC-21)", () => {
      // covers AC-19
      // covers AC-21
      const ordered = [...curriculum.units].sort((a, b) => a.order - b.order);
      const concept = ordered.find((u) => u.type === "concept");
      const progress = createProgressStore(storage);
      progress.save({
        version: 1,
        completedUnits: [concept.id],
        lastUnitId: ordered[1].id,
      });
      const reloaded = progress.load();
      expect(reloaded.completedUnits).toContain(concept.id);
      const resume = appFlow.resumeFromStorage(curriculum, storage);
      expect(resume.unitId).toBe(ordered[1].id);
    });
  });

  describe("beginner audience", () => {
    it("targets users without prior SQL knowledge in onboarding copy (AC-2, AC-7)", () => {
      // covers AC-2
      // covers AC-7
      const concept = curriculum.units.find((u) => u.type === "concept");
      const text = `${concept.title} ${concept.body}`;
      expect(text).toMatch(/Anfänger|ohne Vorkenntnis|erste Schritte|noch nie/i);
    });
  });

  describe("exercise formats and feedback", () => {
    it("supports staged formats from MC to SQL with German feedback (AC-12, AC-13, AC-14, AC-15)", () => {
      // covers AC-12
      // covers AC-13
      // covers AC-14
      // covers AC-15
      const early = curriculum.units.find(
        (u) => u.type === "exercise" && u.difficulty <= 2,
      );
      const late = curriculum.units.find(
        (u) => u.type === "exercise" && u.format === "sql",
      );
      expect(early.format).not.toBe("sql");
      expect(late).toBeTruthy();
      expect(early.feedbackWrong).toMatch(/[äöüßÄÖÜ]|nicht|versuche/i);
      expect(early.feedbackCorrect).toMatch(/[äöüßÄÖÜ]|richtig|gut|weiter/i);
    });
  });

  describe("lock enforcement", () => {
    it("prevents reaching locked units via direct navigation (AC-18)", () => {
      // covers AC-18
      const last = [...curriculum.units].sort((a, b) => b.order - a.order)[0];
      const nav = path.tryNavigate(last.id);
      expect(nav.allowed).toBe(false);
    });
  });
});
