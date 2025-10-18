from pydantic import BaseModel
from typing import Optional
from enum import Enum


class ProblemType(str, Enum):
    SHORT_ANSWER = "short_answer"
    MULTIPLE_CHOICE = "multiple_choice"


class AnswerCheckRequest(BaseModel):
    user_answer: str
    correct_answer: str
    problem_type: Optional[str] = "general"
    question_type: Optional[ProblemType] = ProblemType.SHORT_ANSWER
    selected_option: Optional[int] = None  # For MCQ


class AnswerCheckResponse(BaseModel):
    is_correct: bool
    confidence: float
    explanation: str
    error_message: Optional[str] = None
    recognized_latex: Optional[str] = None
