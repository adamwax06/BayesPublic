from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import Optional
import logging

from models.ocr_models import MathOcrRequest, MathOcrResponse, AnswerCheckOcrRequest
from services.mathpix_service import mathpix_service
from auth import get_current_user_optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["ocr"])


# /api/ocr/math
@router.post("/ocr/math", response_model=MathOcrResponse)
async def ocr_math(
    request: Optional[MathOcrRequest] = None,
    file: UploadFile = File(None),
    current_user=Depends(get_current_user_optional),
):
    # identical body to previous implementation – imported services remain the same
    if mathpix_service is None:
        raise HTTPException(status_code=503, detail="OCR service is not available")

    logger.info(
        f"OCR request received: request_body={request is not None}, file_upload={file is not None}"
    )
    try:
        image_data = None
        # Base64 or file logic
        if request and hasattr(request, "image_data") and request.image_data:
            logger.info("Processing OCR request with base64 image data")
            image_data = request.image_data
            is_base64 = True
        elif file and file.filename:
            logger.info(f"Processing OCR request with uploaded file: {file.filename}")
            contents = await file.read()
            import base64

            image_data = base64.b64encode(contents).decode("utf-8")
            is_base64 = True
        else:
            logger.error("No image data provided")
            raise HTTPException(status_code=400, detail="No image data provided")

        result = await mathpix_service.process_image(image_data, is_base64=is_base64)
        latex = result.get("latex", "")
        text = result.get("text", "")
        confidence = result.get("confidence", 0.0)

        logger.info(f"OCR processing successful: confidence={confidence}")

        if not latex and not text:
            return MathOcrResponse(
                latex="",
                text="",
                confidence=0.0,
                error_message="Could not recognize any math expressions in the image",
            )

        return MathOcrResponse(latex=latex, text=text, confidence=confidence)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing OCR request: {str(e)}")
        return MathOcrResponse(
            latex="",
            text="",
            confidence=0.0,
            error_message=f"Error processing image: {str(e)}",
        )


# /api/check-answer-ocr
@router.post("/check-answer-ocr", response_model=MathOcrResponse)
async def check_answer_ocr(
    request: AnswerCheckOcrRequest,
    current_user=Depends(get_current_user_optional),
):
    if mathpix_service is None:
        raise HTTPException(status_code=503, detail="OCR service is not available")

    try:
        result = await mathpix_service.process_image(request.image_data, is_base64=True)
        recognized_latex = result.get("latex", "") or result.get("text", "")
        if (
            recognized_latex
            and recognized_latex.startswith("\\(")
            and recognized_latex.endswith("\\)")
        ):
            recognized_latex = recognized_latex[2:-2].strip()
        elif recognized_latex.startswith("$") and recognized_latex.endswith("$"):
            recognized_latex = recognized_latex[1:-1].strip()

        logger.info(f"OCR recognized LaTeX: '{recognized_latex}'")

        if not recognized_latex:
            return MathOcrResponse(
                latex="",
                text="",
                confidence=0.0,
                error_message="Could not recognize any math expressions in the image",
            )

        # Lazy import to avoid circular dependency: check_answer lives in main for now
        from main import AnswerCheckRequest, check_answer

        answer_check_req = AnswerCheckRequest(
            user_answer=recognized_latex,
            correct_answer=request.correct_answer,
            problem_type=request.problem_type,
            question_type=request.question_type,
            selected_option=request.selected_option,
        )
        check_res = await check_answer(answer_check_req)
        return MathOcrResponse(
            latex=recognized_latex,
            text="",
            confidence=check_res.confidence,
            error_message=check_res.error_message,
        )

    except Exception as e:
        logger.error(f"Error processing OCR answer check: {str(e)}")
        return MathOcrResponse(
            latex="",
            text="",
            confidence=0.0,
            error_message=str(e),
        )
