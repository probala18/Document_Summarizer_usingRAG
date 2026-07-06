"""Summarization routes."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.models.user import User
from backend.models.document import Document, DocumentStatus, Summary
from backend.schemas.document import SummarizeInput, SummaryOut
from backend.api.deps import get_current_user
from backend.services.summary_service import generate_summary

router = APIRouter()


@router.post("/{document_id}/summarize", response_model=SummaryOut)
def summarize_document(
    document_id: str,
    data: SummarizeInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a summary for a document."""
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
            detail=f"Document is not ready (status: {doc.status}). Please wait for processing to complete.",
        )

    # Generate summary
    content = generate_summary(document_id, data.summary_type, db)

    # Save to database
    summary = Summary(
        document_id=document_id,
        summary_type=data.summary_type,
        content=content,
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)

    return SummaryOut.model_validate(summary)


@router.get("/{document_id}/summaries", response_model=List[SummaryOut])
def get_document_summaries(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all summaries for a document."""
    doc = (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    summaries = (
        db.query(Summary)
        .filter(Summary.document_id == document_id)
        .order_by(Summary.created_at.desc())
        .all()
    )
    return [SummaryOut.model_validate(s) for s in summaries]
