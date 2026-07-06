---
name: Academic Assistant Architecture
description: Key decisions and gotchas for the AI Academic Assistant project
---

## Stack

- **Backend**: Python FastAPI at `backend/`, run via `python3 -m uvicorn backend.main:app` in the `artifacts/api-server` workflow
- **Frontend**: React + Vite + Tailwind v4 at `artifacts/academic-assistant/`, theme "AuraLearn" dark glassmorphism
- **DB**: Replit PostgreSQL, tables pre-created via `executeSql`; SQLAlchemy also creates on startup
- **Vector store**: ChromaDB at `./chroma_db`
- **Embeddings**: `sentence-transformers` with `BAAI/bge-small-en-v1.5` model
- **LLM**: Mistral Large via `langchain-mistralai`

## Critical Decisions

### camelCase API contract
All Pydantic response schemas inherit from `backend/schemas/base.py::BaseSchema` which:
- Sets `alias_generator=to_camel` so snake_case fields get camelCase aliases
- Overrides `model_dump(by_alias=True)` so FastAPI always returns camelCase JSON
- Matches what the generated TypeScript client in `lib/api-client-react` expects

**Why:** The OpenAPI spec used camelCase for the TS codegen. Pydantic defaults to snake_case. Without this base class every response field would be mismatched.

### main.tsx mounting
The React entry `artifacts/academic-assistant/src/main.tsx` must call `createRoot(document.getElementById('root')!).render(<App />)`. The design subagent initially only exported `App` without mounting it, causing a blank white screen.

### sentence-transformers install issue
`sentence-transformers` may fail with the `installLanguagePackages` callback. Fall back to `pip install sentence-transformers` via ShellExec with a 2-minute timeout. This package requires numpy/scipy which take time.

### Auth token key
Frontend stores JWT in `localStorage` under key `aa_token`. The `custom-fetch.ts` in `lib/api-client-react` reads this key and injects `Authorization: Bearer <token>` on every request.

### CORS
Backend uses `allow_origins=["*"], allow_credentials=False` in development. Do NOT enable `allow_credentials=True` with wildcard origins — it is invalid per CORS spec.

### API prefix
All routes mounted with `/api` prefix. The Replit proxy maps `artifacts/api-server` to `/api`.
