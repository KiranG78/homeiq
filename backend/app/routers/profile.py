from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services.profile_service import ProfileService

router = APIRouter()

@router.get("/", response_model=UserResponse)
async def get_profile(db: AsyncSession = Depends(get_db)):
    service = ProfileService(db)
    user = await service.get_profile(user_id=1) # Hardcoded for Phase 1
    if not user:
        from sqlalchemy.future import select
        from app.models.user import User
        result = await db.execute(select(User))
        user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Profile not found")
    return user

@router.post("/", response_model=UserResponse, status_code=201)
async def create_profile(data: UserCreate, db: AsyncSession = Depends(get_db)):
    service = ProfileService(db)
    return await service.create_profile(data)

@router.put("/", response_model=UserResponse)
async def update_profile(data: UserUpdate, db: AsyncSession = Depends(get_db)):
    service = ProfileService(db)
    # First get the user to update
    user = await service.get_profile(user_id=1)
    if not user:
        from sqlalchemy.future import select
        from app.models.user import User
        result = await db.execute(select(User))
        user = result.scalars().first()
        
    if not user:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    updated_user = await service.update_profile(user_id=user.id, data=data)
    return updated_user
