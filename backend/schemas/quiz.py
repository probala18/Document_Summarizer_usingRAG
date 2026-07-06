"""Quiz Pydantic schemas."""

from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel
from pydantic.alias_generators import to_camel

from backend.schemas.base import BaseSchema


class QuizOption(BaseSchema):
    label: str
    text: str


class QuizQuestion(BaseSchema):
    id: str
    question: str
    question_type: str
    options: List[QuizOption] = []
    answer: str
    explanation: Optional[str] = None


class QuizInput(BaseModel):
    difficulty: str
    question_count: int = 5
    question_types: Optional[List[str]] = None

    model_config = {"populate_by_name": True, "alias_generator": to_camel}


class QuizOut(BaseSchema):
    id: str
    document_id: str
    document_name: Optional[str] = None
    difficulty: str
    questions: List[QuizQuestion]
    score: Optional[int] = None
    max_score: Optional[int] = None
    created_at: datetime


class QuizSubmission(BaseModel):
    answers: Dict[str, str]


class QuizFeedbackItem(BaseSchema):
    question_id: str
    correct: bool
    your_answer: Optional[str] = None
    correct_answer: str
    explanation: Optional[str] = None


class QuizResult(BaseSchema):
    quiz_id: str
    score: int
    max_score: int
    percentage: float
    feedback: List[QuizFeedbackItem]
