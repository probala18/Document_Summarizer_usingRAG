"""Quiz generation service using Mistral AI."""

import json
import uuid
import logging
from typing import List, Optional

from sqlalchemy.orm import Session

from backend.core.config import get_settings
from backend.schemas.quiz import QuizQuestion, QuizOption

logger = logging.getLogger(__name__)
settings = get_settings()

QUIZ_PROMPT = """You are an expert academic quiz generator.

Generate {count} quiz questions from the following academic text.
Difficulty: {difficulty}
Question types to include: {types}

Rules:
- Multiple choice: provide exactly 4 options (A, B, C, D), answer is the label (A/B/C/D)
- True/False: answer is "True" or "False"
- Short answer: answer should be a concise phrase (3-10 words)
- Questions must be directly answerable from the text
- Vary question types as requested
- For easy: factual recall; for medium: comprehension; for hard: analysis/synthesis

Text:
{text}

Return ONLY a valid JSON array with this exact structure:
[
  {{
    "id": "q1",
    "question": "...",
    "question_type": "multiple_choice",
    "options": [{{"label": "A", "text": "..."}}, {{"label": "B", "text": "..."}}, {{"label": "C", "text": "..."}}, {{"label": "D", "text": "..."}}],
    "answer": "A",
    "explanation": "..."
  }},
  {{
    "id": "q2",
    "question": "...",
    "question_type": "true_false",
    "options": [],
    "answer": "True",
    "explanation": "..."
  }},
  {{
    "id": "q3",
    "question": "...",
    "question_type": "short_answer",
    "options": [],
    "answer": "brief answer here",
    "explanation": "..."
  }}
]

Return ONLY valid JSON array, no other text:"""


def generate_quiz_questions(
    document_id: str,
    difficulty: str,
    question_count: int,
    question_types: Optional[List[str]],
    db: Session,
) -> List[QuizQuestion]:
    """Generate quiz questions from a document using AI."""
    from backend.services.summary_service import get_document_text, call_llm

    # Default question types
    if not question_types:
        question_types = ["multiple_choice", "true_false", "short_answer"]

    text = get_document_text(document_id)
    if not text:
        return []

    # Use first 5000 chars
    text_for_quiz = text[:5000] if len(text) > 5000 else text

    prompt = QUIZ_PROMPT.format(
        count=question_count,
        difficulty=difficulty,
        types=", ".join(question_types),
        text=text_for_quiz,
    )

    try:
        raw = call_llm(prompt)
        # Parse JSON
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start == -1 or end <= start:
            logger.error("No JSON array found in quiz response")
            return []

        questions_raw = json.loads(raw[start:end])
        questions = []
        for i, q in enumerate(questions_raw[:question_count]):
            if not isinstance(q, dict):
                continue
            options = [
                QuizOption(label=opt["label"], text=opt["text"])
                for opt in q.get("options", [])
                if isinstance(opt, dict)
            ]
            question = QuizQuestion(
                id=q.get("id", f"q{i+1}"),
                question=str(q.get("question", "")),
                question_type=str(q.get("question_type", "multiple_choice")),
                options=options,
                answer=str(q.get("answer", "")),
                explanation=q.get("explanation"),
            )
            questions.append(question)
        return questions

    except Exception as e:
        logger.error(f"Quiz generation error: {e}", exc_info=True)
        return []
