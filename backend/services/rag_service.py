"""RAG service: retrieve relevant chunks and generate answers using Mistral."""

import logging
from typing import List, Tuple

from backend.core.config import get_settings
from backend.schemas.chat import ChatSource

logger = logging.getLogger(__name__)
settings = get_settings()

RAG_PROMPT_TEMPLATE = """You are an expert academic assistant helping students understand their study materials.

Use the following context excerpts from the document to answer the student's question.
Be precise, educational, and cite the relevant passages where appropriate.
If the answer is not found in the context, say so honestly and provide general guidance.

Context:
{context}

Chat History:
{chat_history}

Student Question: {question}

Answer (be thorough but concise, cite page numbers when available):"""


def get_llm():
    """Initialize the Mistral LLM."""
    if not settings.MISTRAL_API_KEY:
        raise ValueError(
            "MISTRAL_API_KEY is not configured. Please set the MISTRAL_API_KEY environment variable."
        )

    from langchain_mistralai import ChatMistralAI

    return ChatMistralAI(
        model=settings.MISTRAL_MODEL,
        mistral_api_key=settings.MISTRAL_API_KEY,
        temperature=0.3,
        max_tokens=2048,
    )


def answer_question(
    document_id: str,
    question: str,
    chat_history: List[Tuple[str, str]] = None,
) -> Tuple[str, List[ChatSource]]:
    """
    Answer a question using RAG:
    1. Embed the question
    2. Retrieve relevant chunks from vector store
    3. Build prompt with context
    4. Generate answer with Mistral
    """
    from backend.services.embedding_service import embed_query
    from backend.rag.vector_store import query_store

    # 1. Embed the question
    query_embedding = embed_query(question)

    # 2. Retrieve relevant chunks
    results = query_store(document_id, query_embedding, k=settings.RETRIEVAL_K)

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    if not documents:
        return (
            "I couldn't find relevant information in this document to answer your question. "
            "Please make sure the document has been fully processed.",
            [],
        )

    # 3. Build sources
    sources = []
    context_parts = []
    for i, (doc_text, meta, dist) in enumerate(zip(documents, metadatas, distances)):
        page_num = meta.get("page_number")
        relevance = round(1 - dist, 3) if dist is not None else 0.8

        source = ChatSource(
            content=doc_text[:300] + "..." if len(doc_text) > 300 else doc_text,
            page_number=page_num,
            relevance_score=relevance,
        )
        sources.append(source)

        page_ref = f" (Page {page_num})" if page_num else ""
        context_parts.append(f"[{i+1}]{page_ref}\n{doc_text}")

    context = "\n\n---\n\n".join(context_parts)

    # 4. Build chat history string
    history_text = ""
    if chat_history:
        for human, ai in chat_history[-3:]:  # last 3 exchanges
            history_text += f"Student: {human}\nAssistant: {ai}\n\n"

    # 5. Build prompt
    prompt = RAG_PROMPT_TEMPLATE.format(
        context=context,
        chat_history=history_text or "No previous conversation.",
        question=question,
    )

    # 6. Generate answer
    try:
        llm = get_llm()
        from langchain_core.messages import HumanMessage
        response = llm.invoke([HumanMessage(content=prompt)])
        answer = response.content
    except ValueError as e:
        answer = f"AI service unavailable: {str(e)}"
    except Exception as e:
        logger.error(f"LLM error: {e}", exc_info=True)
        answer = f"Error generating response: {str(e)}"

    return answer, sources
