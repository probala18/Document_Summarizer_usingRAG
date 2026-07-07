"""ChromaDB vector store setup and management."""

import os
from functools import lru_cache
from typing import List, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

from backend.core.config import get_settings

settings = get_settings()


@lru_cache(maxsize=1)
def get_chroma_client() -> chromadb.PersistentClient:
    """Get the ChromaDB persistent client (cached singleton)."""
    os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
    client = chromadb.PersistentClient(
        path=settings.CHROMA_PERSIST_DIR,
        settings=ChromaSettings(anonymized_telemetry=False),
    )
    return client


def get_vector_store():
    """Get or create the ChromaDB collection."""
    client = get_chroma_client()
    collection = client.get_or_create_collection(
        name=settings.CHROMA_COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
    return collection


def add_documents_to_store(
    document_id: str,
    chunks: List[str],
    embeddings: List[List[float]],
    metadatas: List[dict],
) -> None:
    """Add document chunks and their embeddings to the vector store."""
    collection = get_vector_store()

    ids = [f"{document_id}_{i}" for i in range(len(chunks))]

    # Add document_id and strip None values (ChromaDB only accepts str/int/float/bool)
    clean_metadatas = []
    for meta in metadatas:
        cleaned = {k: v for k, v in meta.items() if v is not None}
        cleaned["document_id"] = document_id
        clean_metadatas.append(cleaned)

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=clean_metadatas,
    )


def query_store(
    document_id: str,
    query_embedding: List[float],
    k: int = 5,
) -> dict:
    """Query the vector store for relevant chunks."""
    collection = get_vector_store()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=k,
        where={"document_id": document_id},
    )
    return results


def delete_document_from_store(document_id: str) -> None:
    """Remove all chunks for a document from the vector store."""
    collection = get_vector_store()
    try:
        collection.delete(where={"document_id": document_id})
    except Exception:
        pass
