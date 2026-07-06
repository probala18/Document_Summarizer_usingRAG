"""Flashcard generation service using Mistral AI."""

import json
import uuid
import logging
from typing import List, Optional

from sqlalchemy.orm import Session

from backend.core.config import get_settings
from backend.schemas.flashcard import Flashcard

logger = logging.getLogger(__name__)
settings = get_settings()

FLASHCARD_PROMPT = """You are an expert study material creator.

Generate {count} high-quality flashcards from the following academic text.
{topic_instruction}

Rules:
- Front (question): clear, specific question about a key concept, fact, or term
- Back (answer): concise, accurate answer (1-3 sentences max)
- Cover the most important concepts, definitions, facts, and relationships
- Vary between definition cards, application cards, and fact cards
- Questions should be distinct from each other

Text:
{text}

Return ONLY a valid JSON array with this exact structure:
[
  {{
    "id": "fc1",
    "question": "What is ...?",
    "answer": "..."
  }}
]

Return ONLY valid JSON, no other text:"""


def generate_flashcard_cards(
    document_id: str,
    card_count: int,
    topic: Optional[str],
    db: Session,
) -> List[Flashcard]:
    """Generate flashcards from a document using AI."""
    from backend.services.summary_service import get_document_text, call_llm

    text = get_document_text(document_id)
    if not text:
        return []

    # If topic specified, try to find relevant sections
    text_for_cards = text[:5000] if len(text) > 5000 else text

    topic_instruction = ""
    if topic:
        topic_instruction = f"Focus specifically on the topic: {topic}"

    prompt = FLASHCARD_PROMPT.format(
        count=card_count,
        topic_instruction=topic_instruction,
        text=text_for_cards,
    )

    try:
        raw = call_llm(prompt)
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start == -1 or end <= start:
            return []

        cards_raw = json.loads(raw[start:end])
        cards = []
        for i, c in enumerate(cards_raw[:card_count]):
            if not isinstance(c, dict):
                continue
            card = Flashcard(
                id=c.get("id", f"fc{i+1}"),
                question=str(c.get("question", "")),
                answer=str(c.get("answer", "")),
            )
            cards.append(card)
        return cards

    except Exception as e:
        logger.error(f"Flashcard generation error: {e}", exc_info=True)
        return []
