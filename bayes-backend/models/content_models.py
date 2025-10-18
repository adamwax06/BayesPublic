from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class ProblemType(str, Enum):
    SHORT_ANSWER = "short_answer"
    MULTIPLE_CHOICE = "multiple_choice"


class TopicRequest(BaseModel):
    topic: str
    course: str = "calc 1"


class Problem(BaseModel):
    question: str
    answer: str
    type: ProblemType
    options: Optional[List[str]] = None
    correct_option: Optional[int] = None
    explanation: Optional[str] = None
    hints: Optional[List[str]] = None


class Subtopic(BaseModel):
    title: str
    article: str
    problems: List[Problem]


class GenerateContentResponse(BaseModel):
    topic: str
    subtopics: List[Subtopic]


class HomeworkImageRequest(BaseModel):
    image_data: str  # Base64 encoded image


class TopicDetectionResponse(BaseModel):
    topic: str
    course: str
    confidence: float
    error_message: Optional[str] = None
