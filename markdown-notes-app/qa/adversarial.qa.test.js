import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppHarness } from "./bootstrap-app.js";

describe("adversarial QA — storage & resilience", () => {
  /** @type {ReturnType<typeof createAppHarness>[]} */
  const harnesses = [];

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    while (harnesses.length) {
      const h = harnesses.pop();
      h?.teardown();
    }
  });

  it("handles non-JSON localStorage payload without throwing on init", () => {
    // covers AC-adversarial-persistence: corrupt storage should not brick the app
    let h;
    expect(() => {
      h = createAppHarness({
        storageState: { "markdown-notes-app-notes": "<<<not-json>>>" },
      });
      harnesses.push(h);
    }).not.toThrow();
    const btn = h.$("new-note-btn");
    expect(btn).toBeTruthy();
  });

  it("localStorage.setItem failure on New note yields no persisted data while list still renders (silent failure primitive)", () => {
    // covers AC-adversarial-quota / AC-6: bounded storage/write errors are not surfaced to callers in JSDOM/real UX
    const h = createAppHarness({});
    harnesses.push(h);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const quotaError = new DOMException("The quota has been exceeded.", "QuotaExceededError");
    const storageProto = Object.getPrototypeOf(h.window.localStorage);
    const spy = vi.spyOn(storageProto, "setItem").mockImplementation(() => {
      throw quotaError;
    });
    /** @type {HTMLButtonElement} */
    const newBtn = h.$("new-note-btn");
    newBtn.click();
    expect(spy).toHaveBeenCalled();
    expect(h.window.localStorage.getItem(h.STORAGE_KEY)).toBeNull();
    expect(h.window.document.querySelectorAll("button.note-item").length).toBe(1);
  });

  it("does not persist edits until the debounce window elapses", () => {
    // covers AC-adversarial-debounce: boundary near 200ms delayed writes
    vi.useFakeTimers();
    const h = createAppHarness({});
    harnesses.push(h);
    h.$("new-note-btn")?.click();
    const editor = /** @type {HTMLTextAreaElement} */ (h.$("markdown-editor"));
    editor.value = "### Edge";
    editor.dispatchEvent(new h.window.Event("input", { bubbles: true }));
    vi.advanceTimersByTime(199);
    const mid = h.window.localStorage.getItem(h.STORAGE_KEY);
    expect(mid).not.toBeNull();
    const midParsed = JSON.parse(/** @type {string} */ (mid))[0];
    expect(String(midParsed.content)).not.toContain("Edge");
    vi.advanceTimersByTime(1);
    const after = h.window.localStorage.getItem(h.STORAGE_KEY);
    expect(JSON.parse(/** @type {string} */ (after))[0].content).toContain("Edge");
  });

  it("survives persisted array containing non-note primitives without throwing during list render", () => {
    // covers AC-adversarial-shape: hostile / legacy array elements
    let h;
    expect(() => {
      h = createAppHarness({
        storageState: {
          "markdown-notes-app-notes": JSON.stringify([
            { id: "ok", title: "t", content: "c", updatedAt: 50 },
            1,
            2,
          ]),
        },
      });
      harnesses.push(h);
    }).not.toThrow();
    const items = h.window.document.querySelectorAll("button.note-item");
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it("injects raw HTML fragments from marked into preview (HTML injection primitive)", () => {
    // covers AC-adversarial-preview: asserts innerHTML pathway (JSDOM may strip inline handlers)
    const probeTag = `<img class="probe-xss-marker" alt="">`;
    const h = createAppHarness({
      marked: {
        parse(text, options) {
          void options;
          return `<p>${String(text)} ${probeTag}</p>`;
        },
      },
    });
    harnesses.push(h);
    h.$("new-note-btn")?.click();
    const editor = /** @type {HTMLTextAreaElement} */ (h.$("markdown-editor"));
    editor.value = "body";
    editor.dispatchEvent(new h.window.Event("input", { bubbles: true }));
    const html = /** @type {string} */ (h.$("markdown-preview")?.innerHTML);
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("&lt;");
    expect(html).toContain("probe-xss-marker");
  });
});

describe("adversarial QA — identifiers & selection", () => {
  const harnesses = [];
  afterEach(() => {
    while (harnesses.length) {
      harnesses.pop()?.teardown();
    }
  });

  it("with duplicate note ids in storage, only the first match is addressable via list behavior", () => {
    // covers AC-adversarial-ids: ambiguous identity in persisted data
    const payload = JSON.stringify([
      { id: "dup", title: "First", content: "first-body", updatedAt: 3 },
      { id: "dup", title: "Second", content: "second-body", updatedAt: 2 },
    ]);
    const h = createAppHarness({
      storageState: { "markdown-notes-app-notes": payload },
    });
    harnesses.push(h);
    const dupButtons = h.window.document.querySelectorAll(".note-item");
    expect(dupButtons.length).toBe(2);
    /** @type {HTMLButtonElement} */
    const firstBtn = /** @type {HTMLButtonElement} */ (dupButtons[0]);
    expect(firstBtn.getAttribute("data-id")).toBe("dup");
    firstBtn.click();
    const editor = /** @type {HTMLTextAreaElement} */ (h.$("markdown-editor"));
    expect(editor.value).toBe("first-body");
  });
});
