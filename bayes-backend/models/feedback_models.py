from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class FeedbackItem(BaseModel):
    area: str
    coordinates: Optional[Dict[str, int]] = None  # {x, y, width, height, ...}
    issue: str
    suggestion: str
    severity: str  # "high", "medium", "low"


class CheckWorkWithFeedbackRequest(BaseModel):
    image_data: str  # base64
    question: str
    correct_answer: str
    problem_type: Optional[str] = "general"


class CheckWorkWithFeedbackResponse(BaseModel):
    overall_correct: bool
    feedback_items: List[FeedbackItem]
    general_feedback: str
    confidence: float
    error_message: Optional[str] = None
    extracted_work: str
    math_expressions: Optional[List[Dict[str, Any]]] = None
