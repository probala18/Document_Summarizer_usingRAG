"""Document processing service: extract text, chunk, embed, store."""

import os
import re
import logging
from typing import List, Tuple

from sqlalchemy.orm import Session

from backend.core.database import SessionLocal
from backend.core.config import get_settings
from backend.models.document import Document, DocumentStatus

logger = logging.getLogger(__name__)
settings = get_settings()


def extract_text_from_pdf(file_path: str) -> Tuple[str, int]:
    """Extract text from a PDF file. Returns (text, page_count)."""
    import fitz  # PyMuPDF

    doc = fitz.open(file_path)
    page_count = len(doc)
    text_parts = []

    for page_num, page in enumerate(doc):
        text = page.get_text("text")
        # Add page marker for citation tracking
        text_parts.append(f"[PAGE {page_num + 1}]\n{text}")

    doc.close()
    return "\n\n".join(text_parts), page_count


def extract_text_from_docx(file_path: str) -> Tuple[str, int]:
    """Extract text from a DOCX file. Returns (text, approximate_page_count)."""
    from docx import Document as DocxDocument

    doc = DocxDocument(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    text = "\n\n".join(paragraphs)
    # Estimate pages: ~300 words per page
    word_count = len(text.split())
    page_count = max(1, word_count // 300)
    return text, page_count


def extract_text_from_txt(file_path: str) -> Tuple[str, int]:
    """Extract text from a TXT file."""
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()
    word_count = len(text.split())
    page_count = max(1, word_count // 300)
    return text, page_count


def clean_text(text: str) -> str:
    """Clean extracted text: remove excessive whitespace, page artifacts."""
    # Remove excessive newlines
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Remove excessive spaces
    text = re.sub(r" {3,}", " ", text)
    # Remove common header/footer patterns (page numbers standalone)
    text = re.sub(r"^\s*\d+\s*$", "", text, flags=re.MULTILINE)
    return text.strip()


def split_into_chunks(text: str) -> List[Tuple[str, dict]]:
    """Split text into semantic chunks with metadata."""
    from langchain.text_splitter import RecursiveCharacterTextSplitter

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks = splitter.split_text(text)

    # Build metadata for each chunk
    results = []
    for i, chunk in enumerate(chunks):
        # Try to extract page number from chunk content
        page_match = re.search(r"\[PAGE (\d+)\]", chunk)
        page_num = int(page_match.group(1)) if page_match else None

        # Clean page markers from chunk
        clean_chunk = re.sub(r"\[PAGE \d+\]\n?", "", chunk).strip()

        meta = {
            "chunk_index": i,
            "page_number": page_num,
            "char_count": len(clean_chunk),
        }
        results.append((clean_chunk, meta))

    return results


def process_document(document_id: str, file_path: str, ext: str) -> None:
    """
    Background task: process a document — extract text, chunk, embed, store.
    This runs in a background thread via FastAPI BackgroundTasks.
    """
    db: Session = SessionLocal()

    try:
        # Update status to processing
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return

        doc.status = DocumentStatus.PROCESSING
        db.commit()

        # 1. Extract text
        logger.info(f"Extracting text from {file_path} (ext={ext})")
        if ext == ".pdf":
            raw_text, page_count = extract_text_from_pdf(file_path)
        elif ext == ".docx":
            raw_text, page_count = extract_text_from_docx(file_path)
        elif ext == ".txt":
            raw_text, page_count = extract_text_from_txt(file_path)
        else:
            raise ValueError(f"Unsupported file type: {ext}")

        # 2. Clean text
        clean = clean_text(raw_text)
        word_count = len(clean.split())

        # 3. Chunk
        chunks_with_meta = split_into_chunks(clean)
        if not chunks_with_meta:
            raise ValueError("No text could be extracted from document")

        chunks = [c[0] for c in chunks_with_meta]
        metadatas = [c[1] for c in chunks_with_meta]

        # 4. Generate embeddings
        logger.info(f"Generating embeddings for {len(chunks)} chunks")
        from backend.services.embedding_service import embed_texts
        embeddings = embed_texts(chunks)

        # 5. Store in ChromaDB
        logger.info(f"Storing embeddings in vector store")
        from backend.rag.vector_store import add_documents_to_store
        add_documents_to_store(document_id, chunks, embeddings, metadatas)

        # 6. Generate a quick summary for the document record
        short_summary = clean[:500] + "..." if len(clean) > 500 else clean

        # Update document record
        doc.status = DocumentStatus.READY
        doc.page_count = page_count
        doc.word_count = word_count
        doc.summary = short_summary
        db.commit()
        logger.info(f"Document {document_id} processed successfully")

    except Exception as e:
        logger.error(f"Error processing document {document_id}: {e}", exc_info=True)
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = DocumentStatus.ERROR
            doc.error_message = str(e)
            db.commit()
    finally:
        db.close()
