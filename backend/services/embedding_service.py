"""Embedding service using BAAI/bge-small-en-v1.5."""

from functools import lru_cache
from typing import List

from backend.core.config import get_settings

settings = get_settings()


@lru_cache(maxsize=1)
def get_embedding_model():
    """Load and cache the sentence transformer model."""
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return model


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a list of texts."""
    model = get_embedding_model()
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    return embeddings.tolist()


def embed_query(query: str) -> List[float]:
    """Generate an embedding for a single query."""
    model = get_embedding_model()
    # BGE models work best with a query prefix
    prefixed = f"Represent this sentence for searching relevant passages: {query}"
    embedding = model.encode([prefixed], convert_to_numpy=True, show_progress_bar=False)
    return embedding[0].tolist()
