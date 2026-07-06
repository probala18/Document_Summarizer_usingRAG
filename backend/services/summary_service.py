"""Summarization and concept extraction services."""

import logging
import json
from typing import List, Dict

from sqlalchemy.orm import Session

from backend.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


SUMMARY_PROMPTS = {
    "short": """Provide a concise 2-3 paragraph summary of the following academic document.
Focus on the main thesis, key arguments, and conclusions.

Document text:
{text}

Short Summary:""",

    "detailed": """Provide a comprehensive, detailed summary of the following academic document.
Include: main topic, key arguments, supporting evidence, methodology (if applicable), findings, and conclusions.
Structure with clear sections.

Document text:
{text}

Detailed Summary:""",

    "bullet": """Summarize the following academic document as a structured bullet-point list.
Use nested bullets for sub-points. Include all major topics and key takeaways.

Document text:
{text}

Bullet Point Summary:""",

    "executive": """Provide an executive summary of the following academic document.
Format: 1 sentence overview, 3-5 key points, and 1 sentence conclusion.
Be precise and professional.

Document text:
{text}

Executive Summary:""",
}

CONCEPTS_PROMPT = """Extract key concepts from the following academic text.
Return a JSON array of objects with these fields:
- term: the concept name
- definition: clear definition (1-2 sentences)  
- concept_type: one of ["topic", "keyword", "definition", "formula", "date", "person"]

Extract 10-15 of the most important concepts.

Text:
{text}

Return ONLY valid JSON array, no other text:"""


def get_document_text(document_id: str) -> str:
    """Retrieve all chunks for a document from the vector store."""
    from backend.rag.vector_store import get_vector_store
    collection = get_vector_store()
    results = collection.get(
        where={"document_id": document_id},
        include=["documents", "metadatas"],
    )
    docs = results.get("documents", [])
    metas = results.get("metadatas", [])

    # Sort by chunk index
    paired = sorted(zip(metas, docs), key=lambda x: x[0].get("chunk_index", 0))
    return "\n\n".join([d for _, d in paired])


def call_llm(prompt: str) -> str:
    """Call the Mistral LLM with a prompt."""
    if not settings.MISTRAL_API_KEY:
        return "AI service not configured. Please set MISTRAL_API_KEY."

    from langchain_mistralai import ChatMistralAI
    from langchain_core.messages import HumanMessage

    llm = ChatMistralAI(
        model=settings.MISTRAL_MODEL,
        mistral_api_key=settings.MISTRAL_API_KEY,
        temperature=0.3,
        max_tokens=4096,
    )
    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content


def generate_summary(document_id: str, summary_type: str, db: Session) -> str:
    """Generate a summary of the specified type for a document."""
    # Get document text from vector store
    text = get_document_text(document_id)

    if not text:
        return "No text content found for this document."

    # Truncate to avoid token limits (keep first 8000 chars for summary)
    text_for_summary = text[:8000] if len(text) > 8000 else text

    prompt_template = SUMMARY_PROMPTS.get(summary_type, SUMMARY_PROMPTS["short"])
    prompt = prompt_template.format(text=text_for_summary)

    try:
        return call_llm(prompt)
    except Exception as e:
        logger.error(f"Summary generation error: {e}", exc_info=True)
        return f"Error generating summary: {str(e)}"


def extract_key_concepts(document_id: str, db: Session) -> List[Dict]:
    """Extract key concepts from a document using AI."""
    text = get_document_text(document_id)

    if not text:
        return []

    # Use first 6000 chars for concept extraction
    text_for_concepts = text[:6000] if len(text) > 6000 else text
    prompt = CONCEPTS_PROMPT.format(text=text_for_concepts)

    try:
        raw = call_llm(prompt)
        # Parse JSON response
        # Try to find JSON array in response
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start != -1 and end > start:
            json_str = raw[start:end]
            concepts = json.loads(json_str)
            # Validate and normalize
            valid = []
            for c in concepts:
                if isinstance(c, dict) and "term" in c and "definition" in c:
                    valid.append({
                        "term": str(c.get("term", "")),
                        "definition": str(c.get("definition", "")),
                        "concept_type": str(c.get("concept_type", "keyword")),
                    })
            return valid
        return []
    except Exception as e:
        logger.error(f"Concept extraction error: {e}", exc_info=True)
        return []
