import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppHarness } from "./bootstrap-app.js";

describe("adversarial QA — malformed persisted rows & preview contracts", () => {
  /** @type {ReturnType<typeof createAppHarness>[]} */
  const harnesses = [];

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    while (harnesses.length) {
      harnesses.pop()?.teardown();
    }
  });

  it("loads when persisted array contains null alongside valid notes (no script errors, valid rows visible)", () => {
    /** @type {Error[]} */
    const scriptErrors = [];
    const h = createAppHarness({
      onJsdomError: (err) => scriptErrors.push(err),
      storageState: {
        "markdown-notes-app-notes": JSON.stringify([
          null,
          { id: "survivor", title: "OK", content: "body", updatedAt: 99 },
        ]),
      },
    });
    harnesses.push(h);
    expect(scriptErrors, "init must not throw uncaught TypeError from sort/render").toHaveLength(0);
    expect(h.document.querySelectorAll("button.note-item").length).toBeGreaterThanOrEqual(1);
    expect([...h.document.querySelectorAll("button.note-item")].some((b) => b.dataset.id === "survivor")).toBe(
      true,
    );
  });

  it("live preview must not render Promise placeholder when marked.parse is async", async () => {
    const h = createAppHarness({
      marked: {
        parse(text, options) {
          void options;
          return Promise.resolve(`<p class="async-md">${String(text)}</p>`);
        },
      },
    });
    harnesses.push(h);
    h.$("new-note-btn")?.click();
    const editor = /** @type {HTMLTextAreaElement} */ (h.$("markdown-editor"));
    editor.value = "hello **world**";
    editor.dispatchEvent(new h.window.Event("input", { bubbles: true }));
    await vi.waitUntil(() =>
      (h.$("markdown-preview")?.innerHTML ?? "").includes("async-md"),
    );
    const html = h.$("markdown-preview")?.innerHTML ?? "";
    expect(html).not.toContain("[object Promise]");
    expect(html).toContain("async-md");
  });
});

describe("adversarial QA — stress / fuzz (non-happy paths)", () => {
  const harnesses = [];

  afterEach(() => {
    vi.useRealTimers();
    while (harnesses.length) {
      harnesses.pop()?.teardown();
    }
  });

  it("survives burst edits with surrogate pairs and script-like fragments without throwing", () => {
    vi.useFakeTimers();
    const h = createAppHarness({});
    harnesses.push(h);
    h.$("new-note-btn")?.click();
    const editor = /** @type {HTMLTextAreaElement} */ (h.$("markdown-editor"));
    for (let i = 0; i < 120; i++) {
      editor.value = `\uD83D\uDE00<script>xss-${i}</script>\n${"#".repeat(i % 24)} \uD800\uDC00`;
      editor.dispatchEvent(new h.window.Event("input", { bubbles: true }));
      vi.advanceTimersByTime(17);
    }
    vi.advanceTimersByTime(250);
    expect(() => JSON.parse(/** @type {string} */ (h.window.localStorage.getItem(h.STORAGE_KEY)))).not.toThrow();
    const notes = JSON.parse(/** @type {string} */ (h.window.localStorage.getItem(h.STORAGE_KEY)));
    expect(Array.isArray(notes)).toBe(true);
    expect(notes[0].content).toContain("\uD83D\uDE00");
  });

  it("rapid sequential New note clicks yield distinct note ids", () => {
    vi.useFakeTimers();
    const h = createAppHarness({});
    harnesses.push(h);
    const btn = /** @type {HTMLButtonElement} */ (h.$("new-note-btn"));
    for (let i = 0; i < 25; i++) {
      btn.click();
      vi.advanceTimersByTime(0);
    }
    const ids = [...h.document.querySelectorAll("button.note-item")].map((b) => b.getAttribute("data-id"));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
