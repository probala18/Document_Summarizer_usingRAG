"""Quiz database models."""

import uuid
import json
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Float
from sqlalchemy.orm import relationship

from backend.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    difficulty = Column(String, nullable=False)  # easy, medium, hard
    questions_json = Column(Text, nullable=False)  # JSON array of QuizQuestion
    score = Column(Integer, nullable=True)
    max_score = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="quizzes")
    document = relationship("Document", back_populates="quizzes")

    @property
    def questions(self):
        return json.loads(self.questions_json)

    @questions.setter
    def questions(self, value):
        self.questions_json = json.dumps(value)
