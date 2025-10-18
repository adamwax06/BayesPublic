from fastapi import APIRouter, HTTPException, Depends
import os
import json
import re
from typing import List
import logging
import time
from auth import service_supabase  # reuse service-role client if available

import google.generativeai as genai

from models.content_models import (
    TopicRequest,
    GenerateContentResponse,
    Problem,
    Subtopic,
    HomeworkImageRequest,
    TopicDetectionResponse,
)
from auth import get_current_user_optional, check_usage_limit, increment_usage
from services.gemini_vision_service import gemini_vision_service
from prompts.generate_content_prompt import GENERATE_CONTENT_PROMPT
from sse_starlette import EventSourceResponse

logger = logging.getLogger(__name__)

# own Gemini text model to avoid import cycle
gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    raise RuntimeError("GEMINI_API_KEY not set")
genai.configure(api_key=gemini_api_key)
content_model = genai.GenerativeModel("gemini-2.5-pro")

router = APIRouter(prefix="/api", tags=["content"])

# ---------------------------------------------------------------------------
# Supabase caching helpers
# ---------------------------------------------------------------------------

CACHE_TABLE = "generated_topics"


def _norm(s: str) -> str:
    """Normalize topic/course keys.

    * Lower-case
    * Trim surrounding whitespace
    * Treat hyphens as spaces so "calc-1" ≡ "calc 1"
    * Collapse multiple spaces to a single space
    """
    s = s.strip().lower().replace("-", " ")
    return re.sub(r"\s+", " ", s)  # collapse repeated whitespace


def _supabase_available():
    return service_supabase is not None


def get_cached_topic(topic: str, course: str):
    """Return JSON dict if present in cache table, else None."""
    if not _supabase_available():
        return None
    try:
        resp = (
            service_supabase.table(CACHE_TABLE)
            .select("content")
            .eq("topic", _norm(topic))
            .eq("course", _norm(course))
            .limit(1)
            .execute()
        )
        if resp.data:
            # Async is unnecessary; fire-and-forget update last_accessed
            service_supabase.table(CACHE_TABLE).update({"last_accessed": "now()"}).eq(
                "topic", _norm(topic)
            ).eq("course", _norm(course)).execute()
            return resp.data[0]["content"]
    except Exception as exc:
        logger.warning(f"Cache lookup failed: {exc}")
    return None


def save_cached_topic(topic: str, course: str, content_json: dict, generation_secs: float):
    if not _supabase_available():
        return
    try:
        service_supabase.table(CACHE_TABLE).upsert(
            {
                "topic": _norm(topic),
                "course": _norm(course),
                "content": content_json,
                "generation_time_s": generation_secs,
            },
            on_conflict="topic,course",
        ).execute()
    except Exception as exc:
        logger.warning(f"Cache save failed: {exc}")


@router.post("/generate-content", response_model=GenerateContentResponse)
async def generate_content(
    request: TopicRequest, current_user=Depends(get_current_user_optional)
):
    # --- usage gating -------------------------------------------------------
    if current_user:
        usage_limit = await check_usage_limit(current_user.id)
        if not usage_limit.get("can_use"):
            raise HTTPException(
                status_code=429,
                detail=(
                    f"You have used {usage_limit.get('used_prompts')} of {usage_limit.get('max_prompts')} "
                    "weekly prompts. Please upgrade for more."
                ),
            )
    # -----------------------------------------------------------------------
    # Check cache first
    cached = get_cached_topic(request.topic, request.course)
    if cached:
        logger.info("Serving topic from cache (generate-content)")
        return GenerateContentResponse(**cached)

    try:
        logger.info(f"Generating content for topic: {request.topic}")
        t0 = time.perf_counter()
        prompt = GENERATE_CONTENT_PROMPT.format(
            topic=request.topic, course=request.course
        )
        response = content_model.generate_content(prompt)
        if not response.text:
            raise HTTPException(
                status_code=500, detail="Failed to generate content from Gemini"
            )

        response_text = response.text.strip()
        # Strip backticks if model wrapped code block
        if response_text.startswith("```json"):
            response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
        elif response_text.startswith("```"):
            response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]

        match = re.search(r"({[\s\S]*})", response_text)
        if match:
            response_text = match.group(1)
        response_text = response_text.strip().replace("\\", "\\\\")

        content_data = json.loads(response_text, strict=False)

        def _restore(obj):
            if isinstance(obj, dict):
                return {k: _restore(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [_restore(v) for v in obj]
            if isinstance(obj, str):
                return obj.replace("\\\\", "\\")
            return obj

        content_data = _restore(content_data)
        if (
            not isinstance(content_data, dict)
            or "topic" not in content_data
            or "subtopics" not in content_data
        ):
            raise ValueError("Invalid JSON structure from Gemini")

        subtopics: List[Subtopic] = []
        for sub in content_data["subtopics"]:
            problems = [Problem(**p) for p in sub["problems"]]
            subtopics.append(
                Subtopic(title=sub["title"], article=sub["article"], problems=problems)
            )

        resp_obj = GenerateContentResponse(
            topic=content_data["topic"], subtopics=subtopics
        )

        # Save to cache
        save_cached_topic(request.topic, request.course, resp_obj.model_dump(), time.perf_counter() - t0)

        if current_user:
            await increment_usage(current_user.id)
        return resp_obj
    except Exception as e:
        logger.error(f"Error generating content: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detect-topic", response_model=TopicDetectionResponse)
async def detect_topic(
    request: HomeworkImageRequest, current_user=Depends(get_current_user_optional)
):
    if not gemini_vision_service:
        raise HTTPException(
            status_code=503, detail="Topic detection service not available"
        )
    if not request.image_data:
        raise HTTPException(status_code=400, detail="No image data provided")
    try:
        result = await gemini_vision_service.detect_topic(
            request.image_data, is_base64=True
        )
        if "error" in result:
            return TopicDetectionResponse(
                topic=result.get("topic", "Error detecting topic"),
                course=result.get("course", "calc 1"),
                confidence=result.get("confidence", 0.0),
                error_message=result.get("error"),
            )
        return TopicDetectionResponse(
            topic=result.get("topic", "Unknown topic"),
            course=result.get("course", "calc 1"),
            confidence=result.get("confidence", 0.0),
        )
    except Exception as e:
        logger.error(f"Unexpected error in topic detection: {e}")
        return TopicDetectionResponse(
            topic="Error detecting topic",
            course="calc 1",
            confidence=0.0,
            error_message=str(e),
        )


@router.post("/upload-homework", response_model=GenerateContentResponse)
async def upload_homework(
    request: HomeworkImageRequest, current_user=Depends(get_current_user_optional)
):
    if not gemini_vision_service:
        raise HTTPException(
            status_code=503, detail="Topic detection service not available"
        )
    if not request.image_data:
        raise HTTPException(status_code=400, detail="No image data provided")

    # 1. detect topic
    result = await gemini_vision_service.detect_topic(
        request.image_data, is_base64=True
    )
    if "error" in result or result.get("topic") in [
        "Error detecting topic",
        "General Mathematics",
    ]:
        raise HTTPException(
            status_code=400,
            detail="Could not recognize a specific mathematics topic in this image",
        )

    topic_req = TopicRequest(
        topic=result.get("topic"), course=result.get("course", "calc 1")
    )
    return await generate_content(topic_req)


@router.post("/stream-content")
async def stream_content(
    topic: str,
    course: str = "calc 1",
    current_user=Depends(get_current_user_optional),
):
    """Stream Gemini-generated content via Server-Sent Events."""

    # --- usage gating (same logic as /generate-content) ---------------------
    if current_user:
        usage_limit = await check_usage_limit(current_user.id)
        if not usage_limit.get("can_use"):
            raise HTTPException(
                status_code=429,
                detail=(
                    f"You have used {usage_limit.get('used_prompts')} of {usage_limit.get('max_prompts')} "
                    "weekly prompts. Please upgrade for more."
                ),
            )

    # Attempt cache lookup first
    cached = get_cached_topic(topic, course)

    if cached:
        logger.info("Serving topic from cache (stream-content)")

        async def cached_stream():
            import json as _json
            yield {"data": _json.dumps(cached)}

        return EventSourceResponse(cached_stream(), media_type="text/event-stream")

    # ----- cache miss: stream from Gemini and save afterwards -------------

    t0 = time.perf_counter()
    buffer = []

    async def event_generator():
        nonlocal buffer
        async for chunk in gemini_stream(topic, course):
            if isinstance(chunk, dict) and "data" in chunk:
                buffer.append(chunk["data"])
            yield chunk

        # Streaming finished – try to parse full JSON and cache
        try:
            import json as _json

            full_json = _json.loads("".join(buffer))
            save_cached_topic(topic, course, full_json, time.perf_counter() - t0)
        except Exception as exc:
            logger.warning(f"Failed to cache streamed topic: {exc}")

        # usage count
        if current_user:
            await increment_usage(current_user.id)

    return EventSourceResponse(event_generator(), status_code=202, media_type="text/event-stream")