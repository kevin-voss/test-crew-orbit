import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble.jsx";

/**
 * @param {{
 *   messages: Array<{ id: string, role: string, content: string }>,
 *   isLoading?: boolean,
 * }} props
 */
export function MessageList({ messages, isLoading }) {
  const listRef = useRef(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <section
      className="message-list"
      ref={listRef}
      aria-label="Message history"
      style={{ overflowY: "auto", flex: 1 }}
    >
      {messages.length === 0 ? (
        <p className="message-list__empty">Send a message to start the conversation.</p>
      ) : null}
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          role={message.role}
          content={message.content}
        />
      ))}
      {isLoading ? (
        <p className="message-list__loading" aria-live="polite">
          Assistant is typing…
        </p>
      ) : null}
    </section>
  );
}
