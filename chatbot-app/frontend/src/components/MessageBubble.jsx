/**
 * @param {{ role: string, content: string }} props
 */
export function MessageBubble({ role, content }) {
  const isUser = role === "user";
  return (
    <article
      className={`message-bubble message-bubble--${isUser ? "user" : "assistant"}`}
      style={{ overflowX: "hidden" }}
    >
      <span className="message-bubble__role">{isUser ? "You" : "Assistant"}</span>
      <p className="message-bubble__content">{content}</p>
    </article>
  );
}
