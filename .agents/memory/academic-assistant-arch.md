---
name: Academic Assistant Architecture
description: Key decisions and gotchas for the AI Academic Assistant project
---

## Stack

- **Backend**: Python FastAPI at `backend/`, run via `python3 -m uvicorn backend.main:app` in the `artifacts/api-server` workflow
- **Frontend**: React + Vite + Tailwind v4 at `artifacts/academic-assistant/`, theme "AuraLearn" dark glassmorphism
- **DB**: Replit PostgreSQL, tables pre-created via `executeSql`; SQLAlchemy also creates on startup
- **Vector store**: ChromaDB at `./chroma_db`
- **Embeddings**: `sentence-transformers` with `BAAI/bge-small-en-v1.5` (dim 384) — install via `pip install sentence-transformers` with ShellExec (≥2 min timeout)
- **LLM**: Mistral Large via `langchain-mistralai`; key stored as `MISTRAL_API_KEY` secret

## Critical Decisions

### camelCase API contract
All Pydantic response schemas inherit from `backend/schemas/base.py::BaseSchema` which sets `alias_generator=to_camel` and overrides `model_dump(by_alias=True)`. Matches what the generated TypeScript client in `lib/api-client-react` expects.

**Why:** OpenAPI codegen produces camelCase TS types; Pydantic defaults to snake_case.

### bcrypt directly, not passlib
`passlib>=1.7.4` + `bcrypt>=4.x` are incompatible — bcrypt 4 rejects passwords >72 bytes which passlib uses internally. `backend/core/security.py` calls `bcrypt` directly.

### JWT secret safety
`backend/core/config.py` falls back to an `_INSECURE_DEFAULT` string if `SESSION_SECRET` is unset. `backend/main.py` logs a warning at startup when detected.

### LangChain text splitter import
`langchain.text_splitter` was removed in LangChain 1.x — must import from `langchain_text_splitters` (separate package, already installed). Use try/except fallback if needed.

### ChromaDB metadata: no None values
ChromaDB's Rust backend rejects `None` values in metadata — only `str`, `int`, `float`, `bool` are accepted. Always strip `None` before calling `collection.add()`. Fixed in `backend/rag/vector_store.py` by filtering with a dict comprehension before adding `document_id`.

### Embedding model warm-up
The `BAAI/bge-small-en-v1.5` model is pre-loaded at startup in the lifespan function (`backend/main.py`). Without this, the first document upload triggered a cold load (~6–20 s of HuggingFace metadata HEAD requests). `local_files_only=True` is tried first to skip network round-trips; falls back to online mode if model isn't cached yet.

### Document processing race condition
`backend/services/document_processor.py` re-checks document existence before the ChromaDB write and before the final DB commit. If deleted during processing, skips write or compensates by removing orphan vectors.

### main.tsx mounting
`artifacts/academic-assistant/src/main.tsx` must call `createRoot(...).render(<App />)`. Exporting only causes a blank white screen.

### Auth token key
Frontend stores JWT in `localStorage` under key `aa_token`. `lib/api-client-react/src/custom-fetch.ts` reads this and injects `Authorization: Bearer <token>`.

### CORS
`allow_origins=["*"], allow_credentials=False`. Never use `allow_credentials=True` with wildcard origins — invalid per CORS spec.

### API prefix
All routes mounted at `/api` prefix in `backend/main.py`.
