import { MessageList } from "./MessageList.jsx";
import { MessageInput } from "./MessageInput.jsx";

/**
 * @param {{
 *   messages: Array<{ id: string, role: string, content: string }>,
 *   onSend: (text: string) => void | Promise<void>,
 *   validationError?: string,
 *   errorMessage?: string,
 *   isLoading?: boolean,
 * }} props
 */
export function ChatLayout({
  messages,
  onSend,
  validationError,
  errorMessage,
  isLoading,
}) {
  return (
    <main className="chat-layout" style={{ maxWidth: "720px", overflowX: "hidden" }}>
      <header className="chat-header">
        <h1>Chat Assistant</h1>
        <p className="chat-header__hint">
          Ask anything, or try: Give me tips for staying focused while studying
        </p>
      </header>

      {errorMessage ? (
        <div className="chat-error" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <MessageList messages={messages} isLoading={isLoading} />

      <footer className="chat-footer">
        <MessageInput
          onSend={onSend}
          validationError={validationError}
          isLoading={isLoading}
        />
      </footer>
    </main>
  );
}
