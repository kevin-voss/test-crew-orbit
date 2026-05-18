import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createMemoryStorage } from "./helpers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CURRICULUM_JSON = join(__dirname, "..", "data", "curriculum.json");
const STORAGE_KEY = "sql-lern-app-progress-v1";

describe("progress store", () => {
  /** @type {ReturnType<typeof import("../src/progressStore.js").createProgressStore>} */
  let store;
  /** @type {ReturnType<typeof import("../src/views/renderProgressBar.js").renderProgressBar>} */
  let renderProgressBar;
  /** @type {typeof import("../app.js")} */
  let resumeApp;
  let storage;
  let curriculum;

  beforeAll(async () => {
    const progressMod = await import("../src/progressStore.js");
    const barMod = await import("../src/views/renderProgressBar.js");
    const appMod = await import("../app.js");
    const { loadCurriculum } = await import("../src/curriculum.js");
    renderProgressBar = barMod.renderProgressBar;
    resumeApp = appMod.resumeFromStorage;
    curriculum = loadCurriculum(readFileSync(CURRICULUM_JSON, "utf8"));
    store = progressMod.createProgressStore;
  });

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("persists completed units across store instances (AC-19)", () => {
    // covers AC-19
    const first = store(storage);
    first.save({
      version: 1,
      completedUnits: ["concept-intro"],
      lastUnitId: "lesson-select-1",
    });
    const second = store(storage);
    const loaded = second.load();
    expect(loaded.completedUnits).toContain("concept-intro");
    expect(storage.getItem(STORAGE_KEY)).toBeTruthy();
  });

  it("renders a visible German progress indicator with accurate ratio (AC-20)", () => {
    // covers AC-20
    const total = curriculum.units.length;
    const completed = 2;
    const html = renderProgressBar({ completed, total });
    expect(html).toMatch(/Fortschritt|Schritt/i);
    expect(html).toMatch(new RegExp(`${completed}`));
    expect(html).toMatch(new RegExp(`${total}`));
  });

  it("resumes at the last unlocked unit after reload (AC-21)", () => {
    // covers AC-21
    const units = [...curriculum.units].sort((a, b) => a.order - b.order);
    const first = units[0];
    const second = units[1];
    store(storage).save({
      version: 1,
      completedUnits: [first.id],
      lastUnitId: second.id,
    });
    const resume = resumeApp(curriculum, storage);
    expect(resume.unitId).toBe(second.id);
    expect(resume.locked).toBe(false);
  });

  it("does not resume on a locked unit when storage points ahead of progress (AC-21)", () => {
    // covers AC-21
    const locked = curriculum.units
      .filter((u) => u.type === "lesson")
      .sort((a, b) => b.order - a.order)[0];
    store(storage).save({
      version: 1,
      completedUnits: [],
      lastUnitId: locked.id,
    });
    const resume = resumeApp(curriculum, storage);
    expect(resume.locked).toBe(true);
    expect(resume.unitId).not.toBe(locked.id);
  });

  it("handles corrupt storage without throwing (AC-19)", () => {
    // covers AC-19
    storage.setItem(STORAGE_KEY, "{not-json");
    const loaded = store(storage).load();
    expect(loaded).toBeNull();
  });
});
