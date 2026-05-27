# LLM Chatbot

Browser chat app for conversational exchange with an LLM, including natural-language tip requests. Built with HTML, React, and CSS (Vite) plus a small Express backend that keeps API keys off the client.

## Features

- Send messages and receive LLM replies in a chat-style UI
- Multi-turn conversation with prior context sent on each request
- Ask for tips in plain language (e.g. “Give me tips for studying”)
- Session-only history (in-memory until page refresh)

## Prerequisites

- Node 18+ or Bun
- Optional: `OPENAI_API_KEY` in `backend/.env` for live LLM calls

## Frontend only

Run the chat shell without the backend (UI loads; Send requires the API proxy from step 03+):

```bash
cd chatbot-app/frontend
npm install   # or: bun install
npm run dev
```

```bash
cd chatbot-app/frontend
npm test              # Vitest (shell + acceptance when hook/API present)
npm run build
```

## Setup

```bash
# Backend
cd chatbot-app/backend
cp .env.example .env
npm install   # or: bun install

# Frontend
cd ../frontend
npm install   # or: bun install
```

## Development

Run both processes (mock mode works without an API key):

```bash
# Terminal 1
cd chatbot-app/backend
LLM_MOCK=true npm run start

# Terminal 2
cd chatbot-app/frontend
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the backend on port 3001.

If sends fail with a network error, confirm the backend is running on port 3001 and that you started the frontend via `npm run dev` (so the Vite proxy is active). Opening `index.html` directly without the dev server will not proxy `/api`.

## Environment

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (server only) |
| `OPENAI_MODEL` | Model name (default `gpt-4o-mini`) |
| `LLM_MOCK` | `true` for deterministic mock replies |
| `PORT` | Backend port (default `3001`) |

## Mock vs live LLM

| Mode | When | Behavior |
|------|------|----------|
| **Mock** | `LLM_MOCK=true` or no `OPENAI_API_KEY` | Deterministic replies; tip-shaped numbered lists when the message matches tip intent (`tips`, `advice`, `suggest`) |
| **Live** | `OPENAI_API_KEY` set and `LLM_MOCK` unset | OpenAI chat completions; system prompt asks for ≥3 actionable tips on tip requests |

Tip requests are normal chat messages (no separate endpoint). The backend system prompt (`DEFAULT_SYSTEM_PROMPT` in `services/llmService.js`) instructs the model to return numbered, topic-aware suggestions.

## Tests

```bash
# Backend tip behavior + chat contract
cd chatbot-app/backend
LLM_MOCK=true npm test test/chat.test.js

# Frontend acceptance + session + shell
cd chatbot-app/frontend
npm run test test/acceptance.test.js
npm run test test/useChatSession.test.js
npm run test test/shell.test.js
npm run test

# Build + secret leak smoke (AC-20)
npm run build
grep -r "OPENAI_API_KEY" dist/ && exit 1 || echo "AC-20 OK"
grep -r "sk-" dist/ && exit 1 || echo "no sk- keys in bundle"
```

### Test matrix (E2E scenarios)

| Scenario | Test file | What it proves |
|----------|-----------|----------------|
| Happy path (chat → tips → follow-up) | `frontend/test/acceptance.test.js` | User/assistant rows, ≥3 numbered tips, history on follow-up |
| Negative path (empty send) | `frontend/test/acceptance.test.js` | Validation UI, no `fetch` |
| Error path (502 then retry) | `frontend/test/acceptance.test.js` | Error banner, history kept, later send succeeds |
| Tip as normal message | `frontend/test/acceptance.test.js`, `backend/test/chat.test.js` | AC-6, AC-7 |
| No secrets in UI/bundle | `frontend/test/shell.test.js`, build grep | AC-20 |

### Acceptance criteria (feature)

All 23 spec AC-IDs are covered by Vitest in `frontend/test/` and `backend/test/`. Step 04 focuses on **AC-6** (natural-language tips), **AC-7** (multi-tip actionable replies), and **AC-20** (no API keys in client markup or bundle).

## Example prompts

- “Hello”
- “Give me three tips for staying focused while studying”
- “Give me advice on staying focused”
- “Can you suggest ways to debug this issue?”
- “Can you elaborate on the first tip?”

## Manual QA checklist

1. Start backend (`LLM_MOCK=true` or with `OPENAI_API_KEY`) and frontend (`npm run dev`).
2. **Happy path:** Send “Hello” → assistant reply. Send a tip request → reply has at least three numbered items tied to your topic. Send a follow-up → reply references earlier context.
3. **Negative path:** Click Send with an empty input → inline validation; no new assistant message.
4. **Error path:** Stop the backend, send a message → error banner; restart backend, send again → success without losing prior messages.
5. **AC-20:** Inspect `frontend/dist/assets/*.js` after `npm run build` — no `OPENAI_API_KEY` or `sk-` key patterns.
