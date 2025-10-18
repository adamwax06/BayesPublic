"""
GitHub API service for creating issues and managing repository interactions.
"""

import httpx
import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class GitHubService:
    """Service for interacting with the GitHub API."""

    def __init__(self):
        self.token = os.getenv("GITHUB_TOKEN")
        self.base_url = "https://api.github.com"
        self.repo_owner = "TryBayes"
        self.repo_name = "bayes-frontend"

    async def create_issue(
        self, title: str, body: str, labels: Optional[list] = None
    ) -> Dict[str, Any]:
        """
        Create a new GitHub issue in the repository.

        Args:
            title: The issue title
            body: The issue body/description
            labels: List of labels to apply to the issue

        Returns:
            Dict containing success status and issue data or error message
        """
        if not self.token:
            logger.error("GitHub token not configured")
            return {
                "success": False,
                "error_message": "GitHub integration not configured",
            }

        if not title.strip() or not body.strip():
            return {"success": False, "error_message": "Title and body are required"}

        try:
            # First, verify repository access
            repo_check = await self._check_repository_access()
            if not repo_check["success"]:
                return repo_check

            # Create the issue
            return await self._create_issue_request(
                title, body, labels or ["bug", "user-reported"]
            )

        except Exception as e:
            logger.error(f"Unexpected error creating GitHub issue: {str(e)}")
            return {"success": False, "error_message": "An unexpected error occurred"}

    async def _check_repository_access(self) -> Dict[str, Any]:
        """Check if we can access the repository with the current token."""
        try:
            repo_url = f"{self.base_url}/repos/{self.repo_owner}/{self.repo_name}"

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    repo_url, headers=self._get_headers(), timeout=10.0
                )

            logger.info(f"Repository access check status: {response.status_code}")

            if response.status_code == 200:
                return {"success": True}
            elif response.status_code == 404:
                logger.error(
                    f"Repository not found: {self.repo_owner}/{self.repo_name}"
                )
                return {"success": False, "error_message": "Repository not found"}
            elif response.status_code == 401:
                logger.error("GitHub token is invalid or expired")
                return {"success": False, "error_message": "Invalid GitHub token"}
            else:
                logger.error(f"Cannot access repository: {response.text}")
                return {
                    "success": False,
                    "error_message": "Cannot access repository - check token permissions",
                }

        except httpx.TimeoutException:
            logger.error("Timeout while checking repository access")
            return {
                "success": False,
                "error_message": "Request timeout - please try again",
            }
        except Exception as e:
            logger.error(f"Error checking repository access: {str(e)}")
            return {
                "success": False,
                "error_message": "Error checking repository access",
            }

    async def _create_issue_request(
        self, title: str, body: str, labels: list
    ) -> Dict[str, Any]:
        """Make the actual request to create the GitHub issue."""
        try:
            issues_url = (
                f"{self.base_url}/repos/{self.repo_owner}/{self.repo_name}/issues"
            )

            payload = {"title": title, "body": body, "labels": labels}

            logger.info(f"Creating GitHub issue: {title}")
            logger.info(f"Request URL: {issues_url}")

            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.post(
                    issues_url, headers=self._get_headers(), json=payload, timeout=30.0
                )

            logger.info(f"GitHub API response status: {response.status_code}")

            if response.status_code == 201:
                issue_data = response.json()
                logger.info(
                    f"Successfully created GitHub issue #{issue_data['number']}"
                )

                return {
                    "success": True,
                    "issue_number": issue_data["number"],
                    "html_url": issue_data["html_url"],
                }
            else:
                # Handle error responses
                try:
                    error_data = response.json()
                    error_message = error_data.get(
                        "message", f"GitHub API returned status {response.status_code}"
                    )
                except (ValueError, KeyError, TypeError):
                    error_message = f"GitHub API returned status {response.status_code}"

                logger.error(f"GitHub API error: {error_message}")
                logger.error(f"Response body: {response.text}")

                return {"success": False, "error_message": error_message}

        except httpx.TimeoutException:
            logger.error("Timeout while creating GitHub issue")
            return {
                "success": False,
                "error_message": "Request timeout - please try again",
            }
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error from GitHub API: {e}")
            return {
                "success": False,
                "error_message": f"GitHub API error: {e.response.status_code}",
            }
        except Exception as e:
            logger.error(f"Error creating GitHub issue: {str(e)}")
            return {"success": False, "error_message": "Failed to create issue"}

    def _get_headers(self) -> Dict[str, str]:
        """Get the standard headers for GitHub API requests."""
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "Accept": "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }


# Global instance
github_service = GitHubService()
