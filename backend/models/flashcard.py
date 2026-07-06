"""Flashcard set database model."""

import uuid
import json
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from backend.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class FlashcardSet(Base):
    __tablename__ = "flashcard_sets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic = Column(String, nullable=True)
    cards_json = Column(Text, nullable=False)  # JSON array of Flashcard
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="flashcard_sets")
    document = relationship("Document", back_populates="flashcard_sets")

    @property
    def cards(self):
        return json.loads(self.cards_json)

    @cards.setter
    def cards(self, value):
        self.cards_json = json.dumps(value)
