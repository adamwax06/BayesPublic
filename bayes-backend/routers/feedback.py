import logging
import re
import os
import json
from typing import List, Dict, Any

import httpx
from fastapi import APIRouter, HTTPException, Depends

from auth import get_current_user_optional
from services.mathpix_service import mathpix_service
from services.gemini_vision_service import gemini_vision_service
from models.feedback_models import (
    CheckWorkWithFeedbackRequest,
    CheckWorkWithFeedbackResponse,
    FeedbackItem,
)

router = APIRouter(prefix="/api", tags=["feedback"])
logger = logging.getLogger(__name__)


@router.post("/check-work-with-feedback", response_model=CheckWorkWithFeedbackResponse)
async def check_work_with_feedback(
    request: CheckWorkWithFeedbackRequest,
    current_user=Depends(get_current_user_optional),
):
    if mathpix_service is None:
        raise HTTPException(status_code=503, detail="OCR service is not available")

    try:
        logger.info("Starting work analysis with feedback")
        logger.info(f"Image data length: {len(request.image_data)}")

        # normalise data URI prefix
        if not request.image_data.startswith("data:image"):
            request.image_data = f"data:image/jpeg;base64,{request.image_data}"

        # Step 1: OCR with Mathpix (include line_data)
        mp_req = {
            "src": request.image_data,
            "formats": ["text", "data"],
            "include_line_data": True,
            "data_options": {"include_latex": True, "include_asciimath": True},
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.mathpix.com/v3/text",
                headers={
                    "app_id": os.getenv("MATHPIX_APP_ID"),
                    "app_key": os.getenv("MATHPIX_APP_KEY"),
                    "Content-Type": "application/json",
                },
                json=mp_req,
                timeout=30.0,
            )
        resp.raise_for_status()
        mp = resp.json()
        extracted_work = mp.get("text", "")

        line_data = mp.get("line_data", [])
        math_expressions: List[Dict[str, Any]] = []
        for line in line_data:
            if line.get("type") == "math" and line.get("included"):
                cnt = line.get("cnt", [])
                if len(cnt) >= 4:
                    xs = [p[0] for p in cnt]
                    ys = [p[1] for p in cnt]
                    math_expressions.append(
                        {
                            "latex": line.get("text", "").strip(),
                            "coordinates": {
                                "x": min(xs),
                                "y": min(ys),
                                "width": max(xs) - min(xs),
                                "height": max(ys) - min(ys),
                            },
                            "confidence": line.get("confidence", 0),
                        }
                    )

        # Heuristic split if single array-block
        if len(math_expressions) == 1 and "\\\\" in math_expressions[0]["latex"]:
            base = math_expressions[0]
            lines = [
                seg.strip() for seg in re.split(r"\\\\", base["latex"]) if seg.strip()
            ]
            h_each = base["coordinates"]["height"] / len(lines)
            math_expressions = []
            for i, line_tex in enumerate(lines):
                math_expressions.append(
                    {
                        "latex": line_tex,
                        "coordinates": {
                            **base["coordinates"],
                            "y": int(base["coordinates"]["y"] + i * h_each),
                            "height": int(h_each),
                        },
                        "confidence": base["confidence"],
                    }
                )

        # Step 3: Call Gemini flash for feedback JSON
        prompt_lines = "\n".join(
            [f"- Step {i + 1}: {e['latex']}" for i, e in enumerate(math_expressions)]
        )
        analysis_prompt = f"""
You are a concise mathematics tutor. Analyse the student's LaTeX work and OUTPUT ONLY ERRORS.

Question: {request.question}
Correct Answer: {request.correct_answer}
My Work (LaTeX): {extracted_work}

Detected work split into steps:
{prompt_lines}

For every erroneous step output JSON with keys step_number, problematic_part, area, issue, suggestion (LaTeX escaped).  Return {{"feedback_items": []}} if no errors.  No markdown.
"""
        from services.gemini_feedback_service import feedback_model

        model = feedback_model or gemini_vision_service.model
        response = model.generate_content(analysis_prompt)
        result_text = response.text.strip()
        if "```" in result_text:
            result_text = result_text.split("```")[-2].strip()
        try:
            cleaned = result_text.strip()
            json_match = re.search(r"({[\s\S]*})", cleaned)
            if json_match:
                cleaned = json_match.group(1)

            # Temporarily double-escape backslashes so JSON parser survives LaTeX
            cleaned_escaped = cleaned.replace("\\", "\\\\")
            analysis = json.loads(cleaned_escaped, strict=False)

            # Restore single backslashes so LaTeX renders correctly client-side
            def _restore(obj):
                if isinstance(obj, str):
                    return obj.replace("\\\\", "\\")
                if isinstance(obj, list):
                    return [_restore(v) for v in obj]
                if isinstance(obj, dict):
                    return {k: _restore(v) for k, v in obj.items()}
                return obj

            analysis = _restore(analysis)
        except Exception as e:
            logger.error(f"Gemini JSON parse error: {e}")
            analysis = {"feedback_items": []}

        fb_items: List[FeedbackItem] = []
        for item in analysis.get("feedback_items", []):
            idx = max(0, min(len(math_expressions) - 1, item.get("step_number", 1) - 1))
            coords = math_expressions[idx]["coordinates"]
            fb_items.append(
                FeedbackItem(
                    area=item.get("area", "Expression"),
                    coordinates=coords,
                    issue=item.get("issue", "Issue"),
                    suggestion=item.get("suggestion", "Suggestion"),
                    severity="high",
                )
            )

        return CheckWorkWithFeedbackResponse(
            overall_correct=len(fb_items) == 0,
            feedback_items=fb_items,
            general_feedback=analysis.get(
                "general_feedback", "Work analysis completed."
            ),
            confidence=analysis.get("confidence", 0.0),
            extracted_work=extracted_work,
            math_expressions=math_expressions,
        )
    except Exception as e:
        logger.error(f"Error in feedback analysis: {e}")
        return CheckWorkWithFeedbackResponse(
            overall_correct=False,
            feedback_items=[],
            general_feedback="Error analysing work.",
            confidence=0.0,
            error_message=str(e),
            extracted_work="",
        )
