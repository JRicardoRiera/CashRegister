from fastapi import APIRouter, Depends
from app.auth import get_current_user, get_current_profile

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.get("/me")
async def read_current_user(
    user=Depends(get_current_user),
    profile=Depends(get_current_profile),
):
    return {
        "id": user.id,
        "email": user.email,
        "profile": profile,
    }
