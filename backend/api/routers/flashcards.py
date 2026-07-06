"""Flashcard generation and management routes."""

import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.models.user import User
from backend.models.document import Document, DocumentStatus
from backend.models.flashcard import FlashcardSet
from backend.schemas.flashcard import FlashcardsInput, FlashcardSetOut
from backend.api.deps import get_current_user
from backend.services.flashcard_service import generate_flashcard_cards

router = APIRouter()


def set_to_out(fs: FlashcardSet, doc_name: str = None) -> FlashcardSetOut:
    return FlashcardSetOut(
        id=fs.id,
        document_id=fs.document_id,
        document_name=doc_name,
        topic=fs.topic,
        cards=fs.cards,
        created_at=fs.created_at,
    )


@router.post("/{document_id}/flashcards", response_model=FlashcardSetOut)
def generate_flashcards(
    document_id: str,
    data: FlashcardsInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate flashcards from a document."""
    doc = (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if doc.status != DocumentStatus.READY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is not ready. Please wait for processing to complete.",
        )

    cards = generate_flashcard_cards(
        document_id=document_id,
        card_count=data.card_count,
        topic=data.topic,
        db=db,
    )

    fs = FlashcardSet(
        document_id=document_id,
        user_id=current_user.id,
        topic=data.topic,
        cards_json=json.dumps([c.model_dump() for c in cards]),
    )
    db.add(fs)
    db.commit()
    db.refresh(fs)

    return set_to_out(fs, doc.name)


@router.get("", response_model=List[FlashcardSetOut])
def list_flashcard_sets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all flashcard sets for the current user."""
    sets = (
        db.query(FlashcardSet)
        .filter(FlashcardSet.user_id == current_user.id)
        .order_by(FlashcardSet.created_at.desc())
        .all()
    )
    result = []
    for fs in sets:
        doc = db.query(Document).filter(Document.id == fs.document_id).first()
        result.append(set_to_out(fs, doc.name if doc else None))
    return result


@router.get("/{set_id}", response_model=FlashcardSetOut)
def get_flashcard_set(
    set_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific flashcard set."""
    fs = (
        db.query(FlashcardSet)
        .filter(FlashcardSet.id == set_id, FlashcardSet.user_id == current_user.id)
        .first()
    )
    if not fs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard set not found")

    doc = db.query(Document).filter(Document.id == fs.document_id).first()
    return set_to_out(fs, doc.name if doc else None)
