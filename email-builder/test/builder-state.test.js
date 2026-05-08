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

  it("uses a default paragraph when text is empty", () => {
    const b = createEmailBuilder();
    const added = b.addParagraph("   ");
    expect(added.type).toBe("paragraph");
    expect(added.text).toBe("Add your message here.");
  });

  it("addParagraph persists and previews", () => {
    const b = createEmailBuilder();
    b.addParagraph("Line one");
    expect(b.getBlocks()).toHaveLength(1);
    expect(b.getBlocks()[0].type).toBe("paragraph");
    const html = b.getPreviewHtml();
    expect(html).toMatch(/email-component-paragraph/);
    expect(html).toMatch(/Line one/);
    expect(html).toMatch(/data-component-type="paragraph"/);
  });

  it("header and paragraph order is preserved in preview", () => {
    const b = createEmailBuilder();
    b.addHeader("Hi");
    b.addParagraph("Body");
    const html = b.getPreviewHtml();
    const hiIdx = html.indexOf("Hi");
    const bodyIdx = html.indexOf("Body");
    expect(hiIdx).toBeGreaterThan(-1);
    expect(bodyIdx).toBeGreaterThan(hiIdx);
  });

  it("updateHeaderTitle mutates the matching block", () => {
    const b = createEmailBuilder();
    const { id } = b.addHeader("A");
    b.updateHeaderTitle(id, "B");
    expect(b.getBlocks()[0].title).toBe("B");
  });

  it("updateParagraphText updates the matching block", () => {
    const b = createEmailBuilder();
    const { id } = b.addParagraph("X");
    b.updateParagraphText(id, "Y");
    expect(b.getBlocks()[0].text).toBe("Y");
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
