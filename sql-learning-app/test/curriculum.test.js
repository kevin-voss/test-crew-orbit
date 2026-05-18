import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOG_TOPIC_IDS } from "./helpers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CURRICULUM_JSON = join(ROOT, "data", "curriculum.json");
const SEED_SQL = join(ROOT, "data", "seed.sql");

describe("curriculum data model", () => {
  /** @type {typeof import("../src/curriculum.js")} */
  let curriculumModule;
  /** @type {typeof import("../src/catalogTopics.js")} */
  let catalogModule;
  let curriculum;

  beforeAll(async () => {
    curriculumModule = await import("../src/curriculum.js");
    catalogModule = await import("../src/catalogTopics.js");
    const raw = readFileSync(CURRICULUM_JSON, "utf8");
    curriculum = curriculumModule.loadCurriculum(raw);
  });

  it("ships curriculum.json and seed.sql data files", () => {
    // covers AC-5
    expect(existsSync(CURRICULUM_JSON)).toBe(true);
    expect(existsSync(SEED_SQL)).toBe(true);
  });

  it("includes every catalog topic in the curriculum (AC-5)", () => {
    // covers AC-5
    const catalogIds = catalogModule.CATALOG_TOPIC_IDS;
    expect(catalogIds).toEqual(CATALOG_TOPIC_IDS);
    const topicIds = new Set(
      curriculum.units
        .filter((u) => u.type === "lesson" || u.type === "exercise")
        .map((u) => u.topicId),
    );
    for (const id of catalogIds) {
      expect(topicIds.has(id)).toBe(true);
    }
  });

  it("provides at least one lesson per catalog topic (AC-6)", () => {
    // covers AC-6
    for (const topicId of CATALOG_TOPIC_IDS) {
      const lessons = curriculum.units.filter(
        (u) => u.type === "lesson" && u.topicId === topicId,
      );
      expect(lessons.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("defines the shared Schule sample schema in seed.sql (AC-8)", () => {
    // covers AC-8
    const seed = readFileSync(SEED_SQL, "utf8").toLowerCase();
    expect(seed).toMatch(/\bschueler\b/);
    expect(seed).toMatch(/\bkurse\b/);
    expect(seed).toMatch(/\bnoten\b/);
  });

  it("references sample schema table names in lesson copy (AC-8)", () => {
    // covers AC-8
    const lessons = curriculum.units.filter((u) => u.type === "lesson");
    const bodies = lessons.map((l) => `${l.title} ${l.body}`.toLowerCase()).join("\n");
    expect(bodies).toMatch(/schueler/);
    expect(bodies).toMatch(/noten/);
  });

  it("keeps exercise difficulty monotonically non-decreasing by order (AC-16)", () => {
    // covers AC-16
    const exercises = curriculum.units
      .filter((u) => u.type === "exercise")
      .sort((a, b) => a.order - b.order);
    let prev = 0;
    for (const ex of exercises) {
      expect(ex.difficulty).toBeGreaterThanOrEqual(prev);
      prev = ex.difficulty;
    }
  });

  it("links each exercise to lessonIds for topic traceability (AC-11 prep)", () => {
    // covers AC-11
    const exercises = curriculum.units.filter((u) => u.type === "exercise");
    for (const ex of exercises) {
      expect(Array.isArray(ex.lessonIds)).toBe(true);
      expect(ex.lessonIds.length).toBeGreaterThan(0);
      expect(ex.topicId).toBeTruthy();
    }
  });

  it("includes a concept unit at the start of the path (AC-1 prep)", () => {
    // covers AC-1
    const concept = curriculum.units.find((u) => u.type === "concept");
    expect(concept).toBeTruthy();
    const minOrder = Math.min(...curriculum.units.map((u) => u.order));
    expect(concept.order).toBe(minOrder);
  });
});
