/**
 * @param {{
 *   errorMessage?: string,
 *   onDismissError?: () => void,
 *   isLoading?: boolean,
 * }} props
 */
export function ChatStatus({ errorMessage, onDismissError, isLoading }) {
  return (
    <>
      {errorMessage ? (
        <div className="chat-error" role="alert">
          <span className="chat-error__text">{errorMessage}</span>
          {onDismissError ? (
            <button
              type="button"
              className="chat-error__dismiss"
              aria-label="Dismiss error"
              onClick={onDismissError}
            >
              ×
            </button>
          ) : null}
        </div>
      ) : null}
      {isLoading ? (
        <p className="chat-status__loading" aria-live="polite">
          Getting a reply…
        </p>
      ) : null}
    </>
  );
}
