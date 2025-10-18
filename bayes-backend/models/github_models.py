from pydantic import BaseModel
from typing import List, Optional


class CreateIssueRequest(BaseModel):
    title: str
    body: str
    labels: Optional[List[str]] = ["bug", "user-reported"]


class CreateIssueResponse(BaseModel):
    success: bool
    issue_number: Optional[int] = None
    html_url: Optional[str] = None
    error_message: Optional[str] = None
