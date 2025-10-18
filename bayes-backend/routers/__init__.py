from .ocr import router as ocr_router
from .content import router as content_router
from .subscription import router as subscription_router
from .answer import router as answer_router
from .feedback import router as feedback_router
from .auth_router import router as auth_router
from .github_router import router as github_router
from .email_router import router as email_router

__all__ = [
    "ocr_router",
    "content_router",
    "subscription_router",
    "answer_router",
    "feedback_router",
    "auth_router",
    "github_router",
    "email_router",
]
