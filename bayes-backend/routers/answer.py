import logging
from fastapi import APIRouter
from models.answer_models import AnswerCheckRequest, AnswerCheckResponse, ProblemType
from utils.latex_utils import (
    extract_math_expr,
    clean_latex,
    check_numeric_equivalence,
    check_symbolic_equivalence,
    check_algebraic_equivalence,
    are_equivalent,
)

router = APIRouter(prefix="/api", tags=["answer"])
logger = logging.getLogger(__name__)


@router.post("/check-answer", response_model=AnswerCheckResponse)
async def check_answer(request: AnswerCheckRequest):
    try:
        if request.question_type == ProblemType.MULTIPLE_CHOICE:
            sel = request.selected_option
            if sel is None:
                return AnswerCheckResponse(
                    is_correct=False, confidence=0.0, explanation="No option selected"
                )
            try:
                correct_idx = int(request.correct_answer)
                is_corr = sel == correct_idx
                return AnswerCheckResponse(
                    is_correct=is_corr,
                    confidence=1.0 if is_corr else 0.0,
                    explanation="Correct answer selected"
                    if is_corr
                    else f"Incorrect. Correct option was {correct_idx + 1}.",
                )
            except ValueError:
                return AnswerCheckResponse(
                    is_correct=False,
                    confidence=0.0,
                    explanation="Invalid correct_answer format",
                    error_message="Invalid correct_answer format",
                )

        user_expr = clean_latex(extract_math_expr(request.user_answer.strip()))
        corr_expr = clean_latex(extract_math_expr(request.correct_answer.strip()))

        strategies = [
            ("latex_exact", user_expr == corr_expr, 1.0),
            ("numeric", check_numeric_equivalence(user_expr, corr_expr), 0.9),
            ("symbolic", check_symbolic_equivalence(user_expr, corr_expr), 0.8),
            ("algebraic", check_algebraic_equivalence(user_expr, corr_expr), 0.7),
            ("rhs_equiv", are_equivalent(user_expr, corr_expr), 0.95),
        ]
        best = next(((name, conf) for name, ok, conf in strategies if ok), None)
        if best:
            name, conf = best
            return AnswerCheckResponse(
                is_correct=True,
                confidence=conf,
                explanation=f"Answer correct via {name} comparison",
            )
        return AnswerCheckResponse(
            is_correct=False,
            confidence=0.0,
            explanation=f"Answer is incorrect. Expected {corr_expr}, got {user_expr}",
        )
    except Exception as e:
        logger.error(f"Error in check-answer: {e}")
        return AnswerCheckResponse(
            is_correct=False,
            confidence=0.0,
            explanation="Validation error",
            error_message=str(e),
        )
