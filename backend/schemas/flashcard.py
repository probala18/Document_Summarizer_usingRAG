"""Flashcard Pydantic schemas."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from pydantic.alias_generators import to_camel

from backend.schemas.base import BaseSchema


class Flashcard(BaseSchema):
    id: str
    question: str
    answer: str


class FlashcardsInput(BaseModel):
    card_count: int = 10
    topic: Optional[str] = None

    model_config = {"populate_by_name": True, "alias_generator": to_camel}


class FlashcardSetOut(BaseSchema):
    id: str
    document_id: str
    document_name: Optional[str] = None
    topic: Optional[str] = None
    cards: List[Flashcard]
    created_at: datetime
