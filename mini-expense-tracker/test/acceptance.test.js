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

const EXPENSE_TRACKER_IMPL = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "expenseTracker.js",
);

describe("Expense tracker package layout", () => {
  it("places the implementation module under mini-expense-tracker/src/expenseTracker.js", () => {
    // covers AC-6
    expect(existsSync(EXPENSE_TRACKER_IMPL)).toBe(true);
  });

  it("exports a createExpenseTracker factory from the implementation module", async () => {
    // covers AC-6
    const m = await import(pathToFileURL(EXPENSE_TRACKER_IMPL).href);
    expect(m.createExpenseTracker).toBeTypeOf("function");
  });
});

describe("Expense tracker acceptance", () => {
  /** @type {typeof import("../src/expenseTracker.js").createExpenseTracker} */
  let createExpenseTracker;

  beforeAll(async () => {
    const m = await import("../src/expenseTracker.js");
    createExpenseTracker = m.createExpenseTracker;
  });

  let storage;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("creates an expense entry with amount, category, and date", () => {
    // covers AC-1
    const tracker = createExpenseTracker({ storage });
    const result = tracker.addExpense({
      amount: 25.50,
      category: "Food",
      date: "2026-05-07",
    });
    expect(result.ok).toBe(true);
    expect(result.expense.amount).toBe(25.50);
    expect(result.expense.category).toBe("Food");
    expect(result.expense.date).toBe("2026-05-07");
  });

  it("assigns a category to an expense", () => {
    // covers AC-2
    const tracker = createExpenseTracker({ storage });
    const result = tracker.addExpense({
      amount: 15.00,
      category: "Transportation",
      date: "2026-05-07",
    });
    expect(result.ok).toBe(true);
    expect(result.expense.category).toBe("Transportation");
  });

  it("calculates and returns total spending across all expenses", () => {
    // covers AC-3
    const tracker = createExpenseTracker({ storage });
    tracker.addExpense({
      amount: 10.00,
      category: "Food",
      date: "2026-05-07",
    });
    tracker.addExpense({
      amount: 20.00,
      category: "Transport",
      date: "2026-05-07",
    });
    tracker.addExpense({
      amount: 5.00,
      category: "Food",
      date: "2026-05-08",
    });
    const total = tracker.getTotal();
    expect(total).toBe(35.00);
  });

  it("filters expenses by category", () => {
    // covers AC-4
    const tracker = createExpenseTracker({ storage });
    tracker.addExpense({
      amount: 10.00,
      category: "Food",
      date: "2026-05-07",
    });
    tracker.addExpense({
      amount: 20.00,
      category: "Transport",
      date: "2026-05-07",
    });
    tracker.addExpense({
      amount: 5.00,
      category: "Food",
      date: "2026-05-08",
    });
    const foodExpenses = tracker.filterByCategory("Food");
    expect(foodExpenses).toHaveLength(2);
    expect(foodExpenses.every((e) => e.category === "Food")).toBe(true);
    expect(foodExpenses.reduce((sum, e) => sum + e.amount, 0)).toBe(15.00);
  });

  it("filters expenses by date", () => {
    // covers AC-5
    const tracker = createExpenseTracker({ storage });
    tracker.addExpense({
      amount: 10.00,
      category: "Food",
      date: "2026-05-07",
    });
    tracker.addExpense({
      amount: 20.00,
      category: "Transport",
      date: "2026-05-07",
    });
    tracker.addExpense({
      amount: 5.00,
      category: "Food",
      date: "2026-05-08",
    });
    const dateExpenses = tracker.filterByDate("2026-05-07");
    expect(dateExpenses).toHaveLength(2);
    expect(dateExpenses.every((e) => e.date === "2026-05-07")).toBe(true);
    expect(dateExpenses.reduce((sum, e) => sum + e.amount, 0)).toBe(30.00);
  });

  it("persists expenses across tracker instances with the same storage", () => {
    // covers AC-1 and AC-2
    const first = createExpenseTracker({ storage });
    const created = first.addExpense({
      amount: 25.50,
      category: "Food",
      date: "2026-05-07",
    });
    expect(created.ok).toBe(true);

    const second = createExpenseTracker({ storage });
    const expenses = second.listExpenses();
    expect(
      expenses.some(
        (e) =>
          e.amount === 25.50 &&
          e.category === "Food" &&
          e.date === "2026-05-07",
      ),
    ).toBe(true);
  });

  it("lists all expenses", () => {
    // covers AC-1
    const tracker = createExpenseTracker({ storage });
    tracker.addExpense({
      amount: 10.00,
      category: "Food",
      date: "2026-05-07",
    });
    tracker.addExpense({
      amount: 20.00,
      category: "Transport",
      date: "2026-05-07",
    });
    const expenses = tracker.listExpenses();
    expect(expenses).toHaveLength(2);
  });
});
