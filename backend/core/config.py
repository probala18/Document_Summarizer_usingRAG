"""Application configuration using Pydantic Settings."""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings

_INSECURE_DEFAULT = "change-me-in-production-32-chars!!"


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Academic Assistant"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Security
    SECRET_KEY: str = os.environ.get("SESSION_SECRET", _INSECURE_DEFAULT)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "")

    # Mistral LLM
    MISTRAL_API_KEY: str = os.environ.get("MISTRAL_API_KEY", "")
    MISTRAL_MODEL: str = "mistral-large-latest"

    # Embeddings
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"

    # ChromaDB
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    CHROMA_COLLECTION_NAME: str = "academic_documents"

    # File upload
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 100
    ALLOWED_EXTENSIONS: list = [".pdf", ".docx", ".txt"]

    # Chunking
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200

    # RAG
    RETRIEVAL_K: int = 5

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
