"""Dashboard Pydantic schemas."""

from datetime import datetime
from typing import Optional, List

from backend.schemas.base import BaseSchema
from backend.schemas.document import DocumentOut


class DashboardStats(BaseSchema):
    total_documents: int
    total_chats: int
    total_quizzes: int
    total_flashcard_sets: int
    total_flashcards: int
    documents_ready: int
    average_quiz_score: Optional[float] = None
    recent_documents: List[DocumentOut] = []


class ActivityItem(BaseSchema):
    id: str
    activity_type: str
    title: str
    description: Optional[str] = None
    document_id: Optional[str] = None
    created_at: datetime
