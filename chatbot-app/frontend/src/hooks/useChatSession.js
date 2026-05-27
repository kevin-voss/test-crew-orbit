import { useCallback, useRef, useState } from "react";
import * as chatClient from "../api/chatClient.js";

/**
 * @returns {string}
 */
function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useChatSession() {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("idle");
  const [validationError, setValidationError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const inFlightRef = useRef(false);

  const sendMessage = useCallback(
    async (rawText) => {
      const text = rawText.trim();
      if (!text) {
        setValidationError("Please enter a message.");
        return;
      }
      if (inFlightRef.current) {
        return;
      }

      setValidationError("");
      setErrorMessage("");

      const userMsg = {
        id: createId(),
        role: "user",
        content: text,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      inFlightRef.current = true;
      setStatus("loading");

      try {
        const history = messages.map(({ role, content }) => ({ role, content }));
        const reply = await chatClient.sendMessage({ message: text, history });
        setMessages((prev) => [
          ...prev,
          {
            id: createId(),
            role: "assistant",
            content: reply,
            createdAt: Date.now(),
          },
        ]);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Couldn't get a reply. Try again.",
        );
      } finally {
        inFlightRef.current = false;
        setStatus("idle");
      }
    },
    [messages],
  );

  const dismissError = useCallback(() => {
    setErrorMessage("");
  }, []);

  return {
    messages,
    status,
    validationError,
    errorMessage,
    sendMessage,
    dismissError,
  };
}
