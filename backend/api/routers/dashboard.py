"""Dashboard and statistics routes."""

import uuid
from typing import List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.core.database import get_db
from backend.models.user import User
from backend.models.document import Document, DocumentStatus, Summary
from backend.models.chat import ChatSession, ChatMessage
from backend.models.quiz import Quiz
from backend.models.flashcard import FlashcardSet
from backend.schemas.dashboard import DashboardStats, ActivityItem
from backend.schemas.document import DocumentOut
from backend.api.deps import get_current_user

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get aggregated dashboard statistics."""
    user_id = current_user.id

    total_docs = db.query(func.count(Document.id)).filter(Document.user_id == user_id).scalar() or 0
    docs_ready = db.query(func.count(Document.id)).filter(
        Document.user_id == user_id, Document.status == DocumentStatus.READY
    ).scalar() or 0
    total_chats = db.query(func.count(ChatSession.id)).filter(ChatSession.user_id == user_id).scalar() or 0
    total_quizzes = db.query(func.count(Quiz.id)).filter(Quiz.user_id == user_id).scalar() or 0
    total_flashcard_sets = db.query(func.count(FlashcardSet.id)).filter(FlashcardSet.user_id == user_id).scalar() or 0

    # Count total individual flashcards
    all_sets = db.query(FlashcardSet).filter(FlashcardSet.user_id == user_id).all()
    total_flashcards = sum(len(fs.cards) for fs in all_sets)

    # Average quiz score
    scored_quizzes = db.query(Quiz).filter(
        Quiz.user_id == user_id, Quiz.score.isnot(None), Quiz.max_score.isnot(None)
    ).all()
    avg_score = None
    if scored_quizzes:
        avg_score = round(
            sum(q.score / q.max_score * 100 for q in scored_quizzes) / len(scored_quizzes), 1
        )

    # Recent documents
    recent_docs = (
        db.query(Document)
        .filter(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
        .limit(5)
        .all()
    )

    return DashboardStats(
        total_documents=total_docs,
        total_chats=total_chats,
        total_quizzes=total_quizzes,
        total_flashcard_sets=total_flashcard_sets,
        total_flashcards=total_flashcards,
        documents_ready=docs_ready,
        average_quiz_score=avg_score,
        recent_documents=[DocumentOut.model_validate(d) for d in recent_docs],
    )


@router.get("/activity", response_model=List[ActivityItem])
def get_recent_activity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get recent activity feed for the current user."""
    user_id = current_user.id
    activity = []

    # Uploads (last 5)
    docs = (
        db.query(Document)
        .filter(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
        .limit(5)
        .all()
    )
    for d in docs:
        activity.append(ActivityItem(
            id=f"upload-{d.id}",
            activity_type="upload",
            title=f"Uploaded {d.name}",
            description=f"{round(d.size / 1024, 1)} KB",
            document_id=d.id,
            created_at=d.created_at,
        ))

    # Chat sessions (last 5)
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_id)
        .order_by(ChatSession.created_at.desc())
        .limit(5)
        .all()
    )
    for s in sessions:
        doc = db.query(Document).filter(Document.id == s.document_id).first()
        activity.append(ActivityItem(
            id=f"chat-{s.id}",
            activity_type="chat",
            title=s.title,
            description=f"Chat about {doc.name}" if doc else "Chat session",
            document_id=s.document_id,
            created_at=s.created_at,
        ))

    # Quizzes (last 5)
    quizzes = (
        db.query(Quiz)
        .filter(Quiz.user_id == user_id)
        .order_by(Quiz.created_at.desc())
        .limit(5)
        .all()
    )
    for q in quizzes:
        doc = db.query(Document).filter(Document.id == q.document_id).first()
        score_text = f"Score: {q.score}/{q.max_score}" if q.score is not None else "Not taken"
        activity.append(ActivityItem(
            id=f"quiz-{q.id}",
            activity_type="quiz",
            title=f"{q.difficulty.title()} Quiz",
            description=f"{doc.name if doc else 'Unknown'} — {score_text}",
            document_id=q.document_id,
            created_at=q.created_at,
        ))

    # Flashcard sets (last 5)
    sets = (
        db.query(FlashcardSet)
        .filter(FlashcardSet.user_id == user_id)
        .order_by(FlashcardSet.created_at.desc())
        .limit(5)
        .all()
    )
    for fs in sets:
        doc = db.query(Document).filter(Document.id == fs.document_id).first()
        activity.append(ActivityItem(
            id=f"flashcard-{fs.id}",
            activity_type="flashcard",
            title=f"Flashcard Set{f': {fs.topic}' if fs.topic else ''}",
            description=f"{len(fs.cards)} cards from {doc.name if doc else 'Unknown'}",
            document_id=fs.document_id,
            created_at=fs.created_at,
        ))

    # Sort by date and return top 20
    activity.sort(key=lambda x: x.created_at, reverse=True)
    return activity[:20]
