import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChatSession } from "../src/hooks/useChatSession.js";
import * as chatClient from "../src/api/chatClient.js";

describe("useChatSession — QA adversarial", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not append assistant bubbles for whitespace-only API replies", async () => {
    vi.spyOn(chatClient, "sendMessage").mockResolvedValue("   ");
    const { result } = renderHook(() => useChatSession());

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    expect(result.current.messages.filter((m) => m.role === "assistant")).toHaveLength(0);
    expect(result.current.errorMessage.length).toBeGreaterThan(0);
  });

  it("passes prior failed user turns in history on the next successful send", async () => {
    const sendSpy = vi
      .spyOn(chatClient, "sendMessage")
      .mockRejectedValueOnce(new Error("Outage"))
      .mockResolvedValueOnce("Recovered");

    const { result } = renderHook(() => useChatSession());

    await act(async () => {
      await result.current.sendMessage("First");
    });
    await act(async () => {
      await result.current.sendMessage("Second");
    });

    const lastCall = sendSpy.mock.calls.at(-1)?.[0];
    expect(lastCall.history).toEqual(
      expect.arrayContaining([{ role: "user", content: "First" }]),
    );
    expect(lastCall.history.some((m) => m.role === "assistant")).toBe(false);
  });

  it("serializes overlapping send attempts so only one in-flight request uses the pre-send history snapshot", async () => {
    const histories = [];
    let resolveFirst;
    vi.spyOn(chatClient, "sendMessage").mockImplementation(async (payload) => {
      histories.push([...payload.history]);
      if (histories.length === 1) {
        return new Promise((resolve) => {
          resolveFirst = () => resolve("First reply");
        });
      }
      return "Second reply";
    });

    const { result } = renderHook(() => useChatSession());

    act(() => {
      void result.current.sendMessage("First");
      void result.current.sendMessage("Second");
    });

    await waitFor(() => {
      expect(result.current.messages.filter((m) => m.role === "user")).toHaveLength(1);
    });

    await act(async () => {
      resolveFirst();
    });

    await act(async () => {
      await result.current.sendMessage("Third");
    });

    expect(histories[0]).toEqual([]);
    const thirdCall = histories.at(-1) ?? [];
    expect(thirdCall).toEqual(
      expect.arrayContaining([
        { role: "user", content: "First" },
        { role: "assistant", content: "First reply" },
      ]),
    );
  });
});
