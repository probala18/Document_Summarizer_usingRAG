"""Quiz generation and management routes."""

import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.models.user import User
from backend.models.document import Document, DocumentStatus
from backend.models.quiz import Quiz
from backend.schemas.quiz import QuizInput, QuizOut, QuizSubmission, QuizResult, QuizFeedbackItem
from backend.api.deps import get_current_user
from backend.services.quiz_service import generate_quiz_questions

router = APIRouter()


def quiz_to_out(quiz: Quiz, doc_name: str = None) -> QuizOut:
    return QuizOut(
        id=quiz.id,
        document_id=quiz.document_id,
        document_name=doc_name,
        difficulty=quiz.difficulty,
        questions=quiz.questions,
        score=quiz.score,
        max_score=quiz.max_score,
        created_at=quiz.created_at,
    )


@router.post("/{document_id}/quiz", response_model=QuizOut)
def generate_quiz(
    document_id: str,
    data: QuizInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a quiz from a document."""
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

    # Generate questions via AI
    questions = generate_quiz_questions(
        document_id=document_id,
        difficulty=data.difficulty,
        question_count=data.question_count,
        question_types=data.question_types,
        db=db,
    )

    quiz = Quiz(
        document_id=document_id,
        user_id=current_user.id,
        difficulty=data.difficulty,
        questions_json=json.dumps([q.model_dump() for q in questions]),
        max_score=len(questions),
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    return quiz_to_out(quiz, doc.name)


@router.get("", response_model=List[QuizOut])
def list_quizzes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all quizzes for the current user."""
    quizzes = (
        db.query(Quiz)
        .filter(Quiz.user_id == current_user.id)
        .order_by(Quiz.created_at.desc())
        .all()
    )
    result = []
    for q in quizzes:
        doc = db.query(Document).filter(Document.id == q.document_id).first()
        result.append(quiz_to_out(q, doc.name if doc else None))
    return result


@router.get("/{quiz_id}", response_model=QuizOut)
def get_quiz(
    quiz_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific quiz."""
    quiz = (
        db.query(Quiz)
        .filter(Quiz.id == quiz_id, Quiz.user_id == current_user.id)
        .first()
    )
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    doc = db.query(Document).filter(Document.id == quiz.document_id).first()
    return quiz_to_out(quiz, doc.name if doc else None)


@router.post("/{quiz_id}/submit", response_model=QuizResult)
def submit_quiz(
    quiz_id: str,
    data: QuizSubmission,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit quiz answers and get results."""
    quiz = (
        db.query(Quiz)
        .filter(Quiz.id == quiz_id, Quiz.user_id == current_user.id)
        .first()
    )
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    questions = quiz.questions
    feedback = []
    score = 0

    for q in questions:
        q_id = q["id"]
        submitted = data.answers.get(q_id, "")
        correct_answer = q["answer"]
        question_type = q["question_type"]

        # Evaluate answer
        if question_type == "multiple_choice":
            correct = submitted.strip().upper() == correct_answer.strip().upper()
        elif question_type == "true_false":
            correct = submitted.strip().lower() == correct_answer.strip().lower()
        else:  # short_answer — fuzzy match
            correct = (
                submitted.strip().lower() in correct_answer.lower()
                or correct_answer.lower() in submitted.strip().lower()
            ) and len(submitted.strip()) > 0

        if correct:
            score += 1

        feedback.append(
            QuizFeedbackItem(
                question_id=q_id,
                correct=correct,
                your_answer=submitted or None,
                correct_answer=correct_answer,
                explanation=q.get("explanation"),
            )
        )

    max_score = len(questions)
    percentage = (score / max_score * 100) if max_score > 0 else 0.0

    # Update quiz record with score
    quiz.score = score
    quiz.max_score = max_score
    db.commit()

    return QuizResult(
        quiz_id=quiz_id,
        score=score,
        max_score=max_score,
        percentage=round(percentage, 1),
        feedback=feedback,
    )
