import { useState } from "react";

/**
 * @param {{
 *   onSend: (text: string) => void | Promise<void>,
 *   validationError?: string,
 *   isLoading?: boolean,
 * }} props
 */
export function MessageInput({ onSend, validationError, isLoading }) {
  const [value, setValue] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    void onSend(value);
    if (value.trim()) {
      setValue("");
    }
  };

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <label className="message-input__label" htmlFor="chat-message">
        Message
      </label>
      <textarea
        id="chat-message"
        className="message-input__field"
        aria-label="Message"
        rows={2}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Type your message…"
        disabled={false}
      />
      {validationError ? (
        <p className="message-input__error" role="alert">
          {validationError}
        </p>
      ) : null}
      <button
        type="submit"
        className="message-input__send"
        aria-label="Send"
        disabled={isLoading}
      >
        Send
      </button>
    </form>
  );
}
