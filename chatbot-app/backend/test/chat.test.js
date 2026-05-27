import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { createApp } from "../server.js";
import { completeChat, DEFAULT_SYSTEM_PROMPT } from "../services/llmService.js";

describe("POST /api/chat", () => {
  /** @type {import('express').Express} */
  let app;

  beforeAll(() => {
    process.env.LLM_MOCK = "true";
    delete process.env.OPENAI_API_KEY;
    app = createApp();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("triggers an LLM-backed completion path with user text and session history", async () => {
    // covers AC-17
    const res = await request(app)
      .post("/api/chat")
      .send({
        message: "Hello",
        history: [{ role: "user", content: "Earlier" }, { role: "assistant", content: "Hi" }],
      })
      .expect(200);

    expect(res.body.reply).toBeTypeOf("string");
    expect(res.body.reply.length).toBeGreaterThan(0);
  });

  it("returns assistant text on success without embedding secrets in the response", async () => {
    // covers AC-18
    // covers AC-20
    const res = await request(app)
      .post("/api/chat")
      .send({ message: "Ping", history: [] })
      .expect(200);

    expect(res.body.reply).toBeTruthy();
    expect(res.body.error).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/OPENAI_API_KEY/);
    expect(JSON.stringify(res.body)).not.toMatch(/sk-[a-zA-Z0-9]{10,}/);
  });

  it("returns structured errors on failure without a fake assistant reply body", async () => {
    // covers AC-18
    vi.spyOn(await import("../services/llmService.js"), "completeChat").mockRejectedValueOnce(
      new Error("LLM request failed"),
    );

    const res = await request(app)
      .post("/api/chat")
      .send({ message: "Hello", history: [] })
      .expect(502);

    expect(res.body.error).toBeTypeOf("string");
    expect(res.body.reply).toBeUndefined();
  });

  it("rejects empty messages with 400 and does not return assistant text", async () => {
    // covers AC-8
    const res = await request(app)
      .post("/api/chat")
      .send({ message: "   ", history: [] })
      .expect(400);

    expect(res.body.error).toMatch(/required/i);
    expect(res.body.reply).toBeUndefined();
  });

  it("handles tip requests as standard chat messages", async () => {
    // covers AC-6
    const res = await request(app)
      .post("/api/chat")
      .send({ message: "Give me tips for studying", history: [] })
      .expect(200);

    expect(res.body.reply).toMatch(/tips?/i);
  });

  it("returns multiple numbered actionable tips for tip intent in mock mode", async () => {
    // covers AC-7
    const res = await request(app)
      .post("/api/chat")
      .send({ message: "Give me advice on staying focused", history: [] })
      .expect(200);

    const numbered = res.body.reply
      .split("\n")
      .filter((line) => /^\d+\.\s+/.test(line.trim()));
    expect(numbered.length).toBeGreaterThanOrEqual(3);
  });

  it("includes prior turns from history when generating a follow-up reply", async () => {
    // covers AC-16
    const completeSpy = vi.spyOn(await import("../services/llmService.js"), "completeChat");
    await request(app)
      .post("/api/chat")
      .send({
        message: "Follow up",
        history: [
          { role: "user", content: "Tell me about focus" },
          { role: "assistant", content: "Focus requires planning." },
        ],
      })
      .expect(200);

    expect(completeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Follow up",
        history: expect.arrayContaining([
          { role: "user", content: "Tell me about focus" },
          { role: "assistant", content: "Focus requires planning." },
        ]),
      }),
    );
  });

  it("supports the first message with an empty history array", async () => {
    // covers AC-23
    const res = await request(app)
      .post("/api/chat")
      .send({ message: "Start conversation", history: [] })
      .expect(200);

    expect(res.body.reply).toBeTypeOf("string");
  });

  it("exposes tip guidance in the default system prompt", () => {
    // covers AC-7
    expect(DEFAULT_SYSTEM_PROMPT).toMatch(/tips?|advice|suggest/i);
    expect(DEFAULT_SYSTEM_PROMPT).toMatch(/3|three/i);
  });
});

describe("llmService.completeChat", () => {
  it("never returns raw API key material from the adapter", async () => {
    // covers AC-20
    process.env.LLM_MOCK = "true";
    const reply = await completeChat({
      message: "Hello",
      history: [],
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
    });
    expect(reply).not.toMatch(/sk-[a-zA-Z0-9]{10,}/);
    expect(reply).not.toMatch(/OPENAI_API_KEY/);
  });
});
