/**
 * @typedef {{ id: string, type: 'header', title: string }} EmailBlock
 */

/**
 * @returns {string}
 */
function generateBlockId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
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
  return text.replace(/[&<>"']/g, (char) => map[/** @type {keyof typeof map} */ (char)]);
}

/**
 * Create email builder state and preview helpers (testable without DOM).
 * @returns {{
 *   getBlocks: () => EmailBlock[],
 *   addHeader: (title: string) => EmailBlock,
 *   updateHeaderTitle: (id: string, title: string) => void,
 *   removeBlock: (id: string) => void,
 *   getPreviewHtml: () => string,
 *   reset: () => void
 * }}
 */
function createEmailBuilder() {
  /** @type {EmailBlock[]} */
  let blocks = [];

  function renderHeader(block) {
    const safe = escapeHtml(block.title || "");
    return `<header class="email-component-header" data-component-type="header"><h1>${safe}</h1></header>`;
  }

  return {
    getBlocks() {
      return blocks.map((b) => ({ ...b }));
    },

    addHeader(title) {
      const raw = typeof title === "string" ? title.trim() : "";
      /** @type {EmailBlock} */
      const block = {
        id: generateBlockId(),
        type: "header",
        title: raw || "New header",
      };
      blocks.push(block);
      return { ...block };
    },

    updateHeaderTitle(id, title) {
      const block = blocks.find((b) => b.id === id && b.type === "header");
      if (!block) return;
      const raw = typeof title === "string" ? title.trim() : "";
      block.title = raw || "Untitled header";
    },

    removeBlock(id) {
      blocks = blocks.filter((b) => b.id !== id);
    },

    getPreviewHtml() {
      if (blocks.length === 0) {
        return `<p class="email-preview-empty">Add components to see your email preview.</p>`;
      }
      const inner = blocks.map((b) => (b.type === "header" ? renderHeader(b) : "")).join("");
      return `<div class="email-document">${inner}</div>`;
    },

    reset() {
      blocks = [];
    },
  };
}

/**
 * @param {ReturnType<typeof createEmailBuilder>} builder
 */
function renderCompositionList(builder) {
  const list = document.getElementById("composition-list");
  if (!list) return;

  const blocks = builder.getBlocks();
  if (blocks.length === 0) {
    list.innerHTML = `<li class="composition-empty" role="status">No components yet. Add a header to begin.</li>`;
    return;
  }

  list.innerHTML = blocks
    .map((block) => {
      if (block.type !== "header") return "";
      const safeTitle = escapeHtml(block.title);
      return `
      <li class="block-card" data-block-id="${block.id}" data-component-type="header">
        <div class="block-card-header">
          <span class="block-type-label">Header</span>
          <button type="button" class="btn btn-ghost block-remove-btn" aria-label="Remove header block">Remove</button>
        </div>
        <label class="visually-hidden" for="block-title-${block.id}">Edit header title</label>
        <input
          id="block-title-${block.id}"
          class="block-title-input"
          type="text"
          value="${safeTitle}"
          aria-label="Header title"
        />
      </li>`;
    })
    .join("");
}

/**
 * @param {ReturnType<typeof createEmailBuilder>} builder
 */
function renderPreview(builder) {
  const preview = document.getElementById("email-preview");
  if (!preview) return;
  preview.innerHTML = builder.getPreviewHtml();
}

function initApp() {
  const builder = createEmailBuilder();

  const headerInput = document.getElementById("header-title-input");
  const addHeaderBtn = document.getElementById("add-header-btn");
  const compositionList = document.getElementById("composition-list");

  function refresh() {
    renderCompositionList(builder);
    renderPreview(builder);
  }

  refresh();

  if (addHeaderBtn) {
    addHeaderBtn.addEventListener("click", () => {
      const title = headerInput && "value" in headerInput ? /** @type {HTMLInputElement} */ (headerInput).value : "";
      builder.addHeader(title);
      if (headerInput && "value" in headerInput) {
        /** @type {HTMLInputElement} */ (headerInput).value = "";
      }
      refresh();
    });
  }

  if (compositionList) {
    compositionList.addEventListener("click", (e) => {
      const removeBtn = e.target.closest(".block-remove-btn");
      const card = e.target.closest("[data-block-id]");
      if (!removeBtn || !card) return;
      const id = card.getAttribute("data-block-id");
      if (id) builder.removeBlock(id);
      refresh();
    });

    compositionList.addEventListener(
      "input",
      (e) => {
        const input = e.target.closest(".block-title-input");
        const card = e.target.closest("[data-block-id]");
        if (!input || !card) return;
        const id = card.getAttribute("data-block-id");
        if (id) builder.updateHeaderTitle(id, /** @type {HTMLInputElement} */ (input).value);
        renderPreview(builder);
      },
      true
    );
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
}

export { createEmailBuilder };
