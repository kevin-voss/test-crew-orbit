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

## Environment

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (server only) |
| `OPENAI_MODEL` | Model name (default `gpt-4o-mini`) |
| `LLM_MOCK` | `true` for deterministic mock replies |
| `PORT` | Backend port (default `3001`) |

## Tests

```bash
cd chatbot-app/backend && LLM_MOCK=true npm test
cd chatbot-app/frontend && npm test
```

## Example prompts

- “Hello”
- “Give me three tips for staying focused while studying”
- “Can you elaborate on the first tip?”
