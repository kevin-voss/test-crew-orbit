import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import App from "../src/App.jsx";

const TIP_REQUEST =
  "Give me three tips for staying focused while studying";

/**
 * @param {number} text
 */
function countNumberedTips(text) {
  return text.split("\n").filter((line) => /^\d+\.\s+/.test(line.trim())).length;
}

describe("Chatbot acceptance", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("happy path: greets, returns tips, and sends follow-up with prior context", async () => {
    // covers AC-1
    // covers AC-2
    // covers AC-3
    // covers AC-4
    // covers AC-5
    // covers AC-6
    // covers AC-7
    // covers AC-16
    let call = 0;
    globalThis.fetch = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      call += 1;
      if (call === 1) {
        return { ok: true, json: async () => ({ reply: "Hello! How can I help?" }) };
      }
      if (call === 2) {
        return {
          ok: true,
          json: async () => ({
            reply:
              "Here are practical tips for staying focused while studying:\n1. Use 25-minute focus blocks.\n2. Silence phone notifications.\n3. Review goals before each session.\n4. Take short breaks between blocks.",
          }),
        };
      }
      const hasPriorStudyContext = body.history?.some((m) =>
        /studying|focus/i.test(m.content),
      );
      expect(hasPriorStudyContext).toBe(true);
      return {
        ok: true,
        json: async () => ({
          reply:
            "Building on the focus blocks we discussed, try scheduling them at the same time daily.",
        }),
      };
    });

    render(<App />);

    expect(screen.getByRole("region", { name: /message history|messages/i })).toBeTruthy();
    const input = screen.getByRole("textbox", { name: /message/i });
    const send = screen.getByRole("button", { name: /send/i });

    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.click(send);

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeTruthy();
      expect(screen.getByText(/How can I help/i)).toBeTruthy();
    });

    fireEvent.change(input, { target: { value: TIP_REQUEST } });
    fireEvent.click(send);

    await waitFor(() => {
      const assistantTip = screen.getByText(/Here are practical tips/i);
      expect(countNumberedTips(assistantTip.textContent)).toBeGreaterThanOrEqual(3);
    });

    fireEvent.change(input, {
      target: { value: "Can you elaborate on the first tip?" },
    });
    fireEvent.click(send);

    await waitFor(() => {
      expect(
        screen.getByText(/Building on the focus blocks we discussed/i),
      ).toBeTruthy();
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it("negative path: empty submit shows validation and does not call the API", async () => {
    // covers AC-8
    // covers AC-18
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    render(<App />);

    const send = screen.getByRole("button", { name: /send/i });
    fireEvent.click(send);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/enter a message|required/i)).toBeTruthy();
    expect(screen.queryByText(/Mock assistant|How can I help/i)).toBeNull();

    const input = screen.getByRole("textbox", { name: /message/i });
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ reply: "Got it" }),
    }));
    fireEvent.change(input, { target: { value: "Valid message" } });
    fireEvent.click(send);

    await waitFor(() => {
      expect(screen.getByText("Valid message")).toBeTruthy();
      expect(screen.getByText("Got it")).toBeTruthy();
    });
  });

  it("error path: provider failure keeps history and allows a later successful send", async () => {
    // covers AC-9
    // covers AC-10
    // covers AC-11
    let call = 0;
    globalThis.fetch = vi.fn(async () => {
      call += 1;
      if (call === 1) {
        return {
          ok: false,
          status: 502,
          json: async () => ({ error: "Couldn’t get a reply. Try again." }),
        };
      }
      return { ok: true, json: async () => ({ reply: "Back online" }) };
    });

    render(<App />);

    const input = screen.getByRole("textbox", { name: /message/i });
    const send = screen.getByRole("button", { name: /send/i });

    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.click(send);

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeTruthy();
      expect(screen.getByText(/Couldn't get a reply|Try again/i)).toBeTruthy();
      expect(screen.queryByText("Back online")).toBeNull();
    });

    fireEvent.change(input, { target: { value: "Hello again" } });
    fireEvent.click(send);

    await waitFor(() => {
      expect(screen.getByText("Back online")).toBeTruthy();
    });

    const thread = screen.getByRole("region", { name: /message history|messages/i });
    expect(within(thread).getAllByText(/Hello/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders distinguishable user and assistant messages and keeps input enabled", async () => {
    // covers AC-12
    // covers AC-13
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ reply: "Assistant response" }),
    }));

    render(<App />);

    const input = screen.getByRole("textbox", { name: /message/i });
    fireEvent.change(input, { target: { value: "User line" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText("User line").closest(".message-bubble--user")).toBeTruthy();
      expect(
        screen.getByText("Assistant response").closest(".message-bubble--assistant"),
      ).toBeTruthy();
    });

    expect(screen.getByRole("textbox", { name: /message/i })).not.toBeDisabled();
  });

  it("exposes scrollable in-session history as the thread grows", () => {
    // covers AC-14
    const { container } = render(<App />);
    const list = container.querySelector(".message-list");
    expect(list).toBeTruthy();
    const styles = getComputedStyle(list);
    expect(styles.overflowY).toBe("auto");
  });

  it("uses a desktop-friendly layout without horizontal overflow on the chat shell", () => {
    // covers AC-19
    const { container } = render(<App />);
    const shell = container.querySelector(".chat-layout, .chat-shell, main");
    expect(shell).toBeTruthy();
    const styles = getComputedStyle(shell);
    expect(styles.maxWidth === "none" || parseInt(styles.maxWidth, 10) > 0).toBe(true);
    expect(styles.overflowX === "visible" || styles.overflowX === "hidden").toBe(true);
  });

  it("keeps long user and assistant text readable inside bubbles", async () => {
    // covers AC-22
    const longText = "word ".repeat(200).trim();
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ reply: longText }),
    }));

    render(<App />);

    const input = screen.getByRole("textbox", { name: /message/i });
    fireEvent.change(input, { target: { value: longText.slice(0, 80) } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      const bubble = screen
        .getByText(longText.slice(0, 40), {
          exact: false,
          selector: ".message-bubble--assistant .message-bubble__content",
        })
        .closest(".message-bubble");
      expect(bubble).toBeTruthy();
      const styles = getComputedStyle(bubble);
      expect(styles.overflowX === "visible" || styles.overflowX === "hidden").toBe(true);
    });
  });

  it("tip requests are sent like normal chat messages and yield actionable multi-tip replies", async () => {
    // covers AC-6
    // covers AC-7
    globalThis.fetch = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      expect(body.message).toMatch(/tips/i);
      return {
        ok: true,
        json: async () => ({
          reply:
            "Tips for debugging:\n1. Reproduce the bug with a minimal example.\n2. Read the latest error message carefully.\n3. Add logging at the failure boundary.\n4. Compare against a known-good commit.",
        }),
      };
    });

    render(<App />);

    const input = screen.getByRole("textbox", { name: /message/i });
    fireEvent.change(input, { target: { value: "Give me tips for debugging this issue" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      const tipReply = screen.getByText(/Tips for debugging/i, {
        selector: ".message-bubble--assistant .message-bubble__content",
      });
      expect(countNumberedTips(tipReply.textContent)).toBeGreaterThanOrEqual(3);
    });
  });
});
