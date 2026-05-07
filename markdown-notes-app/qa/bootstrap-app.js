import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const appDir = dirname(fileURLToPath(import.meta.url));
const appJs = readFileSync(join(appDir, "../app.js"), "utf8");

/**
 * Spins up a fresh DOM + localStorage, loads app.js inside the window, returns handles.
 *
 * @param {{ marked?: unknown, storageState?: Record<string, string>, useFakeTimers?: boolean, onJsdomError?: (err: Error) => void }} opts
 */
export function createAppHarness(opts = {}) {
  const virtualConsole = new VirtualConsole();
  if (opts.onJsdomError) {
    virtualConsole.on("jsdomError", opts.onJsdomError);
  }
  virtualConsole.sendTo(console, { omitJSDOMErrors: !!opts.onJsdomError });

  const dom = new JSDOM(
    `<!DOCTYPE html><html><body>
      <ul id="note-list"></ul>
      <textarea id="markdown-editor"></textarea>
      <div id="markdown-preview"></div>
      <button id="new-note-btn" type="button"></button>
      <p id="active-title"></p>
    </body></html>`,
    {
      url: "http://localhost/",
      pretendToBeVisual: true,
      runScripts: "dangerously",
      virtualConsole,
    },
  );

  const { window } = dom;
  Object.defineProperty(window, "marked", {
    value:
      opts.marked ?? {
        parse(text, options) {
          void options;
          return `<p>${String(text)}</p>`;
        },
      },
    writable: true,
    configurable: true,
  });

  if (opts.storageState) {
    const st = opts.storageState;
    for (const [k, v] of Object.entries(st)) {
      window.localStorage.setItem(k, v);
    }
  }

  /** @returns {HTMLElement | null} */
  const $ = (id) => /** @type {HTMLElement | null} */ (window.document.getElementById(id));

  const script = window.document.createElement("script");
  script.textContent = appJs;
  window.document.body.appendChild(script);
  script.remove();
  window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));

  return {
    window,
    document: window.document,
    /** @readonly */
    STORAGE_KEY: "markdown-notes-app-notes",
    $,
    teardown() {
      window.close();
    },
  };
}
