import { MessageList } from "./MessageList.jsx";
import { MessageInput } from "./MessageInput.jsx";
import { ChatStatus } from "./ChatStatus.jsx";

/**
 * @param {{
 *   messages: Array<{ id: string, role: string, content: string }>,
 *   onSend: (text: string) => void | Promise<void>,
 *   validationError?: string,
 *   errorMessage?: string,
 *   onDismissError?: () => void,
 *   isLoading?: boolean,
 * }} props
 */
export function ChatLayout({
  messages,
  onSend,
  validationError,
  errorMessage,
  onDismissError,
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

      <ChatStatus
        errorMessage={errorMessage}
        onDismissError={onDismissError}
        isLoading={isLoading}
      />

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
