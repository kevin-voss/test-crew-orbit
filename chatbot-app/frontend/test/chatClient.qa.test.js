import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendMessage } from "../src/api/chatClient.js";

describe("chatClient.sendMessage — QA adversarial", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects HTTP 200 responses with an empty string reply", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ reply: "" }),
    }));

    await expect(sendMessage({ message: "Hi", history: [] })).rejects.toThrow(
      /reply/i,
    );
  });

  it("rejects HTTP 200 responses with whitespace-only reply text", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ reply: "   \n\t" }),
    }));

    await expect(sendMessage({ message: "Hi", history: [] })).rejects.toThrow(
      /reply/i,
    );
  });

  it("surfaces a friendly error when the response body is not JSON", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    }));

    await expect(sendMessage({ message: "Hi", history: [] })).rejects.toThrow(
      /reply|try again/i,
    );
  });

  it("rejects HTTP 200 when reply field is missing", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ status: "ok" }),
    }));

    await expect(sendMessage({ message: "Hi", history: [] })).rejects.toThrow(
      /reply/i,
    );
  });

  it("rejects HTTP 200 when reply is a non-string type", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ reply: 12345 }),
    }));

    await expect(sendMessage({ message: "Hi", history: [] })).rejects.toThrow(
      /reply/i,
    );
  });
});
