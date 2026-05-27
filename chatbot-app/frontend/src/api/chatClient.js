const INVISIBLE_ONLY = /^[\s\u200b-\u200d\ufeff]*$/;

/**
 * @param {unknown} reply
 * @returns {string}
 */
export function assertValidReply(reply) {
  if (typeof reply !== "string" || INVISIBLE_ONLY.test(reply)) {
    throw new Error("Couldn't get a reply. Try again.");
  }
  return reply;
}

/**
 * @param {{ message: string, history: Array<{ role: string, content: string }> }} payload
 * @returns {Promise<string>}
 */
export async function sendMessage({ message, history }) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error ?? "Couldn't get a reply. Try again.");
  }

  return assertValidReply(data.reply);
}
