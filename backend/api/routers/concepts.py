"""Key concept extraction routes."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.models.user import User
from backend.models.document import Document, DocumentStatus, Concept
from backend.schemas.document import ConceptOut
from backend.api.deps import get_current_user
from backend.services.summary_service import extract_key_concepts

router = APIRouter()


@router.get("/{document_id}/concepts", response_model=List[ConceptOut])
def get_document_concepts(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get extracted key concepts for a document."""
    doc = (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    concepts = (
        db.query(Concept)
        .filter(Concept.document_id == document_id)
        .order_by(Concept.concept_type, Concept.term)
        .all()
    )
    return [ConceptOut.model_validate(c) for c in concepts]


@router.post("/{document_id}/extract-concepts", response_model=List[ConceptOut])
def extract_concepts(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Extract key concepts from a document using AI."""
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

    # Delete existing concepts first
    db.query(Concept).filter(Concept.document_id == document_id).delete()
    db.commit()

    # Extract new concepts
    raw_concepts = extract_key_concepts(document_id, db)

    concepts = []
    for c in raw_concepts:
        concept = Concept(
            document_id=document_id,
            term=c["term"],
            definition=c["definition"],
            concept_type=c["concept_type"],
        )
        db.add(concept)
        concepts.append(concept)

    db.commit()
    for c in concepts:
        db.refresh(c)

    return [ConceptOut.model_validate(c) for c in concepts]
