import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CURRICULUM_JSON = join(__dirname, "..", "data", "curriculum.json");

describe("lesson progress", () => {
  /** @type {ReturnType<typeof import("../src/lessonProgress.js").createLessonProgress>} */
  let progress;
  /** @type {import("../src/curriculum.js").Curriculum} */
  let curriculum;
  let lessons;

  beforeAll(async () => {
    const { loadCurriculum } = await import("../src/curriculum.js");
    curriculum = loadCurriculum(readFileSync(CURRICULUM_JSON, "utf8"));
    lessons = curriculum.units
      .filter((u) => u.type === "lesson")
      .sort((a, b) => a.order - b.order);
  });

  beforeEach(async () => {
    const { createLessonProgress } = await import("../src/lessonProgress.js");
    progress = createLessonProgress();
  });

  it("allows access to the first lesson without prior completions (AC-9)", () => {
    // covers AC-9
    const first = lessons[0];
    expect(progress.canAccessLesson(first, lessons)).toBe(true);
  });

  it("blocks skipping ahead to lesson N+1 without completing lesson N (AC-9)", () => {
    // covers AC-9
    if (lessons.length < 2) return;
    const second = lessons[1];
    expect(progress.canAccessLesson(second, lessons)).toBe(false);
    progress.markComplete(lessons[0].id);
    expect(progress.canAccessLesson(second, lessons)).toBe(true);
  });

  it("records completed lesson unit ids (AC-10)", () => {
    // covers AC-10
    const first = lessons[0];
    expect(progress.isComplete(first.id)).toBe(false);
    progress.markComplete(first.id);
    expect(progress.isComplete(first.id)).toBe(true);
  });

  it("exposes completed lesson ids for exercise gating (AC-10)", () => {
    // covers AC-10
    progress.markComplete(lessons[0].id);
    const completed = progress.getCompletedIds();
    expect(completed).toContain(lessons[0].id);
  });
});
