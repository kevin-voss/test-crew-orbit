import { ChatLayout } from "./components/ChatLayout.jsx";
import { useChatSession } from "./hooks/useChatSession.js";

export default function App() {
  const {
    messages,
    sendMessage,
    validationError,
    errorMessage,
    status,
  } = useChatSession();

  return (
    <ChatLayout
      messages={messages}
      onSend={sendMessage}
      validationError={validationError}
      errorMessage={errorMessage}
      isLoading={status === "loading"}
    />
  );
}
