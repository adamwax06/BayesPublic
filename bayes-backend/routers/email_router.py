import logging
from fastapi import APIRouter, Depends
import os
from models.email_models import SendWelcomeEmailRequest, EmailResponse
from auth import get_current_user, User
from services.email_service import email_service

router = APIRouter(prefix="/api", tags=["email"])
logger = logging.getLogger(__name__)


@router.post("/webhooks/user-signup", response_model=EmailResponse)
async def handle_user_signup_webhook(request: dict):
    logger.info(
        f"Received user signup webhook: {request.get('type')} on {request.get('table')}"
    )
    if request.get("type") != "INSERT" or request.get("table") != "users":
        return EmailResponse(success=False, message="Webhook ignored")
    if not email_service:
        return EmailResponse(
            success=False,
            message="Email service not configured",
            error="RESEND_API_KEY missing",
        )
    record = request.get("record", {})
    user_email = record.get("email")
    user_name = record.get("user_metadata", {}).get("full_name")
    if not user_email:
        return EmailResponse(
            success=False, message="No email in record", error="Missing email"
        )
    result = await email_service.send_welcome_email(user_email, user_name)
    return EmailResponse(**result)


@router.post("/send-welcome-email", response_model=EmailResponse)
async def send_welcome_email_manual(
    request: SendWelcomeEmailRequest, current_user: User = Depends(get_current_user)
):
    if not email_service:
        return EmailResponse(
            success=False,
            message="Email service not configured",
            error="RESEND_API_KEY missing",
        )
    result = await email_service.send_welcome_email(request.email, request.name)
    return EmailResponse(**result)


@router.get("/email/status")
async def get_email_service_status(current_user: User = Depends(get_current_user)):
    return {
        "email_service_available": email_service is not None,
        "resend_api_configured": os.getenv("RESEND_API_KEY") is not None,
        "from_domain": "onboarding@onboarding.trybayes.com",
    }
