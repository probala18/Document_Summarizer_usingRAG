"""Chat (RAG) routes."""

import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.models.user import User
from backend.models.document import Document, DocumentStatus
from backend.models.chat import ChatSession, ChatMessage
from backend.schemas.chat import (
    ChatSessionInput,
    ChatSessionOut,
    ChatSessionWithMessagesOut,
    ChatMessageOut,
    MessageInput,
    ChatSource,
)
from backend.api.deps import get_current_user
from backend.services.rag_service import answer_question

router = APIRouter()


@router.get("/sessions", response_model=List[ChatSessionOut])
def list_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all chat sessions for the current user."""
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )

    result = []
    for s in sessions:
        count = db.query(ChatMessage).filter(ChatMessage.session_id == s.id).count()
        doc = db.query(Document).filter(Document.id == s.document_id).first()
        out = ChatSessionOut(
            id=s.id,
            document_id=s.document_id,
            user_id=s.user_id,
            title=s.title,
            message_count=count,
            document_name=doc.name if doc else None,
            created_at=s.created_at,
        )
        result.append(out)
    return result


@router.post("/sessions", response_model=ChatSessionOut, status_code=status.HTTP_201_CREATED)
def create_chat_session(
    data: ChatSessionInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new chat session for a document."""
    doc = (
        db.query(Document)
        .filter(Document.id == data.document_id, Document.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if doc.status != DocumentStatus.READY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is not ready for chat yet.",
        )

    title = data.title or f"Chat about {doc.name}"
    session = ChatSession(
        document_id=data.document_id,
        user_id=current_user.id,
        title=title,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return ChatSessionOut(
        id=session.id,
        document_id=session.document_id,
        user_id=session.user_id,
        title=session.title,
        message_count=0,
        document_name=doc.name,
        created_at=session.created_at,
    )


@router.get("/sessions/{session_id}", response_model=ChatSessionWithMessagesOut)
def get_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a chat session with all its messages."""
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )

    doc = db.query(Document).filter(Document.id == session.document_id).first()
    message_count = len(messages)

    def msg_to_out(m: ChatMessage) -> ChatMessageOut:
        sources = []
        if m.sources_json:
            raw = json.loads(m.sources_json)
            sources = [ChatSource(**s) for s in raw]
        return ChatMessageOut(
            id=m.id,
            session_id=m.session_id,
            role=m.role,
            content=m.content,
            sources=sources,
            created_at=m.created_at,
        )

    return ChatSessionWithMessagesOut(
        id=session.id,
        document_id=session.document_id,
        user_id=session.user_id,
        title=session.title,
        message_count=message_count,
        document_name=doc.name if doc else None,
        created_at=session.created_at,
        messages=[msg_to_out(m) for m in messages],
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a chat session."""
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    db.delete(session)
    db.commit()


@router.post("/sessions/{session_id}/messages", response_model=ChatMessageOut)
def send_message(
    session_id: str,
    data: MessageInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message and get an AI response via RAG."""
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # Save user message
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=data.content,
    )
    db.add(user_msg)
    db.commit()

    # Get chat history for context
    history = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )
    history_pairs = []
    for i in range(0, len(history) - 1, 2):
        if i + 1 < len(history) - 1:
            history_pairs.append((history[i].content, history[i + 1].content))

    # Generate RAG answer
    answer, sources = answer_question(
        document_id=session.document_id,
        question=data.content,
        chat_history=history_pairs,
    )

    # Save assistant message
    sources_data = [s.model_dump() for s in sources]
    assistant_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=answer,
        sources_json=json.dumps(sources_data),
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    return ChatMessageOut(
        id=assistant_msg.id,
        session_id=assistant_msg.session_id,
        role=assistant_msg.role,
        content=assistant_msg.content,
        sources=sources,
        created_at=assistant_msg.created_at,
    )
