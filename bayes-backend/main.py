from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv
import logging
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime
from auth import (
    get_current_user,
    get_current_user_optional,
    User,
)
from services.mathpix_service import mathpix_service
import base64
import stripe
from prompts.tommy_prompt import build_tommy_prompt
from models.ocr_models import MathOcrRequest, MathOcrResponse, AnswerCheckOcrRequest
from routers import ocr_router
from routers import content_router
from routers import subscription_router
from routers import answer_router
from routers import feedback_router
from routers import auth_router
from routers import github_router, email_router
from routers.answer import check_answer

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Bayes API", description="AI Tutoring Assistant for Calculus")

# Configure CORS
allowed_origins = [
    "http://localhost:3000",  # Next.js dev server
    "https://bayes-frontend.vercel.app",
    "https://trybayes.com",  # Production frontend (apex)
    "https://www.trybayes.com",  # Production frontend (www subdomain)
]

# Add additional origins from environment variable
additional_origins = os.getenv("ADDITIONAL_CORS_ORIGINS", "")
if additional_origins:
    allowed_origins.extend([origin.strip() for origin in additional_origins.split(",")])

# Development mode support - allow all origins if in dev mode
is_dev_mode = os.getenv("DEVELOPMENT_MODE", "false").lower() == "true"

# Log CORS configuration for debugging
if is_dev_mode:
    logger.info("CORS: Development mode enabled - allowing all origins")
else:
    logger.info(f"CORS: Production mode - allowed origins: {allowed_origins}")
    logger.info("CORS: Also allowing all *.vercel.app domains via regex")

# Configure CORS middleware - simplified approach
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if is_dev_mode else allowed_origins,
    allow_origin_regex=None if is_dev_mode else r"https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# API credentials
gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    logger.error("GEMINI_API_KEY not found in environment variables")
    raise ValueError("GEMINI_API_KEY is required")

# Mathpix API credentials
mathpix_app_id = os.getenv("MATHPIX_APP_ID")
mathpix_app_key = os.getenv("MATHPIX_APP_KEY")
if not mathpix_app_id or not mathpix_app_key:
    logger.warning("Mathpix API credentials not found. OCR features will be disabled.")

# Configure Gemini
genai.configure(api_key=gemini_api_key)
# Model for content generation (structured JSON)
content_model = genai.GenerativeModel("gemini-2.5-pro")
# Model for feedback analysis (faster, optimized for analysis tasks)
feedback_model = genai.GenerativeModel("gemini-2.0-flash-exp")


# Enums
class ProblemType(str, Enum):
    SHORT_ANSWER = "short_answer"
    MULTIPLE_CHOICE = "multiple_choice"


# Pydantic models
class TopicRequest(BaseModel):
    topic: str
    course: str = "calc 1"


class TopicResponse(BaseModel):
    topic: str
    explanation: str
    key_concepts: list[str]
    examples: list[str]
    practice_problems: list[str]
    prerequisites: list[str]


class Problem(BaseModel):
    question: str
    answer: str
    type: ProblemType
    options: Optional[List[str]] = None  # For multiple choice questions
    correct_option: Optional[int] = None  # Index of correct option (0-based)
    explanation: Optional[str] = None  # Optional explanation for the answer
    hints: Optional[List[str]] = None  # Array of 2 progressive hints


class Subtopic(BaseModel):
    title: str
    article: str
    problems: list[Problem]


class GenerateContentResponse(BaseModel):
    topic: str
    subtopics: list[Subtopic]


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class AnswerCheckRequest(BaseModel):
    user_answer: str
    correct_answer: str
    problem_type: Optional[str] = (
        "general"  # "numeric", "symbolic", "algebraic", "calculus"
    )
    question_type: Optional[ProblemType] = ProblemType.SHORT_ANSWER
    selected_option: Optional[int] = None  # For multiple choice questions


class AnswerCheckResponse(BaseModel):
    is_correct: bool
    confidence: float
    explanation: str
    error_message: Optional[str] = None
    recognized_latex: Optional[str] = None  # Add recognized LaTeX to the response


class HomeworkImageRequest(BaseModel):
    """Request model for homework image upload."""

    image_data: str  # Base64 encoded image


class TopicDetectionResponse(BaseModel):
    """Response model for topic detection from image."""

    topic: str
    course: str
    confidence: float
    error_message: Optional[str] = None


class CheckWorkWithFeedbackRequest(BaseModel):
    """Request model for checking work with detailed feedback."""

    image_data: str  # Base64 encoded image
    question: str
    correct_answer: str
    problem_type: Optional[str] = "general"


class FeedbackItem(BaseModel):
    """Individual feedback item with coordinates."""

    area: str
    coordinates: Optional[Dict[str, int]] = None  # {x, y} coordinates
    issue: str
    suggestion: str
    severity: str  # "high", "medium", "low"


class CheckWorkWithFeedbackResponse(BaseModel):
    """Response model for work checking with feedback."""

    overall_correct: bool
    feedback_items: List[FeedbackItem]
    general_feedback: str
    confidence: float
    error_message: Optional[str] = None
    extracted_work: str  # Full LaTeX of the work
    math_expressions: Optional[List[Dict[str, Any]]] = (
        None  # Each detected math expression with coordinates
    )


class CreateIssueRequest(BaseModel):
    """Request model for creating GitHub issues."""

    title: str
    body: str
    labels: Optional[List[str]] = ["bug", "user-reported"]


class CreateIssueResponse(BaseModel):
    """Response model for GitHub issue creation."""

    success: bool
    issue_number: Optional[int] = None
    html_url: Optional[str] = None
    error_message: Optional[str] = None


class SavedTopic(BaseModel):
    """Model for saved topic data."""

    id: str
    user_id: str
    topic: str
    course: str
    content: GenerateContentResponse
    created_at: str
    updated_at: str


class SavedTopicsResponse(BaseModel):
    """Response model for listing saved topics."""

    saved_topics: List[SavedTopic]
    total: int


class SaveTopicRequest(BaseModel):
    """Request model for saving a topic."""

    topic: str
    course: str
    content: GenerateContentResponse


class SendWelcomeEmailRequest(BaseModel):
    """Request model for sending welcome emails."""

    email: str
    name: Optional[str] = None


class EmailResponse(BaseModel):
    """Response model for email operations."""

    success: bool
    message: str
    email_id: Optional[str] = None
    error: Optional[str] = None


class UserWebhookRequest(BaseModel):
    """Request model for Supabase user webhooks."""

    type: str  # "INSERT", "UPDATE", "DELETE"
    table: str
    record: dict
    schema: str
    old_record: Optional[dict] = None


class TopicProgress(BaseModel):
    """Model for topic progress data."""
    id: str
    user_id: str
    topic_name: str
    course: str
    current_subtopic_index: int
    current_problem_index: int
    current_step: str  # 'article' or 'problems'
    correct_answers: int
    total_problems_attempted: int
    completed_subtopics: List[int]
    completed_problems: List[int]
    started_at: str
    last_accessed: str
    total_time_spent: int  # in seconds
    created_at: str
    updated_at: str


class TopicProgressResponse(BaseModel):
    """Response model for listing topic progress."""

    topic_progress: List[TopicProgress]
    total: int


class SaveProgressRequest(BaseModel):
    """Request model for saving progress."""
    topic_name: str
    course: str
    current_subtopic_index: int
    current_problem_index: int
    current_step: str
    correct_answers: int
    total_problems_attempted: int
    completed_subtopics: List[int]
    completed_problems: List[int]
    time_spent: Optional[int] = 0


@app.get("/")
async def root():
    return {"message": "Bayes API is running"}


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "Bayes API"}


@app.get("/api/saved-topics", response_model=SavedTopicsResponse)
async def get_saved_topics(current_user: User = Depends(get_current_user)):
    """Get all saved topics for the current user"""
    try:
        from supabase import create_client

        SUPABASE_URL = os.getenv("SUPABASE_URL")
        SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise HTTPException(status_code=500, detail="Database not configured")

        service_supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Get saved topics for the current user, ordered by most recent first
        response = (
            service_supabase.table("saved_topics")
            .select("*")
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .execute()
        )

        if not response.data:
            return SavedTopicsResponse(saved_topics=[], total=0)

        # Convert database records to SavedTopic objects
        saved_topics = []
        for record in response.data:
            saved_topic = SavedTopic(
                id=record["id"],
                user_id=record["user_id"],
                topic=record["topic"],
                course=record["course"],
                content=record["content"],  # This is already a dict from JSONB
                created_at=record["created_at"],
                updated_at=record["updated_at"],
            )
            saved_topics.append(saved_topic)

        return SavedTopicsResponse(saved_topics=saved_topics, total=len(saved_topics))

    except Exception as e:
        logger.error(
            f"Error retrieving saved topics for user {current_user.id}: {str(e)}"
        )
        raise HTTPException(
            status_code=500, detail=f"Error retrieving saved topics: {str(e)}"
        )


@app.get("/api/saved-topics/{topic_id}", response_model=SavedTopic)
async def get_saved_topic(
    topic_id: str, current_user: User = Depends(get_current_user)
):
    """Get a specific saved topic by ID"""
    try:
        from supabase import create_client

        SUPABASE_URL = os.getenv("SUPABASE_URL")
        SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise HTTPException(status_code=500, detail="Database not configured")

        service_supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Get the specific saved topic
        response = (
            service_supabase.table("saved_topics")
            .select("*")
            .eq("id", topic_id)
            .eq("user_id", current_user.id)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Saved topic not found")

        record = response.data[0]
        saved_topic = SavedTopic(
            id=record["id"],
            user_id=record["user_id"],
            topic=record["topic"],
            course=record["course"],
            content=record["content"],  # This is already a dict from JSONB
            created_at=record["created_at"],
            updated_at=record["updated_at"],
        )

        return saved_topic

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error retrieving saved topic {topic_id} for user {current_user.id}: {str(e)}"
        )
        raise HTTPException(
            status_code=500, detail=f"Error retrieving saved topic: {str(e)}"
        )


@app.delete("/api/saved-topics/{topic_id}")
async def delete_saved_topic(
    topic_id: str, current_user: User = Depends(get_current_user)
):
    """Delete a saved topic"""
    try:
        from supabase import create_client

        SUPABASE_URL = os.getenv("SUPABASE_URL")
        SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise HTTPException(status_code=500, detail="Database not configured")

        service_supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Delete the saved topic (only if it belongs to the current user)
        response = (
            service_supabase.table("saved_topics")
            .delete()
            .eq("id", topic_id)
            .eq("user_id", current_user.id)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Saved topic not found")

        return {"message": "Saved topic deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error deleting saved topic {topic_id} for user {current_user.id}: {str(e)}"
        )
        raise HTTPException(
            status_code=500, detail=f"Error deleting saved topic: {str(e)}"
        )


# Topic Progress endpoints
@app.get("/api/topic-progress", response_model=TopicProgressResponse)
async def get_all_topic_progress(current_user: User = Depends(get_current_user)):
    """Get all topic progress for the current user"""
    try:
        from supabase import create_client

        SUPABASE_URL = os.getenv("SUPABASE_URL")
        SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise HTTPException(status_code=500, detail="Database not configured")

        service_supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Get topic progress for the current user, ordered by most recent first
        response = (
            service_supabase.table("topic_progress")
            .select("*")
            .eq("user_id", current_user.id)
            .order("last_accessed", desc=True)
            .execute()
        )

        if not response.data:
            return TopicProgressResponse(topic_progress=[], total=0)

        # Convert database records to TopicProgress objects
        topic_progress_list = []
        for record in response.data:
            topic_progress = TopicProgress(
                id=record["id"],
                user_id=record["user_id"],
                topic_name=record["topic_name"],
                course=record["course"],
                current_subtopic_index=record["current_subtopic_index"],
                current_problem_index=record["current_problem_index"],
                current_step=record["current_step"],
                correct_answers=record["correct_answers"],
                total_problems_attempted=record["total_problems_attempted"],
                completed_subtopics=record["completed_subtopics"],
                completed_problems=record["completed_problems"],
                started_at=record["started_at"],
                last_accessed=record["last_accessed"],
                total_time_spent=record["total_time_spent"],
                created_at=record["created_at"],
                updated_at=record["updated_at"],
            )
            topic_progress_list.append(topic_progress)

        return TopicProgressResponse(topic_progress=topic_progress_list, total=len(topic_progress_list))

    except Exception as e:
        logger.error(
            f"Error retrieving topic progress for user {current_user.id}: {str(e)}"
        )
        raise HTTPException(
            status_code=500, detail=f"Error retrieving topic progress: {str(e)}"
        )


@app.get("/api/topic-progress/{topic_name}")
async def get_topic_progress(
    topic_name: str,
    course: str,
    current_user: User = Depends(get_current_user)
):
    """Get progress for a specific topic"""
    try:
        from supabase import create_client

        SUPABASE_URL = os.getenv("SUPABASE_URL")
        SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise HTTPException(status_code=500, detail="Database not configured")

        service_supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Get the specific topic progress
        response = (
            service_supabase.table("topic_progress")
            .select("*")
            .eq("user_id", current_user.id)
            .eq("topic_name", topic_name)
            .eq("course", course)
            .limit(1)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Topic progress not found")

        record = response.data[0]
        topic_progress = TopicProgress(
            id=record["id"],
            user_id=record["user_id"],
            topic_name=record["topic_name"],
            course=record["course"],
            current_subtopic_index=record["current_subtopic_index"],
            current_problem_index=record["current_problem_index"],
            current_step=record["current_step"],
            correct_answers=record["correct_answers"],
            total_problems_attempted=record["total_problems_attempted"],
            completed_subtopics=record["completed_subtopics"],
            completed_problems=record["completed_problems"],
            started_at=record["started_at"],
            last_accessed=record["last_accessed"],
            total_time_spent=record["total_time_spent"],
            created_at=record["created_at"],
            updated_at=record["updated_at"],
        )

        return topic_progress

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error retrieving topic progress for {topic_name} (course: {course}) user {current_user.id}: {str(e)}"
        )
        raise HTTPException(
            status_code=500, detail=f"Error retrieving topic progress: {str(e)}"
        )


@app.post("/api/topic-progress")
async def save_topic_progress(
    request: SaveProgressRequest,
    current_user: User = Depends(get_current_user)
):
    """Save or update topic progress"""
    try:
        from supabase import create_client

        SUPABASE_URL = os.getenv("SUPABASE_URL")
        SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise HTTPException(status_code=500, detail="Database not configured")

        service_supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Prepare the data for upsert
        progress_data = {
            "user_id": current_user.id,
            "topic_name": request.topic_name,
            "course": request.course,
            "current_subtopic_index": request.current_subtopic_index,
            "current_problem_index": request.current_problem_index,
            "current_step": request.current_step,
            "correct_answers": request.correct_answers,
            "total_problems_attempted": request.total_problems_attempted,
            "completed_subtopics": request.completed_subtopics,
            "completed_problems": request.completed_problems,
            "last_accessed": "now()",
            "updated_at": "now()",
        }

        # Add time spent to total if provided
        if request.time_spent > 0:
            # Get current record to add to total_time_spent
            existing_response = (
                service_supabase.table("topic_progress")
                .select("total_time_spent")
                .eq("user_id", current_user.id)
                .eq("topic_name", request.topic_name)
                .eq("course", request.course)
                .limit(1)
                .execute()
            )
            
            current_total = 0
            if existing_response.data:
                current_total = existing_response.data[0].get("total_time_spent", 0)
            
            progress_data["total_time_spent"] = current_total + request.time_spent

        # Upsert the progress data
        response = (
            service_supabase.table("topic_progress")
            .upsert(progress_data, on_conflict="user_id,topic_name,course")
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to save topic progress")

        return {"message": "Topic progress saved successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error saving topic progress for user {current_user.id}: {str(e)}"
        )
        raise HTTPException(
            status_code=500, detail=f"Error saving topic progress: {str(e)}"
        )


@app.delete("/api/topic-progress/{topic_name}")
async def delete_topic_progress(
    topic_name: str,
    course: str,
    current_user: User = Depends(get_current_user)
):
    """Delete topic progress"""
    try:
        from supabase import create_client

        SUPABASE_URL = os.getenv("SUPABASE_URL")
        SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise HTTPException(status_code=500, detail="Database not configured")

        service_supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Delete the topic progress (only if it belongs to the current user)
        response = (
            service_supabase.table("topic_progress")
            .delete()
            .eq("user_id", current_user.id)
            .eq("topic_name", topic_name)
            .eq("course", course)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Topic progress not found")

        return {"message": "Topic progress deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error deleting topic progress for {topic_name} (course: {course}) user {current_user.id}: {str(e)}"
        )
        raise HTTPException(
            status_code=500, detail=f"Error deleting topic progress: {str(e)}"
        )


@app.post("/api/topic-progress/{topic_name}/reset")
async def reset_topic_progress(
    topic_name: str,
    course: str,
    current_user: User = Depends(get_current_user)
):
    """Reset progress for a topic"""
    try:
        from supabase import create_client

        SUPABASE_URL = os.getenv("SUPABASE_URL")
        SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise HTTPException(status_code=500, detail="Database not configured")

        service_supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Reset the progress data
        reset_data = {
            "current_subtopic_index": 0,
            "current_problem_index": 0,
            "current_step": "article",
            "correct_answers": 0,
            "total_problems_attempted": 0,
            "completed_subtopics": [],
            "completed_problems": [],
            "last_accessed": "now()",
            "updated_at": "now()",
        }

        # Update the progress record
        response = (
            service_supabase.table("topic_progress")
            .update(reset_data)
            .eq("user_id", current_user.id)
            .eq("topic_name", topic_name)
            .eq("course", course)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Topic progress not found")

        return {"message": "Topic progress reset successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error resetting topic progress for {topic_name} (course: {course}) user {current_user.id}: {str(e)}"
        )
        raise HTTPException(
            status_code=500, detail=f"Error resetting topic progress: {str(e)}"
        )


# Authentication endpoints
# moved to routers/auth_router.py


# OCR endpoints
@app.post("/api/ocr/math", response_model=MathOcrResponse)
async def ocr_math(
    request: Optional[MathOcrRequest] = None,
    file: UploadFile = File(None),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Process a math expression image and convert it to LaTeX using Mathpix OCR.
    Accepts either a base64-encoded image or a file upload.
    """
    if mathpix_service is None:
        raise HTTPException(status_code=503, detail="OCR service is not available")

    # Log request details for debugging
    logger.info(
        f"OCR request received: request_body={request is not None}, file_upload={file is not None}"
    )

    try:
        image_data = None

        # Handle the request based on whether it's a base64 image or file upload
        if request and hasattr(request, "image_data") and request.image_data:
            # Base64 encoded image data from JSON request
            logger.info("Processing OCR request with base64 image data")
            image_data = request.image_data
            is_base64 = True
        elif file and file.filename:
            # File upload
            logger.info(f"Processing OCR request with uploaded file: {file.filename}")
            contents = await file.read()
            image_data = base64.b64encode(contents).decode("utf-8")
            is_base64 = True
        else:
            # Log detailed information about the missing image data
            logger.error(
                "No image data provided - request details: "
                + f"request={request is not None}, "
                + f"has_image_data={request and hasattr(request, 'image_data')}, "
                + f"file={file is not None}, "
                + f"file_has_filename={file and file.filename is not None}"
            )
            raise HTTPException(status_code=400, detail="No image data provided")

        # Process the image with Mathpix
        result = await mathpix_service.process_image(image_data, is_base64=is_base64)

        # Extract LaTeX from the response
        latex = result.get("latex", "")
        text = result.get("text", "")
        confidence = result.get("confidence", 0.0)

        # Log successful OCR processing
        logger.info(f"OCR processing successful: confidence={confidence}")

        if not latex and not text:
            logger.warning(
                "OCR processed successfully but no math expressions recognized"
            )
            return MathOcrResponse(
                latex="",
                text="",
                confidence=0.0,
                error_message="Could not recognize any math expressions in the image",
            )

        return MathOcrResponse(
            latex=latex, text=text, confidence=confidence, error_message=None
        )

    except HTTPException:
        # Re-raise HTTP exceptions without additional logging
        raise
    except Exception as e:
        logger.error(f"Error processing OCR request: {str(e)}")
        return MathOcrResponse(
            latex="",
            text="",
            confidence=0.0,
            error_message=f"Error processing image: {str(e)}",
        )


@app.post("/api/check-answer-ocr", response_model=AnswerCheckResponse)
async def check_answer_ocr(
    request: AnswerCheckOcrRequest,
    current_user: User = Depends(get_current_user_optional),
):
    """
    Check a handwritten answer by first using OCR to convert the image to LaTeX,
    then validating it against the correct answer.
    """
    if mathpix_service is None:
        raise HTTPException(status_code=503, detail="OCR service is not available")

    try:
        # First process the image with Mathpix OCR
        result = await mathpix_service.process_image(request.image_data, is_base64=True)

        # Extract the recognized LaTeX - try both latex and text fields
        recognized_latex = result.get("latex", "")
        if not recognized_latex:
            recognized_latex = result.get("text", "")

        # Clean up the LaTeX if needed
        if recognized_latex:
            # Remove any surrounding delimiters like \( \) or $ $
            recognized_latex = recognized_latex.strip()
            if recognized_latex.startswith("\\(") and recognized_latex.endswith("\\)"):
                recognized_latex = recognized_latex[2:-2].strip()
            elif recognized_latex.startswith("$") and recognized_latex.endswith("$"):
                recognized_latex = recognized_latex[1:-1].strip()

        # Log the extracted LaTeX
        logger.info(f"OCR recognized LaTeX: '{recognized_latex}'")

        if not recognized_latex:
            logger.warning("OCR failed to extract any LaTeX from the image")
            return AnswerCheckResponse(
                is_correct=False,
                confidence=0.0,
                explanation="Could not recognize any math expressions in the image",
                error_message="OCR failed to extract any LaTeX from the image",
                recognized_latex="",
            )

        # Now create an AnswerCheckRequest using the recognized LaTeX
        answer_check_request = AnswerCheckRequest(
            user_answer=recognized_latex,
            correct_answer=request.correct_answer,
            problem_type=request.problem_type,
            question_type=request.question_type,
            selected_option=request.selected_option,
        )

        # Get the answer check result
        check_result = await check_answer(answer_check_request)

        # Create a new response with the recognized LaTeX
        response = AnswerCheckResponse(
            is_correct=check_result.is_correct,
            confidence=check_result.confidence,
            explanation=check_result.explanation,
            error_message=check_result.error_message,
            recognized_latex=recognized_latex,
        )

        # Log the full response for debugging
        logger.info(
            f"Sending check-answer-ocr response: is_correct={response.is_correct}, recognized_latex='{response.recognized_latex}'"
        )

        return response

    except Exception as e:
        logger.error(f"Error processing OCR answer check: {str(e)}")
        return AnswerCheckResponse(
            is_correct=False,
            confidence=0.0,
            explanation="Error occurred during OCR processing",
            error_message=str(e),
            recognized_latex="",
        )


# check-answer endpoint moved to routers/answer.py


@app.get("/api/verify-checkout-session/{session_id}")
async def verify_checkout_session(
    session_id: str, current_user: User = Depends(get_current_user)
):
    """Verify a checkout session and return subscription status."""

    # Configure Stripe with secret key
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    try:
        # Retrieve the checkout session
        session = stripe.checkout.Session.retrieve(session_id)

        # Verify the session belongs to the current user
        if (
            session.metadata is None
            or session.metadata.get("user_id") != current_user.id
        ):
            raise HTTPException(
                status_code=403, detail="Session does not belong to current user"
            )

        # Check if payment was successful
        if session.payment_status == "paid":
            # Get subscription status from Supabase
            from supabase import create_client

            SUPABASE_URL = os.getenv("SUPABASE_URL")
            SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

            if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
                # Return basic success if Supabase is not configured
                return {
                    "payment_status": "paid",
                    "subscription_status": "active",
                    "plan": session.metadata.get("plan", "pro")
                    if session.metadata
                    else "pro",
                    "session_id": session_id,
                }

            service_supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

            # Get subscription from database
            response = (
                service_supabase.table("subscriptions")
                .select("*")
                .eq("user_id", current_user.id)
                .execute()
            )

            if response.data:
                subscription = response.data[0]
                return {
                    "payment_status": "paid",
                    "subscription_status": subscription.get("status", "active"),
                    "plan": subscription.get("plan", "pro"),
                    "max_prompts_per_week": subscription.get(
                        "max_prompts_per_week", 100
                    ),
                    "prompts_used_this_week": subscription.get(
                        "prompts_used_this_week", 0
                    ),
                    "current_period_end": subscription.get("current_period_end"),
                    "session_id": session_id,
                }
            else:
                # Subscription might not be created yet by webhook
                return {
                    "payment_status": "paid",
                    "subscription_status": "pending",
                    "plan": session.metadata.get("plan", "pro")
                    if session.metadata
                    else "pro",
                    "session_id": session_id,
                    "note": "Subscription is being processed",
                }
        else:
            return {
                "payment_status": session.payment_status,
                "subscription_status": "inactive",
                "session_id": session_id,
            }

    except stripe.StripeError as e:
        logger.error(f"Stripe error verifying session: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        logger.error(f"Error verifying checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to verify checkout session")


# check-work-with-feedback endpoint moved to routers/feedback.py


# GitHub and email endpoints moved to routers


# Tommy Assistant API
class TommyChatRequest(BaseModel):
    message: str
    problem_context: dict
    conversation_history: List[Dict[str, str]] = []


class TommyChatResponse(BaseModel):
    response: str
    timestamp: datetime


@app.post("/api/tommy/chat")
async def tommy_chat_stream(
    request: TommyChatRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Tommy assistant chat endpoint with streaming - provides contextual help for math problems.
    """

    async def generate():
        try:
            # Extract problem context
            problem = request.problem_context.get("problem", {})
            topic = request.problem_context.get("topic", "")
            subtopic = request.problem_context.get("subtopic", "")
            user_work = request.problem_context.get("user_work", "")
            hint_level = request.problem_context.get("hint_level", 0)

            # Build conversation history for context
            conversation_text = "\n".join(
                [
                    f"{msg['role']}: {msg['content']}"
                    for msg in request.conversation_history[-5:]
                ]  # Last 5 messages
            )

            # Create prompt for Tommy
            prompt = build_tommy_prompt(
                topic=topic,
                subtopic=subtopic,
                problem_question=problem.get("question", ""),
                problem_answer=problem.get("answer", ""),
                problem_type=problem.get("type", ""),
                user_work=user_work,
                hint_level=hint_level,
                conversation_text=conversation_text,
                student_message=request.message,
            )

            # Generate response using Gemini with streaming
            response = feedback_model.generate_content(prompt, stream=True)

            # Stream the response chunks
            for chunk in response:
                if chunk.text:
                    yield chunk.text

        except Exception as e:
            logger.error(f"Error in Tommy chat stream: {str(e)}")
            yield f"\n\n[Error: {str(e)}]"

    return StreamingResponse(generate(), media_type="text/plain")


@app.post("/api/increment-usage")
async def increment_usage(current_user: User = Depends(get_current_user)):
    """Increment the user's weekly usage count"""
    try:
        from supabase import create_client

        SUPABASE_URL = os.getenv("SUPABASE_URL")
        SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise HTTPException(status_code=500, detail="Database not configured")

        service_supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Get current subscription status
        response = (
            service_supabase.table("subscriptions")
            .select("*")
            .eq("user_id", current_user.id)
            .limit(1)
            .execute()
        )

        if not response.data:
            # Create new subscription record for free plan
            subscription_data = {
                "user_id": current_user.id,
                "plan": "free",
                "status": "active",
                "max_prompts_per_week": 10,
                "prompts_used_this_week": 1,
                "week_start_date": datetime.now().isoformat(),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
            }
            
            result = service_supabase.table("subscriptions").insert(subscription_data).execute()
            return {"message": "Usage incremented", "new_count": 1}
        
        subscription = response.data[0]
        current_usage = subscription.get("prompts_used_this_week", 0)
        max_prompts = subscription.get("max_prompts_per_week", 10)
        
        # Check if user has reached their limit
        if current_usage >= max_prompts:
            raise HTTPException(
                status_code=429, 
                detail=f"Usage limit reached. You've used {current_usage}/{max_prompts} prompts this week."
            )
        
        # Increment usage
        new_count = current_usage + 1
        service_supabase.table("subscriptions").update({
            "prompts_used_this_week": new_count,
            "updated_at": datetime.now().isoformat()
        }).eq("user_id", current_user.id).execute()
        
        return {"message": "Usage incremented", "new_count": new_count}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error incrementing usage for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error incrementing usage: {str(e)}")


app.include_router(ocr_router)
app.include_router(content_router)
app.include_router(subscription_router)
app.include_router(answer_router)
app.include_router(feedback_router)
app.include_router(auth_router)
app.include_router(github_router)
app.include_router(email_router)


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("FASTAPI_HOST", "127.0.0.1")
    port = int(os.getenv("FASTAPI_PORT", 8000))
    uvicorn.run(app, host=host, port=port)
