import logging
from fastapi import APIRouter
from services.github_service import github_service
from models.github_models import CreateIssueRequest, CreateIssueResponse

router = APIRouter(prefix="/api/github", tags=["github"])
logger = logging.getLogger(__name__)


@router.post("/create-issue", response_model=CreateIssueResponse)
async def create_github_issue(request: CreateIssueRequest):
    try:
        logger.info(f"Creating GitHub issue: {request.title}")
        result = await github_service.create_issue(
            title=request.title, body=request.body, labels=request.labels
        )
        return CreateIssueResponse(
            success=result["success"],
            issue_number=result.get("issue_number"),
            html_url=result.get("html_url"),
            error_message=result.get("error_message"),
        )
    except Exception as e:
        logger.error(f"Unexpected error in create_github_issue: {e}")
        return CreateIssueResponse(
            success=False, error_message="An unexpected error occurred"
        )
