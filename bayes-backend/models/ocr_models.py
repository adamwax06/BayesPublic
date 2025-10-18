from pydantic import BaseModel
from typing import Optional
from enum import Enum


class ProblemType(str, Enum):
    SHORT_ANSWER = "short_answer"
    MULTIPLE_CHOICE = "multiple_choice"


class MathOcrRequest(BaseModel):
    """Request model for OCR processing of math expressions."""

    image_data: str  # Base64 encoded image


class MathOcrResponse(BaseModel):
    """Response model for OCR processing results."""

    latex: str
    text: str
    confidence: float = 0.0
    error_message: Optional[str] = None


class AnswerCheckOcrRequest(BaseModel):
    """Request model for checking answers using OCR."""

    image_data: str  # Base64 encoded image
    correct_answer: str
    problem_type: Optional[str] = "general"
    question_type: Optional[ProblemType] = ProblemType.SHORT_ANSWER
    selected_option: Optional[int] = None  # For multiple choice questions
