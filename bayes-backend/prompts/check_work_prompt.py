"""Prompt builder for the text-based analysis of a student's handwritten work.

This moves the long f-string out of main.py so the template lives in one place.
"""

from __future__ import annotations
from typing import List, Dict

__all__ = ["build_check_work_prompt"]


def build_check_work_prompt(
    *,
    question: str,
    correct_answer: str,
    extracted_work: str,
    math_expressions: List[Dict[str, str]],
) -> str:
    """Return the full analysis prompt sent to Gemini.

    Args:
        question: The original problem statement.
        correct_answer: The correct answer to the problem.
        extracted_work: LaTeX representing all of the student's work.
        math_expressions: A list of dicts each containing a ``latex`` key that
            represents individual steps of work (already split by earlier logic).
    """
    bullet_lines = "\n".join(
        [
            f"- Step {i + 1}: {expr.get('latex', '').strip()}"
            for i, expr in enumerate(math_expressions)
        ]
    )

    return (
        "You are a concise mathematics tutor. Analyse the student's LaTeX work and OUTPUT ONLY ERRORS.\n\n"
        "Inputs\n-------\n"
        f"Question: {question}\n"
        f"Correct Answer: {correct_answer}\n"
        f"My Work (LaTeX): {extracted_work}\n\n"
        "Detected work split into steps:\n"
        f"{bullet_lines}\n\n"
        'For every step that contains a mathematical ERROR, add an object to the array "feedback_items" with:\n'
        "  • step_number       – 1-based index of the step that contains the error\n"
        '  • problematic_part  – short label (e.g. "coefficient", "exponent", "entire expression")\n'
        '  • area              – 2-3 word title (e.g. "Arithmetic Error", "Derivative")\n'
        "  • issue             – 1-2 sentence description of what is wrong (use LaTeX)\n"
        "  • suggestion        – 1-2 sentence suggestion to fix it (use LaTeX)\n\n"
        "Do NOT include compliments for correct steps.\n"
        "Do NOT include overall assessment, confidence level, or general feedback.\n"
        "If a step is fully correct, do not create an entry for it.\n"
        "If *no* errors are found return an empty array.\n\n"
        "IMPORTANT FORMAT (JSON ONLY):\n"
        "Return **raw valid JSON** (no markdown) matching exactly this schema – nothing else:\n"
        "{\n"
        '  "feedback_items": [\n'
        "    {\n"
        '      "step_number": n,\n'
        '      "problematic_part": "...",\n'
        '      "area": "...",\n'
        '      "issue": "...",\n'
        '      "suggestion": "..."\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "(If there are multiple errors include multiple objects in the array.)\n"
        "Ensure backslashes in LaTeX are double-escaped (\\\\) so the JSON is valid.\n"
    )
