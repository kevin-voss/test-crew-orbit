import { createHabitTracker } from "./src/habitTracker.js";
import { loadAppState, saveAppState, STORAGE_KEY } from "./storage.js";
import { createInitialInMemoryEnvelope, toPersistable } from "./state.js";
import { validateName } from "./habits.js";

/** Must align with STORAGE_KEYS inside `src/habitTracker.js`. */
const TRACKER_KEYS = {
  habits: "habit-tracker:habits",
  completions: "habit-tracker:completions",
};

const ls =
  typeof localStorage !== "undefined"
    ? localStorage
    : /** @type {Storage | null} */ (null);
const initialLoad = loadAppState(ls);

/** @type {HTMLDivElement | null} */
const storageBanner = document.querySelector("#storage-banner");

/**
 * @param {string} message
 */
function showStorageBanner(message) {
  if (!storageBanner || !message) return;
  storageBanner.hidden = false;
  storageBanner.textContent = message;
}

/** @type {{ version: number, habits: { id: string, label: string }[], completions: Record<string, string[]> }} */
let mem;
if (initialLoad.ok) {
  mem = {
    version: initialLoad.data.version,
    habits: [...initialLoad.data.habits],
    completions: { ...initialLoad.data.completions },
  };
} else {
  if (initialLoad.reason === "corrupt" && ls) {
    try {
      ls.removeItem(STORAGE_KEY);
    } catch {
      /* ignore reset failure */
    }
  }
  showStorageBanner(initialLoad.message);
  const envelope = createInitialInMemoryEnvelope();
  mem = { version: 1, habits: [...envelope.habits], completions: { ...envelope.completions } };
}

function persistMem() {
  const res = saveAppState(toPersistable(mem), ls);
  if (!res.ok) {
    showStorageBanner(res.message);
  }
}

/** Storage bridge: implements the tracker’s logical keys while persisting one versioned blob. */
const storageAdapter = {
  getItem: (k) => {
    if (k === TRACKER_KEYS.habits) {
      return mem.habits.length ? JSON.stringify(mem.habits) : null;
    }
    if (k === TRACKER_KEYS.completions) {
      return JSON.stringify(mem.completions);
    }
    return null;
  },
  setItem: (k, v) => {
    if (k === TRACKER_KEYS.habits) {
      mem.habits = JSON.parse(v);
    } else if (k === TRACKER_KEYS.completions) {
      mem.completions = JSON.parse(v);
    }
    persistMem();
  },
};

const tracker = createHabitTracker({ storage: storageAdapter });

const $ = (sel) => document.querySelector(sel);

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function utcTodayISO() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function lex(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function renderWeekly() {
  const progress = tracker.getWeeklyProgress();
  $("#week-range").textContent = `${progress.weekRange.startISO} → ${progress.weekRange.endISO}`;

  const body = $("#weekly-body");
  body.replaceChildren();
  const today = utcTodayISO();

  if (progress.rows.length === 0) {
    const p = document.createElement("p");
    p.className = "muted empty";
    p.textContent = progress.emptyStateMessage ?? "No habits yet.";
    body.appendChild(p);
    return;
  }

  const table = document.createElement("table");
  table.className = "weekly-table";
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  const habitTh = document.createElement("th");
  habitTh.textContent = "Habit";
  habitTh.scope = "col";
  hr.appendChild(habitTh);
  for (const lbl of dayLabels) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = lbl;
    hr.appendChild(th);
  }
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const row of progress.rows) {
    const tr = document.createElement("tr");
    const nameTd = document.createElement("td");
    nameTd.textContent = row.habitLabel ?? row.habitId;
    tr.appendChild(nameTd);

    for (const d of row.byDay) {
      const td = document.createElement("td");
      const marker = document.createElement("span");
      const isFuture = lex(d.dateISO, today) > 0;
      marker.className = "pill";
      marker.dataset.state = d.completed ? "done" : isFuture ? "pending" : "open";
      marker.title = d.dateISO;
      marker.textContent = d.completed ? "✓" : isFuture ? "—" : "○";
      td.appendChild(marker);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  body.appendChild(table);
}

function weekDatesFromProgress(progress) {
  if (progress.rows.length > 0) {
    return progress.rows[0].byDay.map((d) => d.dateISO);
  }
  const start = progress.weekRange.startISO;
  const out = [];
  const [y, m0, d0] = start.split("-").map(Number);
  let t = Date.UTC(y, m0 - 1, d0);
  for (let i = 0; i < 7; i++) {
    const dt = new Date(t);
    const ys = dt.getUTCFullYear();
    const mo = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dt.getUTCDate()).padStart(2, "0");
    out.push(`${ys}-${mo}-${day}`);
    t = Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate() + 1);
  }
  return out;
}

function renderCompletionToggles() {
  const body = $("#today-body");
  body.replaceChildren();
  const habits = tracker.listHabits();
  if (habits.length === 0) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Create a habit above to manage completions.";
    body.appendChild(p);
    return;
  }

  const progress = tracker.getWeeklyProgress();
  const today = utcTodayISO();
  const weekDates = weekDatesFromProgress(progress);

  for (const h of habits) {
    const row = document.createElement("div");
    row.className = "habit-row";

    const label = document.createElement("div");
    label.className = "habit-label";
    const strong = document.createElement("strong");
    strong.textContent = h.label;
    label.appendChild(strong);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "link-danger";
    del.textContent = "Remove";
    del.addEventListener("click", () => {
      tracker.removeHabit(h.id);
      rerender();
    });
    label.appendChild(del);

    const toggles = document.createElement("div");
    toggles.className = "toggles";

    for (const dateISO of weekDates) {
      const isFuture = lex(dateISO, today) > 0;
      const wrap = document.createElement("label");
      wrap.className = "toggle";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = tracker.isCompleted(h.id, dateISO);
      cb.disabled = isFuture;
      cb.addEventListener("change", () => {
        tracker.setCompletion(h.id, dateISO, cb.checked);
        rerender();
      });
      const cap = document.createElement("span");
      cap.textContent = dateISO.slice(5);
      wrap.append(cb, cap);
      toggles.appendChild(wrap);
    }

    row.append(label, toggles);
    body.appendChild(row);
  }
}

function renderHabitsList() {
  const root = $("#habits-list");
  root.replaceChildren();
  const habits = tracker.listHabits();
  if (habits.length === 0) {
    const p = document.createElement("p");
    p.className = "muted empty-list";
    p.textContent = "No habits yet. Add one above.";
    root.appendChild(p);
    return;
  }
  for (const h of habits) {
    const card = document.createElement("div");
    card.className = "habit-card";
    card.setAttribute("role", "listitem");

    const text = document.createElement("div");
    const title = document.createElement("p");
    title.className = "habit-title";
    title.textContent = h.label;
    text.append(title);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "link-danger";
    del.textContent = "Remove";
    del.addEventListener("click", () => {
      tracker.removeHabit(h.id);
      rerender();
    });

    card.append(text, del);
    root.appendChild(card);
  }
}

function rerender() {
  renderHabitsList();
  renderWeekly();
  renderCompletionToggles();
}

$("#add-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = /** @type {HTMLInputElement} */ ($("#habit-name"));
  const fb = $("#add-feedback");
  fb.hidden = false;

  const validated = validateName(input.value);
  if (!validated.ok) {
    fb.textContent = validated.errorMessage;
    fb.classList.add("err");
    return;
  }

  const res = tracker.createHabit({ name: input.value });
  if (res.ok) {
    fb.textContent = "Saved.";
    fb.classList.remove("err");
    input.value = "";
    rerender();
  } else {
    fb.textContent = res.validationMessage;
    fb.classList.add("err");
  }
});

rerender();
