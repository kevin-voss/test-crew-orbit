import { Router } from "express";
import { completeChat } from "../services/llmService.js";

export const chatRouter = Router();

const MAX_HISTORY_TURNS = 40;
const INVISIBLE_ONLY = /^[\s\u200b-\u200d\ufeff]*$/;

/**
 * @param {unknown} reply
 * @returns {reply is string}
 */
function isValidReply(reply) {
  return typeof reply === "string" && !INVISIBLE_ONLY.test(reply);
}

chatRouter.post("/chat", async (req, res) => {
  const { message, history = [] } = req.body ?? {};

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Message is required" });
  }

  const trimmedHistory = Array.isArray(history)
    ? history
        .filter(
          (entry) =>
            entry &&
            (entry.role === "user" || entry.role === "assistant") &&
            typeof entry.content === "string",
        )
        .slice(-MAX_HISTORY_TURNS)
        .map(({ role, content }) => ({ role, content }))
    : [];

  try {
    const reply = await completeChat({
      message: message.trim(),
      history: trimmedHistory,
    });
    if (!isValidReply(reply)) {
      return res.status(502).json({ error: "Couldn't get a reply. Try again." });
    }
    return res.json({ reply });
  } catch {
    return res.status(502).json({ error: "Couldn't get a reply. Try again." });
  }
});
