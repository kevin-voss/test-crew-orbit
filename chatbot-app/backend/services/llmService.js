export const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant in a chat app. Answer clearly and conversationally.

When the user asks for tips, advice, or suggestions (explicitly or implicitly):
- Provide at least 3 concrete, actionable tips
- Use a numbered or bulleted list
- Tie tips to the user's stated topic or prior conversation context
- Keep each tip specific enough to act on immediately

For general chat, respond naturally and reference earlier messages when relevant.`;

const TIP_INTENT = /\btips?\b|\badvice\b|\bsuggest/i;

/**
 * @param {string} message
 * @returns {string}
 */
function mockReply(message) {
  if (TIP_INTENT.test(message)) {
    const topic =
      message
        .replace(/give me (tips?|advice) (for|on)?/i, "")
        .replace(/can you suggest/i, "")
        .trim() || "your topic";
    return `Here are practical tips for ${topic}:\n1. Break work into 25-minute focused blocks.\n2. Remove phone notifications during sessions.\n3. Review goals at the start of each day.\n4. Take a short walk between blocks.`;
  }
  return `Mock assistant: ${message}`;
}

/**
 * @param {{ message: string, history: Array<{ role: string, content: string }>, systemPrompt?: string }} params
 * @returns {Promise<string>}
 */
export async function completeChat({ message, history, systemPrompt = DEFAULT_SYSTEM_PROMPT }) {
  if (process.env.LLM_MOCK === "true" || !process.env.OPENAI_API_KEY) {
    return mockReply(message);
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages,
    }),
  });

  if (!res.ok) {
    throw new Error("LLM request failed");
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM request failed");
  }
  return content;
}
