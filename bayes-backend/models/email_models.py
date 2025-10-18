from pydantic import BaseModel
from typing import Optional


class SendWelcomeEmailRequest(BaseModel):
    email: str
    name: Optional[str] = None


class EmailResponse(BaseModel):
    success: bool
    message: str
    email_id: Optional[str] = None
    error: Optional[str] = None
