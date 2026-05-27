import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChatSession } from "../src/hooks/useChatSession.js";
import * as chatClient from "../src/api/chatClient.js";

describe("useChatSession", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("allows sending a trimmed non-empty message", async () => {
    // covers AC-2
    vi.spyOn(chatClient, "sendMessage").mockResolvedValue("Hello back");
    const { result } = renderHook(() => useChatSession());

    await act(async () => {
      await result.current.sendMessage("  Hello  ");
    });

    expect(result.current.messages.some((m) => m.role === "user" && m.content === "Hello")).toBe(
      true,
    );
  });

  it("appends the user message before the assistant reply arrives", async () => {
    // covers AC-3
    let resolveReply;
    vi.spyOn(chatClient, "sendMessage").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReply = () => resolve("Delayed reply");
        }),
    );

    const { result } = renderHook(() => useChatSession());
    let sendPromise;
    act(() => {
      sendPromise = result.current.sendMessage("Hi");
    });

    await waitFor(() => {
      expect(result.current.messages.filter((m) => m.role === "user")).toHaveLength(1);
    });
    expect(result.current.messages.some((m) => m.role === "assistant")).toBe(false);

    await act(async () => {
      resolveReply();
      await sendPromise;
    });
  });

  it("appends assistant text from a successful completion", async () => {
    // covers AC-4
    vi.spyOn(chatClient, "sendMessage").mockResolvedValue("Assistant says hi");
    const { result } = renderHook(() => useChatSession());

    await act(async () => {
      await result.current.sendMessage("Hi");
    });

    const assistant = result.current.messages.find((m) => m.role === "assistant");
    expect(assistant?.content).toBe("Assistant says hi");
  });

  it("appends follow-up exchanges to the same in-session thread", async () => {
    // covers AC-5
    vi.spyOn(chatClient, "sendMessage")
      .mockResolvedValueOnce("First reply")
      .mockResolvedValueOnce("Second reply");
    const { result } = renderHook(() => useChatSession());

    await act(async () => {
      await result.current.sendMessage("First");
    });
    await act(async () => {
      await result.current.sendMessage("Second");
    });

    expect(result.current.messages.filter((m) => m.role === "user")).toHaveLength(2);
    expect(result.current.messages.filter((m) => m.role === "assistant")).toHaveLength(2);
  });

  it("blocks empty or whitespace-only sends with inline validation and no API call", async () => {
    // covers AC-8
    const sendSpy = vi.spyOn(chatClient, "sendMessage");
    const { result } = renderHook(() => useChatSession());

    await act(async () => {
      await result.current.sendMessage("   ");
    });

    expect(sendSpy).not.toHaveBeenCalled();
    expect(result.current.validationError?.length ?? 0).toBeGreaterThan(0);
    expect(result.current.messages).toHaveLength(0);
  });

  it("enters a loading state while a reply is pending", async () => {
    // covers AC-9
    let resolveReply;
    vi.spyOn(chatClient, "sendMessage").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReply = () => resolve("Done");
        }),
    );

    const { result } = renderHook(() => useChatSession());
    act(() => {
      void result.current.sendMessage("Wait for it");
    });

    await waitFor(() => {
      expect(result.current.status).toBe("loading");
    });

    await act(async () => {
      resolveReply();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("idle");
    });
  });

  it("surfaces a friendly error without inserting a fake assistant message", async () => {
    // covers AC-10
    vi.spyOn(chatClient, "sendMessage").mockRejectedValue(new Error("Provider unavailable"));
    const { result } = renderHook(() => useChatSession());

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    expect(result.current.errorMessage?.length ?? 0).toBeGreaterThan(0);
    expect(result.current.messages.some((m) => m.role === "assistant")).toBe(false);
    expect(result.current.messages.filter((m) => m.role === "user")).toHaveLength(1);
  });

  it("allows another send after a failure without requiring a page refresh", async () => {
    // covers AC-11
    vi.spyOn(chatClient, "sendMessage")
      .mockRejectedValueOnce(new Error("Temporary outage"))
      .mockResolvedValueOnce("Recovered");
    const { result } = renderHook(() => useChatSession());

    await act(async () => {
      await result.current.sendMessage("First try");
    });
    await act(async () => {
      await result.current.sendMessage("Retry");
    });

    expect(result.current.messages.filter((m) => m.role === "assistant")).toHaveLength(1);
    expect(result.current.messages.at(-1)?.content).toBe("Recovered");
  });

  it("preserves chronological send order after multiple messages", async () => {
    // covers AC-15
    vi.spyOn(chatClient, "sendMessage").mockImplementation(async ({ message }) => `Echo: ${message}`);
    const { result } = renderHook(() => useChatSession());

    await act(async () => {
      await result.current.sendMessage("One");
    });
    await act(async () => {
      await result.current.sendMessage("Two");
    });

    const roles = result.current.messages.map((m) => m.role);
    expect(roles).toEqual(["user", "assistant", "user", "assistant"]);
    const contents = result.current.messages.map((m) => m.content);
    expect(contents[0]).toBe("One");
    expect(contents[2]).toBe("Two");
  });

  it("includes prior user and assistant turns as history on follow-up sends", async () => {
    // covers AC-16
    const sendSpy = vi
      .spyOn(chatClient, "sendMessage")
      .mockResolvedValueOnce("First")
      .mockResolvedValueOnce("Second");
    const { result } = renderHook(() => useChatSession());

    await act(async () => {
      await result.current.sendMessage("Hello");
    });
    await act(async () => {
      await result.current.sendMessage("Follow up");
    });

    const lastCall = sendSpy.mock.calls.at(-1)?.[0];
    expect(lastCall.history).toEqual(
      expect.arrayContaining([
        { role: "user", content: "Hello" },
        { role: "assistant", content: "First" },
      ]),
    );
    expect(lastCall.message).toBe("Follow up");
  });

  it("ignores rapid consecutive sends while a request is in flight", async () => {
    // covers AC-21
    let resolveReply;
    const sendSpy = vi.spyOn(chatClient, "sendMessage").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReply = () => resolve("Only one");
        }),
    );

    const { result } = renderHook(() => useChatSession());
    act(() => {
      void result.current.sendMessage("First");
      void result.current.sendMessage("Second");
    });

    await waitFor(() => {
      expect(result.current.messages.filter((m) => m.role === "user")).toHaveLength(1);
    });
    expect(sendSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveReply();
    });
  });

  it("supports the first message with an empty prior history", async () => {
    // covers AC-23
    const sendSpy = vi.spyOn(chatClient, "sendMessage").mockResolvedValue("Welcome");
    const { result } = renderHook(() => useChatSession());

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    expect(sendSpy).toHaveBeenCalledWith({ message: "Hello", history: [] });
    expect(result.current.messages).toHaveLength(2);
  });
});
