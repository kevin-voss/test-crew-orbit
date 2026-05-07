/**
 * Creates an expense tracker instance
 * @param {Object} config Configuration object
 * @param {Object} config.storage Storage interface with getItem and setItem
 * @returns {Object} Expense tracker instance
 */
export function createExpenseTracker({ storage }) {
  const STORAGE_KEY = "expenses";

  /**
   * Load expenses from storage
   * @returns {Array<Object>} Array of expense objects
   */
  function loadExpenses() {
    const data = storage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Save expenses to storage
   * @param {Array<Object>} expenses Array of expense objects
   */
  function saveExpenses(expenses) {
    storage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }

  /**
   * Add an expense
   * @param {Object} expense Expense data
   * @param {number} expense.amount Amount of expense
   * @param {string} expense.category Category of expense
   * @param {string} expense.date Date of expense (ISO format)
   * @returns {Object} Result object with ok flag and expense data
   */
  function addExpense({ amount, category, date }) {
    const expenses = loadExpenses();
    const id = String(Date.now() + Math.random());
    const newExpense = {
      id,
      amount,
      category,
      date,
    };
    expenses.push(newExpense);
    saveExpenses(expenses);
    return {
      ok: true,
      expense: newExpense,
    };
  }

  /**
   * List all expenses
   * @returns {Array<Object>} Array of all expenses
   */
  function listExpenses() {
    return loadExpenses();
  }

  /**
   * Get total spending
   * @returns {number} Total amount of all expenses
   */
  function getTotal() {
    const expenses = loadExpenses();
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }

  /**
   * Filter expenses by category
   * @param {string} category Category to filter by
   * @returns {Array<Object>} Filtered expenses
   */
  function filterByCategory(category) {
    const expenses = loadExpenses();
    return expenses.filter((expense) => expense.category === category);
  }

  /**
   * Filter expenses by date
   * @param {string} date Date to filter by (ISO format)
   * @returns {Array<Object>} Filtered expenses
   */
  function filterByDate(date) {
    const expenses = loadExpenses();
    return expenses.filter((expense) => expense.date === date);
  }

  return {
    addExpense,
    listExpenses,
    getTotal,
    filterByCategory,
    filterByDate,
  };
}
