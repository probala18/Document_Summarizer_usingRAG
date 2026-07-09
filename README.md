# Academic-AI-Helper

This workspace contains a FastAPI backend + a TypeScript/React frontend UI (plus some generated API client code). The backend supports an AI academic assistant workflow: document upload/processing, RAG-style chat, quizzes/flashcards, dashboards, and document summarization.

> Note: this repo currently has **no top-level `README.md`** in the checked workspace; this file is created/updated to reflect the current structure.

---

## Repo overview (current state)

### Backend (FastAPI)
Folder: `backend/`

Key files:
- `backend/main.py` – FastAPI app entry point, lifespan hooks (startup), CORS, health check, and router mounts.
- `backend/api/routers/*` – API route groups (auth, documents, chat, quiz, flashcards, dashboard, summaries, concepts).
- `backend/core/*` – configuration + database + security helpers.
- `backend/models/*` – SQLAlchemy ORM models (users, documents, chat, quizzes, flashcards).
- `backend/schemas/*` – Pydantic request/response schemas (camelCase aliasing via `backend/schemas/base.py`).
- `backend/services/*` – main “business logic” services (embedding, RAG, document processing, summaries, etc.).

Example route wiring (from `backend/main.py`):
- `/api/healthz`
- `/api/auth/*`
- `/api/documents/*`
- `/api/chat/*`
- `/api/dashboard/*`
- plus additional groups for quizzes and flashcards.

### Frontend UI (React)
Folder(s):
- `artifacts/academic-assistant/` – React app source (Vite + TS).
- `artifacts/mockup-sandbox/` – additional React sandbox/mockup.

Key frontend files (academic-assistant):
- `artifacts/academic-assistant/src/App.tsx`
- `artifacts/academic-assistant/src/pages/*` – pages like dashboard, documents, chat sessions, document/quiz/flashcard details, login/register.
- `artifacts/academic-assistant/src/lib/*` – API upload helpers and shared utilities.

### API client / contract tooling (TypeScript libs)
Folders:
- `lib/api-spec/` – OpenAPI spec and Orval config (`lib/api-spec/openapi.yaml`).
- `lib/api-zod/` and `lib/api-client-react/` – generated client/types.
- `lib/db/` – Drizzle ORM schema scaffolding.

### RAG persistence (Chroma)
Folder: `chroma_db/`
- Contains `chroma.sqlite3` and a persistent collection folder(s), e.g. `chroma_db/<uuid>/...`.

### Uploads & attached assets
- `uploads/` – uploaded documents (`.txt` and `.docx` shown).
- `attached_assets/` – images used by the UI.

---

## Current “in-use” commands / scripts

Top-level `main.py` currently prints:
- `Hello from repl-nix-workspace!`

The main backend app is `backend/main.py`.

Frontend/dev commands are defined in the generated React workspace under `artifacts/academic-assistant/`.

---

## Bottlenecks / TODOs (based on current repo snapshot)
- A lot of dependency/config scaffolding exists, but the root `main.py` is still a placeholder print.
- There was no root README; documentation should be consolidated at repo root (done here).

---

## Directory map (quick)
- `backend/` – FastAPI backend
- `artifacts/academic-assistant/` – React UI
- `artifacts/mockup-sandbox/` – React sandbox
- `lib/` – TS helpers (API spec, generated clients/types, db scaffolding)
- `chroma_db/` – Chroma persistence
- `uploads/` – uploaded docs

