# Live Streaming Chat

All work for this feature lives in this subfolder.

## Layout

| Path | Stack | Purpose |
|------|--------|---------|
| `frontend/` | React, JavaScript, Bun, Tailwind + shadcn-ready layout | Streaming chat UI and client |
| `backend/` | Spring Boot, H2 | API and persistence for chat |

## Sub-story flow

1. **Sub-story 1 — Base structure** (this milestone): `frontend/` and `backend/` trees, Bun + Vite + shadcn config (`components.json`), Spring Boot shell + H2. No chat feature code yet.
2. **Sub-story 2 — Frontend**: Streaming chat UX in `frontend/src/` (components in `src/components/`, shadcn UI in `src/components/ui/`).
3. **Sub-story 3 — Backend**: REST or WebSocket API, domain, and JPA under `backend/src/main/java/com/livestreamingchat/` (tests under `src/test/java/`).

See each subdirectory README for commands and conventions.
