import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FORBIDDEN_UNEXPLAINED_JARGON } from "./helpers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CURRICULUM_JSON = join(__dirname, "..", "data", "curriculum.json");

describe("concept introduction flow", () => {
  /** @type {typeof import("../src/curriculum.js")} */
  let loadCurriculum;
  /** @type {typeof import("../app.js")} */
  let appFlow;
  let curriculum;

  beforeAll(async () => {
    const curriculumModule = await import("../src/curriculum.js");
    const appModule = await import("../app.js");
    loadCurriculum = curriculumModule.loadCurriculum;
    appFlow = appModule;
    curriculum = loadCurriculum(readFileSync(CURRICULUM_JSON, "utf8"));
  });

  it("routes first learning entry to the concept view before basics lessons (AC-1)", () => {
    // covers AC-1
    const next = appFlow.getFirstLearningView(curriculum, { completedUnits: [] });
    expect(next.view).toBe("concept");
    const concept = curriculum.units.find((u) => u.type === "concept");
    expect(next.unitId).toBe(concept.id);
  });

  it("explains SQL in beginner-friendly German on the concept unit (AC-1)", () => {
    // covers AC-1
    const concept = curriculum.units.find((u) => u.type === "concept");
    const text = `${concept.title} ${concept.body}`;
    expect(text).toMatch(/SQL/i);
    expect(text).toMatch(/Datenbank|Tabelle|Abfrage/i);
    expect(text).not.toMatch(/Assume prior knowledge/i);
  });

  it("uses plain language without unexplained jargon in concept and lessons (AC-7)", () => {
    // covers AC-7
    const readable = curriculum.units
      .filter((u) => u.type === "concept" || u.type === "lesson")
      .map((u) => `${u.title}\n${u.body}`)
      .join("\n");
    for (const pattern of FORBIDDEN_UNEXPLAINED_JARGON) {
      expect(readable).not.toMatch(pattern);
    }
  });

  it("advances to the first lesson only after the concept is completed (AC-1)", () => {
    // covers AC-1
    const concept = curriculum.units.find((u) => u.type === "concept");
    const before = appFlow.getFirstLearningView(curriculum, { completedUnits: [] });
    expect(before.view).toBe("concept");

    const after = appFlow.getFirstLearningView(curriculum, {
      completedUnits: [concept.id],
    });
    expect(after.view).toBe("lesson");
    const firstLesson = curriculum.units
      .filter((u) => u.type === "lesson")
      .sort((a, b) => a.order - b.order)[0];
    expect(after.unitId).toBe(firstLesson.id);
  });
});
