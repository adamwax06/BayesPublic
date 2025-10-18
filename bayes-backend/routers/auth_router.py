from fastapi import APIRouter, Depends, HTTPException
import logging
from auth import (
    get_current_user,
    update_user_profile,
    get_user_profile,
    User,
)
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    profile = await get_user_profile(current_user.id)
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "avatar_url": current_user.avatar_url,
        "profile": profile,
    }


@router.put("/profile")
async def update_profile(
    updates: ProfileUpdateRequest, current_user: User = Depends(get_current_user)
):
    data = {}
    if updates.full_name is not None:
        data["full_name"] = updates.full_name
    if updates.avatar_url is not None:
        data["avatar_url"] = updates.avatar_url
    success = await update_user_profile(current_user.id, data)
    if success:
        return {"message": "Profile updated successfully"}
    raise HTTPException(status_code=500, detail="Failed to update profile")


@router.get("/protected")
async def protected_endpoint(current_user: User = Depends(get_current_user)):
    return {
        "message": f"Hello {current_user.full_name or current_user.email}!",
        "user": current_user,
    }
