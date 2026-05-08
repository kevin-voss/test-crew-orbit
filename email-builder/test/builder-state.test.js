import { describe, it, expect, beforeAll } from "vitest";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_JS_PATH = join(__dirname, "..", "app.js");

describe("createEmailBuilder", () => {
  let createEmailBuilder;

  beforeAll(async () => {
    const m = await import(pathToFileURL(APP_JS_PATH).href);
    createEmailBuilder = m.createEmailBuilder;
  });

  it("starts with no blocks", () => {
    const b = createEmailBuilder();
    expect(b.getBlocks()).toEqual([]);
  });

  it("addHeader returns a header block", () => {
    const b = createEmailBuilder();
    const added = b.addHeader("Hello");
    expect(added.type).toBe("header");
    expect(added.title).toBe("Hello");
    expect(added.id).toBeTruthy();
    expect(b.getBlocks()).toHaveLength(1);
  });

  it("uses a default title when header text is empty", () => {
    const b = createEmailBuilder();
    const added = b.addHeader("   ");
    expect(added.title).toBe("New header");
  });

  it("getPreviewHtml shows placeholder when empty", () => {
    const b = createEmailBuilder();
    expect(b.getPreviewHtml()).toMatch(/email-preview-empty/);
  });

  it("getPreviewHtml renders header components", () => {
    const b = createEmailBuilder();
    b.addHeader("Quarterly update");
    const html = b.getPreviewHtml();
    expect(html).toMatch(/email-document/);
    expect(html).toMatch(/Quarterly update/);
    expect(html).toMatch(/email-component-header/);
  });

  it("updateHeaderTitle mutates the matching block", () => {
    const b = createEmailBuilder();
    const { id } = b.addHeader("A");
    b.updateHeaderTitle(id, "B");
    expect(b.getBlocks()[0].title).toBe("B");
  });

  it("removeBlock deletes by id", () => {
    const b = createEmailBuilder();
    const { id } = b.addHeader("x");
    b.removeBlock(id);
    expect(b.getBlocks()).toHaveLength(0);
  });

  it("reset clears composition", () => {
    const b = createEmailBuilder();
    b.addHeader("one");
    b.reset();
    expect(b.getBlocks()).toEqual([]);
  });
});
