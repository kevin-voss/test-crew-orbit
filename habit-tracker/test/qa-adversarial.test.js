import { describe, it, expect, beforeAll } from "vitest";
import { createHabitTracker } from "../src/habitTracker.js";
import { loadAppState, saveAppState } from "../storage.js";

/** Related AC traceability for QA (non-acceptance): risks tied to spec persistence / correctness. */

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
  };
}

const WEEK = {
  mon: "2026-05-04",
  thu: "2026-05-07",
};

describe("QA adversarial — storage.js corruption contract", () => {
  it("surfaces user-visible failure when persisted blob JSON is invalid", () => {
    // QA risk: silent data loss vs requirements E2E negative path / AC-5 expectation
    const ls = {
      getItem: () => "{not-json",
      setItem: () => {},
      removeItem: () => {},
    };
    const result = loadAppState(/** @type {Storage} */ (ls));
    expect(result.ok).toBe(false);
    expect(result.message?.length).toBeGreaterThan(0);
  });

  it("surfaces failure when normalized blob shape is unusable", () => {
    const ls = {
      getItem: () => JSON.stringify({ habits: "nope", completions: {} }),
      setItem: () => {},
      removeItem: () => {},
    };
    const result = loadAppState(/** @type {Storage} */ (ls));
    expect(result.ok).toBe(false);
  });
});

describe("QA adversarial — habitTracker silent corruption & malformed persisted habits", () => {
  it("returns empty habits when habits JSON is corrupted without surfacing load failure", () => {
    // QA risk: related to AC-5 / corrupted storage — tracker swallows parse errors
    const storage = createMemoryStorage();
    storage.setItem("habit-tracker:habits", "{broken");
    const tracker = createHabitTracker({ storage });
    expect(tracker.listHabits()).toEqual([]);
  });

  it("getWeeklyProgress throws or degrades when habits array contains invalid elements", () => {
    // QA risk: poisoned localStorage from extensions / manual edits
    const storage = createMemoryStorage();
    storage.setItem(
      "habit-tracker:habits",
      JSON.stringify([
        { id: "ok", label: "Fine" },
        null,
        { id: "x", label: "y" },
      ]),
    );
    const tracker = createHabitTracker({
      storage,
      clock: { todayISO: () => WEEK.thu },
    });
    expect(() => tracker.getWeeklyProgress()).toThrow();
  });

  it("propagates QuotaExceededError from setItem on createHabit (no structured error)", () => {
    const storage = createMemoryStorage();
    storage.setItem = () => {
      const err = new Error("quota");
      err.name = "QuotaExceededError";
      throw err;
    };
    const tracker = createHabitTracker({ storage });
    expect(() => tracker.createHabit({ name: "Overflow" })).toThrow("quota");
  });
});

describe("QA adversarial — completion dates & unknown habits", () => {
  /** @type {ReturnType<typeof createHabitTracker>} */
  let tracker;

  beforeAll(() => {
    const storage = createMemoryStorage();
    tracker = createHabitTracker({
      storage,
      clock: { todayISO: () => WEEK.thu },
    });
    tracker.createHabit({ name: "T" });
  });

  it("rejects setCompletion for unknown habit id", () => {
    const storage = createMemoryStorage();
    const t = createHabitTracker({
      storage,
      clock: { todayISO: () => WEEK.thu },
    });
    t.createHabit({ name: "Only" });
    const res = t.setCompletion("missing-id", WEEK.mon, true);
    expect(res.ok).toBe(false);
  });

  it("rejects empty string dateISO for completion toggle", () => {
    const habits = tracker.listHabits();
    const res = tracker.setCompletion(habits[0].id, "", true);
    expect(res.ok).toBe(false);
  });

  it("rejects non calendar-shaped dateISO strings", () => {
    const habits = tracker.listHabits();
    const res = tracker.setCompletion(habits[0].id, "not-even-a-date", true);
    expect(res.ok).toBe(false);
  });

  it("rejects completion dates outside the review week containing today", () => {
    const storage = createMemoryStorage();
    const t = createHabitTracker({
      storage,
      clock: { todayISO: () => WEEK.thu },
    });
    const { habit } = t.createHabit({ name: "Box" });
    const res = t.setCompletion(habit.id, "2020-01-01", true);
    expect(res.ok).toBe(false);
  });
});

describe("QA adversarial — concurrent synchronous writers (lost update)", () => {
  it("last writer wins when the second tracker observes a stale empty habit list", () => {
    // QA risk: multi-tab interleaving — read-modify-write without locking can drop rows
    const storage = createMemoryStorage();
    let habitKeyReads = 0;
    const origGet = storage.getItem.bind(storage);
    storage.getItem = (key) => {
      if (key === "habit-tracker:habits") {
        habitKeyReads += 1;
        if (habitKeyReads === 2) return JSON.stringify([]);
      }
      return origGet(key);
    };

    const a = createHabitTracker({ storage });
    const b = createHabitTracker({ storage });
    a.createHabit({ name: "FromA" });
    b.createHabit({ name: "FromB" });

    const labels = createHabitTracker({ storage })
      .listHabits()
      .map((h) => h.label)
      .sort();
    expect(labels).toEqual(["FromB"]);
    expect(labels.includes("FromA")).toBe(false);
  });
});

describe("QA adversarial — completion map stress & fuzz-lite", () => {
  it("handles very large completion arrays without throwing on read path", () => {
    const storage = createMemoryStorage();
    const dates = [];
    for (let i = 1; i <= 500; i++) {
      dates.push(`2026-05-${String(i % 28 || 1).padStart(2, "0")}`);
    }
    storage.setItem(
      "habit-tracker:completions",
      JSON.stringify({ heavy: [...new Set(dates)] }),
    );
    storage.setItem(
      "habit-tracker:habits",
      JSON.stringify([{ id: "heavy", label: "Heavy" }]),
    );
    const tracker = createHabitTracker({
      storage,
      clock: { todayISO: () => WEEK.thu },
    });
    expect(() => tracker.getWeeklyProgress()).not.toThrow();
  });
});

describe("QA adversarial — boundary name (Unicode code points)", () => {
  it("allows habit name of exactly 120 Unicode code points including astral symbols", () => {
    const storage = createMemoryStorage();
    const tracker = createHabitTracker({ storage });
    const name120 = "😀".repeat(120); // 120 code points; JS .length is 240
    expect([...name120].length).toBe(120);
    const res = tracker.createHabit({ name: name120 });
    expect(res.ok).toBe(true);
  });

  it("rejects 121 Unicode code points when represented as fewer JS string units than code points", () => {
    const storage = createMemoryStorage();
    const tracker = createHabitTracker({ storage });
    const name121 = "😀".repeat(121);
    expect([...name121].length).toBe(121);
    const res = tracker.createHabit({ name: name121 });
    expect(res.ok).toBe(false);
  });
});

describe("QA adversarial — saveAppState quota path", () => {
  it("returns structured failure when storage quota is exceeded", () => {
    const ls = {
      setItem: () => {
        const e = new Error("quota");
        e.name = "QuotaExceededError";
        throw e;
      },
      getItem: () => null,
      removeItem: () => {},
    };
    const out = saveAppState(
      { habits: [], completions: {} },
      /** @type {Storage} */ (ls),
    );
    expect(out.ok).toBe(false);
    expect(out.message?.length).toBeGreaterThan(0);
  });
});

/**
 * Poisoned completion entries (manual edits / buggy writers): `habitTracker` loadCompletions
 * accepts any object values; `isCompleted` uses Array.prototype.includes semantics only when
 * the value is array-shaped — strings fall through to String.prototype.includes (substring).
 */
describe("QA adversarial — poisoned completion map values", () => {
  it("does not treat completion dates as substring-matched when stored value is a string", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      "habit-tracker:habits",
      JSON.stringify([{ id: "h1", label: "Tamper" }]),
    );
    storage.setItem(
      "habit-tracker:completions",
      JSON.stringify({ h1: "2026-05-07" }),
    );
    const tracker = createHabitTracker({
      storage,
      clock: { todayISO: () => "2026-05-07" },
    });
    expect(tracker.isCompleted("h1", "2026-05-07")).toBe(true);
    expect(tracker.isCompleted("h1", "2026-05-0")).toBe(false);
  });

  it("setToggle does not corrupt completion state when existing value is a string", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      "habit-tracker:habits",
      JSON.stringify([{ id: "h1", label: "Tamper" }]),
    );
    storage.setItem(
      "habit-tracker:completions",
      JSON.stringify({ h1: "2026-05-07" }),
    );
    const tracker = createHabitTracker({
      storage,
      clock: { todayISO: () => "2026-05-07" },
    });
    const ok = tracker.setCompletion("h1", "2026-05-07", true);
    expect(ok.ok).toBe(true);
    const raw = storage.getItem("habit-tracker:completions");
    const parsed = JSON.parse(/** @type {string} */ (raw));
    expect(Array.isArray(parsed.h1)).toBe(true);
    expect(parsed.h1).toContain("2026-05-07");
  });
});
