"""Chat Pydantic schemas."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from backend.schemas.base import BaseSchema


class ChatSource(BaseSchema):
    content: str
    page_number: Optional[int] = None
    relevance_score: float


class ChatMessageOut(BaseSchema):
    id: str
    session_id: str
    role: str
    content: str
    sources: List[ChatSource] = []
    created_at: datetime


class ChatSessionOut(BaseSchema):
    id: str
    document_id: str
    user_id: str
    title: str
    message_count: int
    document_name: Optional[str] = None
    created_at: datetime


class ChatSessionWithMessagesOut(ChatSessionOut):
    messages: List[ChatMessageOut] = []


class ChatSessionInput(BaseModel):
    document_id: str
    title: Optional[str] = None

    model_config = {"populate_by_name": True}


class MessageInput(BaseModel):
    content: str
