"""Document Pydantic schemas."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from backend.schemas.base import BaseSchema


class DocumentOut(BaseSchema):
    id: str
    user_id: str
    name: str
    mime_type: str
    size: int
    status: str
    page_count: Optional[int] = None
    word_count: Optional[int] = None
    summary: Optional[str] = None
    created_at: datetime


class SummarizeInput(BaseModel):
    summary_type: str  # short, detailed, bullet, executive

    model_config = {"populate_by_name": True, "alias_generator": lambda s: ''.join(
        w.capitalize() if i else w for i, w in enumerate(s.split('_'))
    )}


class SummaryOut(BaseSchema):
    id: str
    document_id: str
    summary_type: str
    content: str
    created_at: datetime


class ConceptOut(BaseSchema):
    id: str
    document_id: str
    term: str
    definition: str
    concept_type: str
    created_at: datetime
