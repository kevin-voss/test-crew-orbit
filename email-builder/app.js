/**
 * @typedef {{ id: string, type: 'header', title: string }} HeaderBlock
 * @typedef {{ id: string, type: 'paragraph', text: string }} ParagraphBlock
 * @typedef {HeaderBlock | ParagraphBlock} EmailBlock
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
 *   addHeader: (title: string) => HeaderBlock,
 *   addParagraph: (text: string) => ParagraphBlock,
 *   updateHeaderTitle: (id: string, title: string) => void,
 *   updateParagraphText: (id: string, text: string) => void,
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

  /**
   * @param {ParagraphBlock} block
   */
  function renderParagraph(block) {
    const safe = escapeHtml(block.text || "").replace(/\n/g, "<br />");
    return `<div class="email-component-paragraph" data-component-type="paragraph"><p>${safe}</p></div>`;
  }

  return {
    getBlocks() {
      return blocks.map((b) => ({ ...b }));
    },

    addHeader(title) {
      const raw = typeof title === "string" ? title.trim() : "";
      /** @type {HeaderBlock} */
      const block = {
        id: generateBlockId(),
        type: "header",
        title: raw || "New header",
      };
      blocks.push(block);
      return { ...block };
    },

    addParagraph(text) {
      const raw = typeof text === "string" ? text.trim() : "";
      /** @type {ParagraphBlock} */
      const block = {
        id: generateBlockId(),
        type: "paragraph",
        text: raw || "Add your message here.",
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

    updateParagraphText(id, text) {
      const block = blocks.find((b) => b.id === id && b.type === "paragraph");
      if (!block) return;
      const raw = typeof text === "string" ? text : "";
      block.text = raw.trim() === "" ? "Empty paragraph" : raw;
    },

    removeBlock(id) {
      blocks = blocks.filter((b) => b.id !== id);
    },

    getPreviewHtml() {
      if (blocks.length === 0) {
        return `<p class="email-preview-empty">Add components to see your email preview.</p>`;
      }
      const inner = blocks
        .map((b) => {
          if (b.type === "header") return renderHeader(b);
          if (b.type === "paragraph") return renderParagraph(b);
          return "";
        })
        .join("");
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
    list.innerHTML = `<li class="composition-empty" role="status">No components yet. Add a header or paragraph to begin.</li>`;
    return;
  }

  list.innerHTML = blocks
    .map((block) => {
      if (block.type === "header") {
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
      }
      if (block.type === "paragraph") {
        const safeBody = escapeHtml(block.text);
        return `
      <li class="block-card" data-block-id="${block.id}" data-component-type="paragraph">
        <div class="block-card-header">
          <span class="block-type-label">Paragraph</span>
          <button type="button" class="btn btn-ghost block-remove-btn" aria-label="Remove paragraph block">Remove</button>
        </div>
        <label class="visually-hidden" for="block-body-${block.id}">Edit paragraph body</label>
        <textarea
          id="block-body-${block.id}"
          class="block-body-input"
          rows="4"
          aria-label="Paragraph text">${safeBody}</textarea>
      </li>`;
      }
      return "";
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
  const paragraphInput = document.getElementById("paragraph-text-input");
  const addParagraphBtn = document.getElementById("add-paragraph-btn");
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

  if (addParagraphBtn) {
    addParagraphBtn.addEventListener("click", () => {
      const text =
        paragraphInput && "value" in paragraphInput
          ? /** @type {HTMLTextAreaElement} */ (paragraphInput).value
          : "";
      builder.addParagraph(text);
      if (paragraphInput && "value" in paragraphInput) {
        /** @type {HTMLTextAreaElement} */ (paragraphInput).value = "";
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
        const card = e.target.closest("[data-block-id]");
        if (!card) return;
        const id = card.getAttribute("data-block-id");
        if (!id) return;
        const titleInput = e.target.closest(".block-title-input");
        if (titleInput) {
          builder.updateHeaderTitle(id, /** @type {HTMLInputElement} */ (titleInput).value);
          renderPreview(builder);
          return;
        }
        const bodyArea = e.target.closest(".block-body-input");
        if (bodyArea) {
          builder.updateParagraphText(id, /** @type {HTMLTextAreaElement} */ (bodyArea).value);
          renderPreview(builder);
        }
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
