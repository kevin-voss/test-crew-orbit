const STORAGE_KEY = "markdown-notes-app-notes";

/** @typedef {{ id: string, title: string, content: string, updatedAt: number }} Note */

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** @param {Note[]} notes */
function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** @param {string} content */
function titleFromContent(content) {
  const line = content.split(/\r?\n/).find((l) => l.trim().length > 0);
  if (!line) return "Untitled";
  return line.replace(/^#+\s*/, "").trim().slice(0, 80) || "Untitled";
}

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

function init() {
  const listEl = document.getElementById("note-list");
  const editorEl = document.getElementById("markdown-editor");
  const previewEl = document.getElementById("markdown-preview");
  const newBtn = document.getElementById("new-note-btn");
  const activeTitleEl = document.getElementById("active-title");

  if (!listEl || !editorEl || !previewEl || !newBtn || !activeTitleEl) return;

  /** @type {Note[]} */
  let notes = loadNotes();
  /** @type {string | null} */
  let activeId = notes.length ? notes.sort((a, b) => b.updatedAt - a.updatedAt)[0].id : null;
  let persistTimer = null;

  function persistSoon() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      saveNotes(notes);
    }, 200);
  }

  function renderPreview() {
    const text = editorEl.value;
    try {
      if (typeof marked !== "undefined" && marked.parse) {
        const html = marked.parse(text, { async: false });
        previewEl.innerHTML = typeof html === "string" ? html : String(html);
      } else {
        previewEl.textContent = text;
      }
    } catch {
      previewEl.textContent = text;
    }
  }

  function sortNotes() {
    notes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  function renderList() {
    sortNotes();
    listEl.innerHTML = "";
    for (const note of notes) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "note-item" + (note.id === activeId ? " active" : "");
      btn.dataset.id = note.id;
      btn.innerHTML = `<span class="note-item-title"></span><span class="note-item-meta"></span>`;
      const titleSpan = btn.querySelector(".note-item-title");
      const metaSpan = btn.querySelector(".note-item-meta");
      if (titleSpan) titleSpan.textContent = note.title;
      if (metaSpan) metaSpan.textContent = formatDate(note.updatedAt);
      btn.addEventListener("click", () => selectNote(note.id));
      li.appendChild(btn);
      listEl.appendChild(li);
    }
  }

  function selectNote(id) {
    activeId = id;
    const note = notes.find((n) => n.id === id);
    editorEl.disabled = !note;
    if (note) {
      editorEl.value = note.content;
      activeTitleEl.textContent = note.title;
    } else {
      editorEl.value = "";
      activeTitleEl.textContent = "No note selected";
    }
    renderPreview();
    renderList();
  }

  function updateActiveFromEditor() {
    if (!activeId) return;
    const content = editorEl.value;
    const idx = notes.findIndex((n) => n.id === activeId);
    if (idx === -1) return;
    const title = titleFromContent(content);
    notes[idx] = {
      ...notes[idx],
      content,
      title,
      updatedAt: Date.now(),
    };
    activeTitleEl.textContent = title;
    renderPreview();
    renderList();
    persistSoon();
  }

  newBtn.addEventListener("click", () => {
    const note = {
      id: generateId(),
      title: "Untitled",
      content: "",
      updatedAt: Date.now(),
    };
    notes.unshift(note);
    activeId = note.id;
    editorEl.disabled = false;
    editorEl.value = "";
    activeTitleEl.textContent = note.title;
    renderPreview();
    renderList();
    saveNotes(notes);
    editorEl.focus();
  });

  editorEl.addEventListener("input", updateActiveFromEditor);

  if (!activeId) {
    editorEl.disabled = true;
    editorEl.value = "";
    previewEl.innerHTML = "";
    activeTitleEl.textContent = "No note selected — click New note";
  } else {
    selectNote(activeId);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
