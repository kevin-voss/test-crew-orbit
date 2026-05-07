import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** @returns {{ getItem: (k: string) => string | null; setItem: (k: string, v: string) => void }} */
function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
  };
}

/**
 * Monday 2026-05-04 .. Sunday 2026-05-10 (local week used as fixed fixture).
 * Adjust `today` inside tests to respect eligibility (today + earlier in week only).
 */
const WEEK = {
  mon: "2026-05-04",
  tue: "2026-05-05",
  wed: "2026-05-06",
  thu: "2026-05-07",
  fri: "2026-05-08",
  sat: "2026-05-09",
  sun: "2026-05-10",
};

const HABIT_TRACKER_IMPL = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "habitTracker.js",
);

describe("Habit tracker package layout", () => {
  it("places the implementation module under habit-tracker/src/habitTracker.js", () => {
    // covers AC-12
    expect(existsSync(HABIT_TRACKER_IMPL)).toBe(true);
  });

  it("exports a createHabitTracker factory from the implementation module", async () => {
    // covers AC-12
    const m = await import(pathToFileURL(HABIT_TRACKER_IMPL).href);
    expect(m.createHabitTracker).toBeTypeOf("function");
  });
});

describe("Habit tracker acceptance", () => {
  /** @type {typeof import("../src/habitTracker.js").createHabitTracker} */
  let createHabitTracker;

  beforeAll(async () => {
    const m = await import("../src/habitTracker.js");
    createHabitTracker = m.createHabitTracker;
  });

  let storage;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("creates a habit with a trimmed display name from a valid submission", () => {
    // covers AC-1
    const tracker = createHabitTracker({ storage });
    const result = tracker.createHabit({ name: "  Morning stretch  " });
    expect(result.ok).toBe(true);
    expect(result.habit.label).toBe("Morning stretch");
  });

  it("lists a created habit after re-instantiating the tracker with the same storage", () => {
    // covers AC-2
    const first = createHabitTracker({ storage });
    const created = first.createHabit({ name: "Read" });
    expect(created.ok).toBe(true);

    const second = createHabitTracker({ storage });
    const habits = second.listHabits();
    expect(habits.some((h) => h.id === created.habit.id && h.label === "Read")).toBe(
      true,
    );
  });

  it("keeps multiple saved habits distinct in the active list", () => {
    // covers AC-3
    const tracker = createHabitTracker({ storage });
    const a = tracker.createHabit({ name: "Habit A" });
    const b = tracker.createHabit({ name: "Habit B" });
    expect(a.ok && b.ok).toBe(true);
    const habits = tracker.listHabits();
    const labels = habits.map((h) => h.label).sort();
    expect(labels).toEqual(["Habit A", "Habit B"]);
  });

  it("records completion for an eligible in-week calendar date and surfaces it in daily status", () => {
    // covers AC-4
    const tracker = createHabitTracker({
      storage,
      clock: { todayISO: () => WEEK.thu },
    });
    const { habit } = tracker.createHabit({ name: "Walk" });
    const res = tracker.setCompletion(habit.id, WEEK.tue, true);
    expect(res.ok).toBe(true);
    expect(tracker.isCompleted(habit.id, WEEK.tue)).toBe(true);
  });

  it("does not record completion for a future calendar date within the same review week", () => {
    // covers AC-4
    const tracker = createHabitTracker({
      storage,
      clock: { todayISO: () => WEEK.thu },
    });
    const { habit } = tracker.createHabit({ name: "Walk" });
    const res = tracker.setCompletion(habit.id, WEEK.sat, true);
    expect(res.ok).toBe(false);
    expect(tracker.isCompleted(habit.id, WEEK.sat)).toBe(false);
  });

  it("still shows saved completions after reloading storage in a new tracker instance", () => {
    // covers AC-5
    const first = createHabitTracker({
      storage,
      clock: { todayISO: () => WEEK.thu },
    });
    const { habit } = first.createHabit({ name: "Hydrate" });
    first.setCompletion(habit.id, WEEK.wed, true);

    const second = createHabitTracker({
      storage,
      clock: { todayISO: () => WEEK.thu },
    });
    expect(second.isCompleted(habit.id, WEEK.wed)).toBe(true);
  });

  it("toggles an eligible day back to not completed consistently", () => {
    // covers AC-6
    const tracker = createHabitTracker({
      storage,
      clock: { todayISO: () => WEEK.thu },
    });
    const { habit } = tracker.createHabit({ name: "Journal" });
    tracker.setCompletion(habit.id, WEEK.mon, true);
    expect(tracker.isCompleted(habit.id, WEEK.mon)).toBe(true);

    const off = tracker.setCompletion(habit.id, WEEK.mon, false);
    expect(off.ok).toBe(true);
    expect(tracker.isCompleted(habit.id, WEEK.mon)).toBe(false);
  });

  it("exposes the current Monday–Sunday review week in the weekly progress model", () => {
    // covers AC-7
    const tracker = createHabitTracker({
      storage,
      clock: { todayISO: () => WEEK.thu },
    });
    const progress = tracker.getWeeklyProgress();
    expect(progress.weekRange.startISO).toBe(WEEK.mon);
    expect(progress.weekRange.endISO).toBe(WEEK.sun);
  });

  it("represents each habit with seven at-a-glance day slots for the review week", () => {
    // covers AC-8
    const tracker = createHabitTracker({
      storage,
      clock: { todayISO: () => WEEK.thu },
    });
    tracker.createHabit({ name: "A" });
    tracker.createHabit({ name: "B" });
    const progress = tracker.getWeeklyProgress();
    for (const row of progress.rows) {
      expect(row.byDay).toHaveLength(7);
      const dates = row.byDay.map((d) => d.dateISO).sort();
      expect(dates[0]).toBe(WEEK.mon);
      expect(dates[6]).toBe(WEEK.sun);
    }
  });

  it("uses identical week boundaries for every habit row in one weekly progress snapshot", () => {
    // covers AC-9
    const tracker = createHabitTracker({
      storage,
      clock: { todayISO: () => WEEK.thu },
    });
    tracker.createHabit({ name: "One" });
    tracker.createHabit({ name: "Two" });
    const progress = tracker.getWeeklyProgress();
    for (const row of progress.rows) {
      const dates = row.byDay.map((d) => d.dateISO).sort();
      expect(dates[0]).toBe(progress.weekRange.startISO);
      expect(dates[6]).toBe(progress.weekRange.endISO);
    }
  });

  it("shows an explicit empty state when there are zero habits", () => {
    // covers AC-10
    const tracker = createHabitTracker({
      storage,
      clock: { todayISO: () => WEEK.thu },
    });
    const progress = tracker.getWeeklyProgress();
    expect(progress.rows).toHaveLength(0);
    expect(progress.emptyStateMessage?.trim().length ?? 0).toBeGreaterThan(0);
  });

  it("removes a habit from lists and weekly summaries", () => {
    // covers AC-11
    const tracker = createHabitTracker({
      storage,
      clock: { todayISO: () => WEEK.thu },
    });
    const { habit } = tracker.createHabit({ name: "Temporary" });
    tracker.setCompletion(habit.id, WEEK.tue, true);
    tracker.removeHabit(habit.id);

    expect(tracker.listHabits().some((h) => h.id === habit.id)).toBe(false);
    const progress = tracker.getWeeklyProgress();
    expect(progress.rows.some((r) => r.habitId === habit.id)).toBe(false);
  });

  it("blocks invalid habit names with user-facing validation feedback and does not persist them", () => {
    // covers AC-13
    const tracker = createHabitTracker({ storage });
    const empty = tracker.createHabit({ name: "" });
    const ws = tracker.createHabit({ name: " \t " });
    const long = tracker.createHabit({ name: "x".repeat(121) });

    expect(empty.ok).toBe(false);
    expect(typeof empty.validationMessage).toBe("string");
    expect(empty.validationMessage.length).toBeGreaterThan(0);

    expect(ws.ok).toBe(false);
    expect(typeof ws.validationMessage).toBe("string");

    expect(long.ok).toBe(false);
    expect(typeof long.validationMessage).toBe("string");

    expect(tracker.listHabits()).toHaveLength(0);
  });

  it("supports core flows without requiring credentials or authorization context", () => {
    // covers AC-14
    const tracker = createHabitTracker({
      storage,
      clock: { todayISO: () => WEEK.thu },
    });
    const created = tracker.createHabit({ name: "Solo user habit" });
    expect(created.ok).toBe(true);
    tracker.setCompletion(created.habit.id, WEEK.wed, true);
    const progress = tracker.getWeeklyProgress();
    expect(progress.rows.length).toBeGreaterThan(0);
  });

  it("keeps completion idempotent for the same habit and calendar day (no duplicate completed state)", () => {
    // covers AC-15
    const tracker = createHabitTracker({
      storage,
      clock: { todayISO: () => WEEK.thu },
    });
    const { habit } = tracker.createHabit({ name: "Meditate" });
    tracker.setCompletion(habit.id, WEEK.tue, true);
    tracker.setCompletion(habit.id, WEEK.tue, true);
    expect(tracker.isCompleted(habit.id, WEEK.tue)).toBe(true);
    const progress = tracker.getWeeklyProgress();
    const row = progress.rows.find((r) => r.habitId === habit.id);
    const tue = row.byDay.find((d) => d.dateISO === WEEK.tue);
    expect(tue.completed).toBe(true);
  });

  it("associates completions to the tracker calendar date even when the clock is near local day boundaries", () => {
    // covers AC-16
    const tracker = createHabitTracker({
      storage,
      clock: { todayISO: () => WEEK.wed },
    });
    const { habit } = tracker.createHabit({ name: "Late log" });
    tracker.setCompletion(habit.id, WEEK.wed, true);
    expect(tracker.isCompleted(habit.id, WEEK.wed)).toBe(true);
    expect(tracker.isCompleted(habit.id, WEEK.thu)).toBe(false);

    const progress = tracker.getWeeklyProgress();
    const row = progress.rows.find((r) => r.habitId === habit.id);
    const wed = row.byDay.find((d) => d.dateISO === WEEK.wed);
    expect(wed.completed).toBe(true);
  });

  it("omits removed habits from weekly progress (no user-visible row after removal)", () => {
    // covers AC-17
    const tracker = createHabitTracker({
      storage,
      clock: { todayISO: () => WEEK.thu },
    });
    const { habit } = tracker.createHabit({ name: "Gone" });
    tracker.setCompletion(habit.id, WEEK.mon, true);
    tracker.removeHabit(habit.id);
    const progress = tracker.getWeeklyProgress();
    expect(progress.rows.every((r) => r.habitId !== habit.id)).toBe(true);
  });
});
