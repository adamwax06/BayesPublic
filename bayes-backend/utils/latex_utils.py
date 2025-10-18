import re
import logging
import sympy
from sympy import symbols, simplify, expand, factor

logger = logging.getLogger(__name__)

__all__ = [
    "extract_math_expr",
    "clean_latex",
    "latex_to_sympy",
    "check_numeric_equivalence",
    "check_symbolic_equivalence",
    "check_algebraic_equivalence",
    "are_equivalent",
]


def extract_math_expr(latex: str) -> str:
    matches = re.findall(r"\${1,2}(.*?)\${1,2}", latex)
    return matches[0].strip() if matches else latex.strip()


def clean_latex(latex: str) -> str:
    cleaned = re.sub(r"\s+", "", latex)
    return re.sub(r"^\$|\$$", "", cleaned)


def latex_to_sympy(latex: str):
    try:
        x, y, z, a, b, c, n, i = symbols("x y z a b c n i")
        sympy_str = re.sub(r"^\$|\$$", "", latex.strip())
        sympy_str = re.sub(r"\\frac\{([^}]+)\}\{([^}]+)\}", r"(\1)/(\2)", sympy_str)
        sympy_str = re.sub(r"\\sqrt\{([^}]+)\}", r"sqrt(\1)", sympy_str)
        sympy_str = re.sub(
            r"\\sqrt\[([^]]+)\]\{([^}]+)\}", r"(\2)**(1/(\1))", sympy_str
        )
        sympy_str = re.sub(r"\\sin\{([^}]+)\}", r"sin(\1)", sympy_str)
        sympy_str = re.sub(r"\\cos\{([^}]+)\}", r"cos(\1)", sympy_str)
        sympy_str = re.sub(r"\\tan\{([^}]+)\}", r"tan(\1)", sympy_str)
        sympy_str = re.sub(r"\\log\{([^}]+)\}", r"log(\1)", sympy_str)
        sympy_str = re.sub(r"\\ln\{([^}]+)\}", r"log(\1)", sympy_str)
        sympy_str = re.sub(r"\\pi", "pi", sympy_str)
        sympy_str = re.sub(r"\\theta", "theta", sympy_str)
        sympy_str = re.sub(r"\\infty", "oo", sympy_str)
        sympy_str = re.sub(r"\\mathrm\{e\}", "E", sympy_str)
        sympy_str = re.sub(r"\\cdot", "*", sympy_str)
        sympy_str = re.sub(r"\\div", "/", sympy_str)
        sympy_str = re.sub(r"\\pm", "+/-", sympy_str)
        return sympy.sympify(sympy_str)
    except Exception as e:
        logger.debug(f"LaTeX→SymPy error for '{latex}': {e}")
        return None


def check_numeric_equivalence(e1: str, e2: str) -> bool:
    try:
        s1 = latex_to_sympy(e1)
        s2 = latex_to_sympy(e2)
        if s1 is None or s2 is None:
            return False
        return abs(float(s1.evalf()) - float(s2.evalf())) < 1e-9
    except Exception:
        return False


def check_symbolic_equivalence(e1: str, e2: str) -> bool:
    try:
        s1 = latex_to_sympy(e1)
        s2 = latex_to_sympy(e2)
        return s1 is not None and s2 is not None and simplify(s1).equals(simplify(s2))
    except Exception:
        return False


def check_algebraic_equivalence(e1: str, e2: str) -> bool:
    try:
        s1 = latex_to_sympy(e1)
        s2 = latex_to_sympy(e2)
        if s1 is None or s2 is None:
            return False
        if expand(s1).equals(expand(s2)):
            return True
        if factor(s1).equals(factor(s2)):
            return True
        return simplify(s1 - s2) == 0
    except Exception:
        return False


def are_equivalent(user_expr: str, correct_expr: str) -> bool:
    if check_symbolic_equivalence(user_expr, correct_expr):
        return True
    if "=" in correct_expr and "=" not in user_expr:
        rhs = correct_expr.split("=", 1)[1].strip()
        if check_symbolic_equivalence(user_expr, rhs):
            return True
    if "=" in user_expr and "=" not in correct_expr:
        rhs = user_expr.split("=", 1)[1].strip()
        if check_symbolic_equivalence(rhs, correct_expr):
            return True
    return False
