const STORAGE_KEY = "personal-todo-app-todos";

/** @typedef {{ id: string, text: string, completed: boolean, createdAt: number }} Todo */

/**
 * Load todos from localStorage
 * @returns {Todo[]}
 */
function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    /** @type {Todo[]} */
    const out = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const id = row.id;
      if (typeof id !== "string" || !id) continue;
      const text = typeof row.text === "string" ? row.text : "";
      const completed = typeof row.completed === "boolean" ? row.completed : false;
      const createdAt =
        typeof row.createdAt === "number" && !Number.isNaN(row.createdAt)
          ? row.createdAt
          : 0;
      out.push({ id, text, completed, createdAt });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Save todos to localStorage
 * @param {Todo[]} todos
 */
function saveTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

/**
 * Generate a unique ID for a todo
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `todo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Render the todo list to the DOM
 * @param {Todo[]} todos
 * @param {string} filter
 */
function renderTodos(todos, filter) {
  const todoList = document.getElementById("todo-list");
  const emptyState = document.getElementById("empty-state");

  if (!todoList) return;

  // Filter todos based on active filter
  let filtered = todos;
  if (filter === "active") {
    filtered = todos.filter((todo) => !todo.completed);
  } else if (filter === "completed") {
    filtered = todos.filter((todo) => todo.completed);
  }

  // Update empty state visibility
  if (emptyState) {
    emptyState.style.display = filtered.length === 0 ? "block" : "none";
  }

  // Render todos
  todoList.innerHTML = filtered
    .map(
      (todo) => `
    <li class="todo-item" data-id="${todo.id}">
      <div class="todo-content">
        <input
          type="checkbox"
          class="todo-checkbox"
          aria-label="Mark todo as ${todo.completed ? "incomplete" : "complete"}"
          ${todo.completed ? "checked" : ""}
        />
        <span class="todo-text ${todo.completed ? "completed" : ""}">${escapeHtml(todo.text)}</span>
      </div>
      <button
        type="button"
        class="btn btn-delete"
        aria-label="Delete this todo"
      >
        Delete
      </button>
    </li>
  `
    )
    .join("");
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Initialize the todo app
 */
function initApp() {
  let todos = loadTodos();
  let currentFilter = "all";

  const todoInput = document.getElementById("todo-input");
  const addTodoBtn = document.getElementById("add-todo-btn");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const todoList = document.getElementById("todo-list");

  // Render initial state
  renderTodos(todos, currentFilter);

  // Add todo event handler
  if (addTodoBtn) {
    addTodoBtn.addEventListener("click", () => {
      if (todoInput && todoInput.value.trim()) {
        const newTodo = {
          id: generateId(),
          text: todoInput.value.trim(),
          completed: false,
          createdAt: Date.now(),
        };
        todos.push(newTodo);
        saveTodos(todos);
        todoInput.value = "";
        renderTodos(todos, currentFilter);
      }
    });
  }

  // Handle Enter key in input
  if (todoInput) {
    todoInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        addTodoBtn?.click();
      }
    });
  }

  // Filter button event handlers
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.getAttribute("data-filter") || "all";
      renderTodos(todos, currentFilter);
    });
  });

  // Todo list event delegation for checkbox and delete
  if (todoList) {
    todoList.addEventListener("click", (e) => {
      const checkbox = e.target.closest(".todo-checkbox");
      const deleteBtn = e.target.closest(".btn-delete");
      const todoItem = e.target.closest(".todo-item");

      if (!todoItem) return;

      const todoId = todoItem.getAttribute("data-id");
      if (!todoId) return;

      if (checkbox) {
        // Toggle completed status
        const todo = todos.find((t) => t.id === todoId);
        if (todo) {
          todo.completed = checkbox.checked;
          saveTodos(todos);
          renderTodos(todos, currentFilter);
        }
      } else if (deleteBtn) {
        // Delete todo
        todos = todos.filter((t) => t.id !== todoId);
        saveTodos(todos);
        renderTodos(todos, currentFilter);
      }
    });
  }
}

// Initialize app when DOM is ready (only in browser environment)
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
}
