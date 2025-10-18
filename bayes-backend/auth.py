from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
import logging
from datetime import datetime, timezone, timedelta

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Service role client for admin operations
service_supabase = None
if SUPABASE_SERVICE_ROLE_KEY:
    service_supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Security scheme
security = HTTPBearer()


# User model
class User(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


# Authentication dependency
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """
    Get the current authenticated user from the JWT token.
    """
    try:
        # Verify the JWT token with Supabase
        auth_response = supabase.auth.get_user(credentials.credentials)

        if not auth_response.user:
            raise HTTPException(
                status_code=401, detail="Invalid authentication credentials"
            )

        user_data = auth_response.user

        # Get user profile from database
        profile_response = (
            supabase.table("user_profiles").select("*").eq("id", user_data.id).execute()
        )

        if profile_response.data:
            profile = profile_response.data[0]
            return User(
                id=user_data.id,
                email=user_data.email or profile.get("email", ""),
                full_name=profile.get("full_name"),
                avatar_url=profile.get("avatar_url"),
            )
        else:
            # Return basic user info if no profile found
            return User(
                id=user_data.id,
                email=user_data.email or "",
                full_name=user_data.user_metadata.get("full_name"),
                avatar_url=user_data.user_metadata.get("avatar_url"),
            )

    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=401, detail="Invalid authentication credentials"
        )


# Optional authentication dependency (for endpoints that work with or without auth)
async def get_current_user_optional(request: Request) -> Optional[User]:
    """
    Get the current authenticated user, but don't fail if not authenticated.
    """
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ")[1]
        auth_response = supabase.auth.get_user(token)

        if not auth_response.user:
            return None

        user_data = auth_response.user
        profile_response = (
            supabase.table("user_profiles").select("*").eq("id", user_data.id).execute()
        )

        if profile_response.data:
            profile = profile_response.data[0]
            return User(
                id=user_data.id,
                email=user_data.email or profile.get("email", ""),
                full_name=profile.get("full_name"),
                avatar_url=profile.get("avatar_url"),
            )
        else:
            return User(
                id=user_data.id,
                email=user_data.email or "",
                full_name=user_data.user_metadata.get("full_name"),
                avatar_url=user_data.user_metadata.get("avatar_url"),
            )

    except Exception as e:
        logger.debug(f"Optional authentication failed: {str(e)}")
        return None


# User profile operations
async def get_user_profile(user_id: str) -> Optional[dict]:
    """Get user profile by ID"""
    try:
        response = (
            supabase.table("user_profiles").select("*").eq("id", user_id).execute()
        )
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error getting user profile: {str(e)}")
        return None


async def update_user_profile(user_id: str, updates: dict) -> bool:
    """Update user profile"""
    try:
        response = (
            supabase.table("user_profiles").update(updates).eq("id", user_id).execute()
        )
        return len(response.data) > 0
    except Exception as e:
        logger.error(f"Error updating user profile: {str(e)}")
        return False


# Subscription management functions
async def get_or_create_subscription(user_id: str) -> dict:
    """Get or create a subscription record for a user with timezone-aware datetime handling"""
    if not service_supabase:
        logger.error("Service role key not configured")
        return {
            "plan": "free",
            "status": "active",
            "max_prompts_per_week": 10,
            "prompts_used_this_week": 0,
        }

    try:
        # Get existing subscription
        response = (
            service_supabase.table("subscriptions")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )

        if response.data and len(response.data) > 0:
            subscription = response.data[0]

            # Check if we need to reset weekly usage
            if subscription.get("week_start_date"):
                try:
                    # Parse the stored date string, ensuring timezone awareness
                    week_start_str = subscription["week_start_date"]
                    if week_start_str.endswith("Z"):
                        # Convert Z to +00:00 for proper parsing
                        week_start_str = week_start_str[:-1] + "+00:00"
                    elif "+" not in week_start_str and week_start_str.count(":") == 2:
                        # Add UTC timezone if none specified
                        week_start_str += "+00:00"

                    week_start = datetime.fromisoformat(week_start_str)
                    if not week_start.tzinfo:
                        week_start = week_start.replace(tzinfo=timezone.utc)

                    now = datetime.now(timezone.utc)

                    # Reset if a week has passed
                    if now - week_start >= timedelta(weeks=1):
                        subscription["prompts_used_this_week"] = 0
                        subscription["week_start_date"] = now.isoformat()

                        # Update in database
                        service_supabase.table("subscriptions").update(
                            {
                                "prompts_used_this_week": 0,
                                "week_start_date": now.isoformat(),
                            }
                        ).eq("user_id", user_id).execute()

                except (ValueError, TypeError) as e:
                    logger.warning(
                        f"Error parsing week_start_date for user {user_id}: {e}"
                    )
                    # Reset to current time if parsing fails
                    now = datetime.now(timezone.utc)
                    subscription["week_start_date"] = now.isoformat()
                    subscription["prompts_used_this_week"] = 0

                    service_supabase.table("subscriptions").update(
                        {
                            "prompts_used_this_week": 0,
                            "week_start_date": now.isoformat(),
                        }
                    ).eq("user_id", user_id).execute()

            return subscription
        else:
            # Create new subscription record
            now = datetime.now(timezone.utc)
            new_subscription = {
                "user_id": user_id,
                "plan": "free",
                "status": "active",
                "max_prompts_per_week": 10,
                "prompts_used_this_week": 0,
                "week_start_date": now.isoformat(),
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }

            result = (
                service_supabase.table("subscriptions")
                .insert(new_subscription)
                .execute()
            )

            if result.data:
                return result.data[0]
            else:
                logger.error(f"Failed to create subscription for user {user_id}")
                return new_subscription

    except Exception as e:
        logger.error(
            f"Error getting/creating subscription for user {user_id}: {str(e)}"
        )
        # Return default subscription on error
        return {
            "plan": "free",
            "status": "active",
            "max_prompts_per_week": 10,
            "prompts_used_this_week": 0,
        }


async def check_usage_limit(user_id: str) -> dict:
    """Check if user has reached their weekly usage limit"""
    try:
        subscription = await get_or_create_subscription(user_id)

        max_prompts = subscription.get("max_prompts_per_week", 10)
        used_prompts = subscription.get("prompts_used_this_week", 0)

        return {
            "can_use": used_prompts < max_prompts,
            "max_prompts": max_prompts,
            "used_prompts": used_prompts,
            "remaining_prompts": max_prompts - used_prompts,
            "plan": subscription.get("plan", "free"),
        }
    except Exception as e:
        logger.error(f"Error checking usage limit for user {user_id}: {str(e)}")
        return {
            "can_use": True,
            "max_prompts": 10,
            "used_prompts": 0,
            "remaining_prompts": 10,
            "plan": "free",
        }


async def increment_usage(user_id: str) -> bool:
    """Increment the user's weekly usage count"""
    if not service_supabase:
        logger.error("Service role key not configured")
        return False

    try:
        subscription = await get_or_create_subscription(user_id)

        new_count = subscription.get("prompts_used_this_week", 0) + 1
        now = datetime.now(timezone.utc)

        result = (
            service_supabase.table("subscriptions")
            .update(
                {"prompts_used_this_week": new_count, "updated_at": now.isoformat()}
            )
            .eq("user_id", user_id)
            .execute()
        )

        return len(result.data) > 0
    except Exception as e:
        logger.error(f"Error incrementing usage for user {user_id}: {str(e)}")
        return False
