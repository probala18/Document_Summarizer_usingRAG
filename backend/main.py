"""
AI Academic Assistant — FastAPI Application Entry Point

Architecture:
  /api/auth/*         Authentication (register, login, me)
  /api/documents/*    Document upload, listing, deletion
  /api/chat/*         RAG-powered chat sessions and messages
  /api/quiz/*         Quiz generation and management
  /api/flashcards/*   Flashcard generation and management
  /api/dashboard/*    Stats and activity feed
  /api/healthz        Health check
"""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.core.config import get_settings, _INSECURE_DEFAULT
from backend.core.database import create_tables

# Import all models to ensure they are registered with Base
import backend.models.user  # noqa
import backend.models.document  # noqa
import backend.models.chat  # noqa
import backend.models.quiz  # noqa
import backend.models.flashcard  # noqa

from backend.api.routers import auth, documents, summaries, concepts, chat, quiz, flashcards, dashboard

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # Fail fast if the JWT secret is still the insecure default
    if settings.SECRET_KEY == _INSECURE_DEFAULT:
        logger.warning(
            "SESSION_SECRET is not set — using insecure default key. "
            "Set SESSION_SECRET in your environment before going to production."
        )

    # Create upload directory
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)

    # Create database tables
    if settings.DATABASE_URL:
        try:
            create_tables()
            logger.info("Database tables created/verified")
        except Exception as e:
            logger.error(f"Database setup error: {e}")
    else:
        logger.warning("DATABASE_URL not set — database features unavailable")

    logger.info("Application startup complete")
    yield

    logger.info("Application shutdown")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered academic assistant API",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/api/healthz")
def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}


# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(summaries.router, prefix="/api/documents", tags=["summaries"])
app.include_router(concepts.router, prefix="/api/documents", tags=["concepts"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(quiz.router, prefix="/api", tags=["quiz"])
app.include_router(flashcards.router, prefix="/api", tags=["flashcards"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])


# ─── Global exception handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
